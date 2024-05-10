import ast
import http
from io import BytesIO
from typing import NamedTuple

import requests
from fastapi import FastAPI, UploadFile, status, HTTPException
import json
import base64
import cv2
import numpy as np
import asyncio
import httpx
from dataclasses import dataclass, asdict
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import StreamingResponse

SEARXNG_API_URL = "http://anson-eq.local:8081/"
WIKI_API_URL = "https://api.wikimedia.org/core/v1/wikipedia/en/search/page"
PD_OCR_API_URL = "http://anson-eq.local:9998/ocr/prediction"
ALLOWED_ORIGINS = ["http://localhost", "http://localhost:8080", "http://localhost:5173"]
TIMEOUT = 10

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)


@dataclass
class BoundingBox:
    """Bounding box for detected text in image in percentage"""

    x: float
    y: float
    w: float
    h: float


class Dimensions(NamedTuple):
    """Image dimensions"""

    width: int
    height: int


@app.get("/")
def root():
    return status.HTTP_200_OK


class OCRError(Exception):
    pass


class DishSearchError(Exception):
    pass


def get_ocr_result(file_content: bytes):
    """
    Post uploaded image file content to pdOCR server and return img dimension and OCR results in json format
    return: (img_height, img_width), ocr_results
    """
    image = base64.b64encode(file_content).decode("utf8")
    nparr = np.frombuffer(file_content, np.uint8)
    img_height, img_width = cv2.imdecode(nparr, cv2.IMREAD_COLOR).shape[:2]
    data = {"key": ["image"], "value": [image]}
    response = requests.post(url=PD_OCR_API_URL, data=json.dumps(data), timeout=TIMEOUT)
    response.raise_for_status()
    result = response.json()

    if result["err_no"] != 0:
        raise OCRError("Failed to get OCR results")

    ocr_results_str = result["value"][0]
    ocr_results = ast.literal_eval(ocr_results_str)
    if not isinstance(ocr_results, list) or not ocr_results:
        raise OCRError("OCR results is not a list")
    return Dimensions(img_width, img_height), ocr_results


async def search_dishes_info(ocr_results: list):
    tasks = []

    for item in ocr_results:
        dish_name, _ = item[0]
        tasks.append(search_dish_info_via_wiki(dish_name))

    search_results = await asyncio.gather(*tasks)
    return search_results


def normalize_text_bbox(img_dimension: Dimensions, ocr_results: list):
    texts_bboxes = []
    for item in ocr_results:
        bounding_boxes = item[1]
        texts_bboxes.append(
            asdict(normalize_bounding_box(img_dimension, bounding_boxes))
        )
    return texts_bboxes


def aggregate_dishes_info_and_bbox(dish_infos: list, dishes_bboxes: list):
    results = []
    for dish_info, dish_bbox in zip(dish_infos, dishes_bboxes, strict=True):
        dish = {
            "info": dish_info,
            "boundingBox": dish_bbox,
        }
        results.append(dish)
    return results


def normalize_bounding_box(
        image_dimension: Dimensions, bounding_box: list
) -> BoundingBox:
    """
    Calculate the bounding box of the detected text in image percentage
    """
    x_min = min([x[0] for x in bounding_box])
    x_max = max([x[0] for x in bounding_box])
    y_min = min([x[1] for x in bounding_box])
    y_max = max([x[1] for x in bounding_box])

    x_percentage = 100 * x_min / image_dimension.width
    y_percentage = 100 * y_min / image_dimension.height
    w_percentage = 100 * (x_max - x_min) / image_dimension.width
    h_percentage = 100 * (y_max - y_min) / image_dimension.height

    return BoundingBox(x=x_percentage, y=y_percentage, w=w_percentage, h=h_percentage)


def search_dish_info_via_searxng(dish_name: str) -> dict:
    """
    Search a dish via Searxng on Wikipedia and return the description and image of the dish
        if found in the save search results
    """
    query = {"q": f"site:wikipedia.org {dish_name}", "format": "json"}
    response = requests.get(url=SEARXNG_API_URL, params=query, timeout=TIMEOUT)
    response.raise_for_status()
    search_results = response.json()
    if "results" not in search_results or len(search_results["results"]) == 0:
        return {"description": None, "image": None, "text": None}
    for item in search_results["results"]:
        # todo: put into pydantic model to serialize
        if (
                "content" in item
                and item["content"] != ""
                and "img_src" in item
                and item["img_src"] != ""
        ):
            return {
                "description": item["content"],
                "image": item["img_src"],
                "text": item["title"],
            }
    return {"description": None, "image": None, "text": None}


async def search_dish_info_via_wiki(dish_name: str) -> dict:
    """
    Search a dish via Searching on Wikipedia and return the description and image of the dish
    if found in the save search results
    """
    query = {"q": dish_name, "format": "json", "limit": "3"}

    async with httpx.AsyncClient() as client:
        response = await client.get(WIKI_API_URL, params=query, timeout=TIMEOUT)
    response.raise_for_status()
    search_results = response.json()
    if "pages" not in search_results or len(search_results["pages"]) == 0:
        return {"description": None, "image": None, "text": None}
    for item in search_results["pages"]:
        if (
                "title" in item
                and item["title"] != ""
                and "thumbnail" in item
                and item["thumbnail"] is not None
        ):
            dish_info = {
                "description": item["description"],
                "imgSrc": "https:" + item["thumbnail"]["url"],
                "text": item["title"],
            }
            return dish_info
    return {"description": None, "image": None, "text": None}


@app.post("/upload")
async def upload(file: UploadFile):
    """
    pipeline from image to results:
    1. get OCR results
    2. search dish info
    3. calculate bounding box in percentage
    4. aggregate results
    """

    if not file or not file.filename:
        raise HTTPException(
            status_code=http.HTTPStatus.NO_CONTENT.value, detail="No file uploaded"
        )

    img_dimension, ocr_results = get_ocr_result(file.file.read())
    dishes_info = await search_dishes_info(ocr_results)
    texts_bboxes = normalize_text_bbox(img_dimension, ocr_results)
    return {"results": aggregate_dishes_info_and_bbox(dishes_info, texts_bboxes)}


@app.post("/test")
async def test_upload(file: UploadFile):
    """
    pipeline from image to results:
    1. get OCR results
    2. search dish info
    3. calculate bounding box in percentage
    4. aggregate results
    """

    if not file or not file.filename:
        raise HTTPException(
            status_code=http.HTTPStatus.NO_CONTENT.value, detail="No file uploaded"
        )
    return {
        "results": [
            {
                "info": {
                    "description": "Italian fashion house",
                    "imgSrc": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Dolce_%26_Gabbana_Store_%2851396804775%29.jpg/60px-Dolce_%26_Gabbana_Store_%2851396804775%29.jpg",
                    "text": "Dolce & Gabbana"
                },
                "boundingBox": {
                    "x": 28.108465608465607,
                    "y": 7.614087301587301,
                    "w": 44.80820105820106,
                    "h": 4.092261904761905
                }
            },
            {
                "info": {
                    "description": "Restaurant that sells pizza",
                    "imgSrc": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Old_Pizzeria_-_Napoli.jpg/60px-Old_Pizzeria_-_Napoli.jpg",
                    "text": "Pizzeria"
                },
                "boundingBox": {
                    "x": 37.73148148148148,
                    "y": 12.5,
                    "w": 25.52910052910053,
                    "h": 2.7281746031746033
                }
            },
            {
                "info": {
                    "description": "Country in Southern Europe",
                    "imgSrc": "https://upload.wikimedia.org/wikipedia/en/thumb/0/03/Flag_of_Italy.svg/60px-Flag_of_Italy.svg.png",
                    "text": "Italy"
                },
                "boundingBox": {
                    "x": 38.78968253968254,
                    "y": 17.956349206349206,
                    "w": 23.048941798941797,
                    "h": 2.4305555555555554
                }
            },
            {
                "info": {
                    "description": None,
                    "image": None,
                    "text": None
                },
                "boundingBox": {
                    "x": 22.784391534391535,
                    "y": 20.213293650793652,
                    "w": 55.05952380952381,
                    "h": 3.125
                }
            },
            {
                "info": {
                    "description": None,
                    "image": None,
                    "text": None
                },
                "boundingBox": {
                    "x": 27.843915343915345,
                    "y": 23.908730158730158,
                    "w": 44.54365079365079,
                    "h": 2.554563492063492
                }
            },
            {
                "info": {
                    "description": "Culinary traditions of Israel",
                    "imgSrc": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/The_7_Breakfasts_-_Caf%C3%A9_Caf%C3%A9.jpg/60px-The_7_Breakfasts_-_Caf%C3%A9_Caf%C3%A9.jpg",
                    "text": "Israeli cuisine"
                },
                "boundingBox": {
                    "x": 23.677248677248677,
                    "y": 26.3640873015873,
                    "w": 52.74470899470899,
                    "h": 2.8273809523809526
                }
            },
            {
                "info": {
                    "description": None,
                    "image": None,
                    "text": None
                },
                "boundingBox": {
                    "x": 42.294973544973544,
                    "y": 30.357142857142858,
                    "w": 15.773809523809524,
                    "h": 1.9593253968253967
                }
            },
            {
                "info": {
                    "description": "Italian ice cream",
                    "imgSrc": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/CafeMia.jpg/60px-CafeMia.jpg",
                    "text": "Gelato"
                },
                "boundingBox": {
                    "x": 37.863756613756614,
                    "y": 32.71329365079365,
                    "w": 24.735449735449734,
                    "h": 2.5297619047619047
                }
            },
            {
                "info": {
                    "description": None,
                    "image": None,
                    "text": None
                },
                "boundingBox": {
                    "x": 30.72089947089947,
                    "y": 36.30952380952381,
                    "w": 38.26058201058201,
                    "h": 2.3561507936507935
                }
            },
            {
                "info": {
                    "description": None,
                    "imgSrc": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/NCI_Visuals_Food_Pie.jpg/60px-NCI_Visuals_Food_Pie.jpg",
                    "text": "List of lemon dishes and drinks"
                },
                "boundingBox": {
                    "x": 36.97089947089947,
                    "y": 38.96329365079365,
                    "w": 25.76058201058201,
                    "h": 2.0337301587301586
                }
            },
            {
                "info": {
                    "description": "Frozen dessert typically composed of ice cream between two biscuits",
                    "imgSrc": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/IceCreamSandwich.jpg/60px-IceCreamSandwich.jpg",
                    "text": "Ice cream sandwich"
                },
                "boundingBox": {
                    "x": 35.152116402116405,
                    "y": 46.77579365079365,
                    "w": 29.166666666666668,
                    "h": 2.3313492063492065
                }
            },
            {
                "info": {
                    "description": "Pie topped with meringue",
                    "imgSrc": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Theres_always_room_for_pie_%287859650026%29.jpg/60px-Theres_always_room_for_pie_%287859650026%29.jpg",
                    "text": "Lemon meringue pie"
                },
                "boundingBox": {
                    "x": 37.36772486772487,
                    "y": 50.86805555555556,
                    "w": 24.33862433862434,
                    "h": 1.9593253968253967
                }
            },
            {
                "info": {
                    "description": None,
                    "imgSrc": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Bunnings_Sausage_sizzle.jpg/60px-Bunnings_Sausage_sizzle.jpg",
                    "text": "List of Australian and New Zealand dishes"
                },
                "boundingBox": {
                    "x": 29.166666666666668,
                    "y": 53.19940476190476,
                    "w": 40.74074074074074,
                    "h": 2.3561507936507935
                }
            },
            {
                "info": {
                    "description": "Pie topped with meringue",
                    "imgSrc": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Theres_always_room_for_pie_%287859650026%29.jpg/60px-Theres_always_room_for_pie_%287859650026%29.jpg",
                    "text": "Lemon meringue pie"
                },
                "boundingBox": {
                    "x": 37.5,
                    "y": 55.55555555555556,
                    "w": 24.206349206349206,
                    "h": 2.058531746031746
                }
            },
            {
                "info": {
                    "description": "Water soluble food coloring",
                    "imgSrc": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Caramel_Color_in_cola.jpg/60px-Caramel_Color_in_cola.jpg",
                    "text": "Caramel color"
                },
                "boundingBox": {
                    "x": 30.72089947089947,
                    "y": 59.07738095238095,
                    "w": 37.235449735449734,
                    "h": 2.132936507936508
                }
            },
            {
                "info": {
                    "description": None,
                    "imgSrc": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Bunnings_Sausage_sizzle.jpg/60px-Bunnings_Sausage_sizzle.jpg",
                    "text": "List of Australian and New Zealand dishes"
                },
                "boundingBox": {
                    "x": 31.25,
                    "y": 61.607142857142854,
                    "w": 36.17724867724868,
                    "h": 2.058531746031746
                }
            },
            {
                "info": {
                    "description": "Ice cream company",
                    "imgSrc": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Anita_Gelato_official_logo.jpg/60px-Anita_Gelato_official_logo.jpg",
                    "text": "Anita Gelato"
                },
                "boundingBox": {
                    "x": 37.99603174603175,
                    "y": 63.864087301587304,
                    "w": 22.51984126984127,
                    "h": 2.0337301587301586
                }
            },
            {
                "info": {
                    "description": "Listing of liqueurs, alcoholic drinks made by adding extra sugar and flavorings",
                    "imgSrc": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/ManyAmari.jpg/60px-ManyAmari.jpg",
                    "text": "List of liqueur brands"
                },
                "boundingBox": {
                    "x": 33.06878306878307,
                    "y": 67.26190476190476,
                    "w": 32.01058201058201,
                    "h": 2.455357142857143
                }
            },
            {
                "info": {
                    "description": None,
                    "imgSrc": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Bunnings_Sausage_sizzle.jpg/60px-Bunnings_Sausage_sizzle.jpg",
                    "text": "List of Australian and New Zealand dishes"
                },
                "boundingBox": {
                    "x": 22.123015873015873,
                    "y": 69.61805555555556,
                    "w": 53.76984126984127,
                    "h": 2.628968253968254
                }
            },
            {
                "info": {
                    "description": "Cocktail from UK",
                    "imgSrc": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Hanky_Panky_cocktail.jpg/60px-Hanky_Panky_cocktail.jpg",
                    "text": "Hanky panky (cocktail)"
                },
                "boundingBox": {
                    "x": 28.902116402116402,
                    "y": 78.02579365079364,
                    "w": 16.666666666666668,
                    "h": 2.132936507936508
                }
            },
            {
                "info": {
                    "description": "Brewed beverage made from coffee beans",
                    "imgSrc": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Latte_and_dark_coffee.jpg/60px-Latte_and_dark_coffee.jpg",
                    "text": "Coffee"
                },
                "boundingBox": {
                    "x": 62.1031746031746,
                    "y": 81.25,
                    "w": 11.30952380952381,
                    "h": 1.7361111111111112
                }
            },
            {
                "info": {
                    "description": None,
                    "image": None,
                    "text": None
                },
                "boundingBox": {
                    "x": 25.23148148148148,
                    "y": 82.0188492063492,
                    "w": 23.57804232804233,
                    "h": 1.8601190476190477
                }
            },
            {
                "info": {
                    "description": None,
                    "image": None,
                    "text": None
                },
                "boundingBox": {
                    "x": 20.701058201058203,
                    "y": 84.54861111111111,
                    "w": 32.93650793650794,
                    "h": 1.9593253968253967
                }
            },
            {
                "info": {
                    "description": "Type of strong coffee",
                    "imgSrc": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tazzina_di_caff%C3%A8_a_Ventimiglia.jpg/60px-Tazzina_di_caff%C3%A8_a_Ventimiglia.jpg",
                    "text": "Espresso"
                },
                "boundingBox": {
                    "x": 59.09391534391534,
                    "y": 84.84623015873017,
                    "w": 16.93121693121693,
                    "h": 1.8601190476190477
                }
            },
            {
                "info": {
                    "description": None,
                    "image": None,
                    "text": None
                },
                "boundingBox": {
                    "x": 22.652116402116402,
                    "y": 87.20238095238095,
                    "w": 28.902116402116402,
                    "h": 1.9345238095238095
                }
            },
            {
                "info": {
                    "description": "Espresso coffee drink with a small amount of milk",
                    "imgSrc": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Caff%C3%A8_Espresso_Macchiato_Schiumato.jpg/60px-Caff%C3%A8_Espresso_Macchiato_Schiumato.jpg",
                    "text": "Caffè macchiato"
                },
                "boundingBox": {
                    "x": 58.06878306878307,
                    "y": 87.5,
                    "w": 18.617724867724867,
                    "h": 1.7361111111111112
                }
            },
            {
                "info": {
                    "description": None,
                    "image": None,
                    "text": None
                },
                "boundingBox": {
                    "x": 25.099206349206348,
                    "y": 89.73214285714286,
                    "w": 23.84259259259259,
                    "h": 1.8601190476190477
                }
            }
        ]
    }


@app.get("/get_dish_info")
async def dish_info_pipeline(dish: str):
    """
    for Swift App usage
    return a dish info from wikipedia search
    results contains description, image(url), and text
    """
    dish_info = await search_dish_info_via_wiki(dish)

    return {"results": dish_info, "message": "OK"}


@app.post("/draw")
async def draw(file: UploadFile):
    f = file.file.read()
    img_dimension, ocr_results = get_ocr_result(f)
    texts_bboxes = normalize_text_bbox(img_dimension, ocr_results)
    image_array = np.frombuffer(f, np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)  # Draw bounding boxes on the image
    for bbox in texts_bboxes:
        x = int(bbox['x'] * img_dimension.width / 100)
        y = int(bbox['y'] * img_dimension.height / 100)
        w = int(bbox['w'] * img_dimension.width / 100)
        h = int(bbox['h'] * img_dimension.height / 100)
        # Draw rectangle on image
        cv2.rectangle(image, (x, y), (x + w, y + h), (0, 255, 0), 3)  # Color green

    # Encode the image to be able to return it in HTTP response
    _, buffered = cv2.imencode('.jpg', image)
    io_buf = BytesIO(buffered)

    return StreamingResponse(io_buf, media_type="image/jpeg")
