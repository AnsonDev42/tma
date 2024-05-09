import ast
import http
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

app = FastAPI()
SEARXNG_API_URL = "http://anson-eq.local:8081/"
WIKI_API_URL = "https://api.wikimedia.org/core/v1/wikipedia/en/search/page"
PD_OCR_API_URL = "http://anson-eq.local:9998/ocr/prediction"
ALLOWED_ORIGINS = ["http://localhost", "http://localhost:8080", "http://localhost:5173"]
TIMEOUT = 10

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
        texts_bboxes.append(asdict(normalize_bounding_box(img_dimension, bounding_boxes)))
    return texts_bboxes


def aggregate_dishes_info_and_bbox(dish_infos: list, dishes_bboxes: list):
    for dish_info, dish_bbox in zip(dish_infos, dishes_bboxes, strict=True):
        dish_info["bounding_box"] = dish_bbox
    return dish_infos


def normalize_bounding_box(image_dimension: Dimensions, bounding_box: list) -> BoundingBox:
    """
    Calculate the bounding box of the detected text in image percentage
    """
    x_min = min([x[0] for x in bounding_box])
    x_max = max([x[0] for x in bounding_box])
    y_min = min([x[1] for x in bounding_box])
    y_max = max([x[1] for x in bounding_box])

    x_percentage = x_min / image_dimension.width
    y_percentage = y_min / image_dimension.height
    w_percentage = (x_max - x_min) / image_dimension.width
    h_percentage = (y_max - y_min) / image_dimension.height

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
                "imageSrc": "https:" + item["thumbnail"]["url"],
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
    img_hw, ocr_results = get_ocr_result(file.file.read())
    dishes_info = await search_dishes_info(ocr_results)
    texts_bboxes = normalize_text_bbox(img_hw, ocr_results)
    return aggregate_dishes_info_and_bbox(dishes_info, texts_bboxes)

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
    return {"results": [
        {
            "info": {
                "description": "Italian fashion house",
                "imageSrc": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Dolce_%26_Gabbana_Store_%2851396804775%29.jpg/60px-Dolce_%26_Gabbana_Store_%2851396804775%29.jpg",
                "text": "Dolce & Gabbana"
            },
            "boundingBox": {
                "x": 21.081349206349206,
                "y": 10.152116402116402,
                "w": 33.60615079365079,
                "h": 5.4563492063492065
            }
        },
        {
            "info": {
                "description": "Restaurant that sells pizza",
                "imageSrc": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Old_Pizzeria_-_Napoli.jpg/60px-Old_Pizzeria_-_Napoli.jpg",
                "text": "Pizzeria"
            },
            "boundingBox": {
                "x": 28.29861111111111,
                "y": 16.666666666666668,
                "w": 19.146825396825395,
                "h": 3.6375661375661377
            }
        },
        {
            "info": {
                "description": "Country in Southern Europe",
                "imageSrc": "https://upload.wikimedia.org/wikipedia/en/thumb/0/03/Flag_of_Italy.svg/60px-Flag_of_Italy.svg.png",
                "text": "Italy"
            },
            "boundingBox": {
                "x": 29.092261904761905,
                "y": 23.941798941798943,
                "w": 17.286706349206348,
                "h": 3.240740740740741
            }
        },
        {
            "info": {
                "description": None,
                "image": None,
                "text": None
            },
            "boundingBox": {
                "x": 17.088293650793652,
                "y": 26.951058201058203,
                "w": 41.294642857142854,
                "h": 4.166666666666667
            }
        },
        {
            "info": {
                "description": None,
                "image": None,
                "text": None
            },
            "boundingBox": {
                "x": 20.88293650793651,
                "y": 31.87830687830688,
                "w": 33.407738095238095,
                "h": 3.4060846560846563
            }
        },
        {
            "info": {
                "description": "Culinary traditions of Israel",
                "imageSrc": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/The_7_Breakfasts_-_Caf%C3%A9_Caf%C3%A9.jpg/60px-The_7_Breakfasts_-_Caf%C3%A9_Caf%C3%A9.jpg",
                "text": "Israeli cuisine"
            },
            "boundingBox": {
                "x": 17.75793650793651,
                "y": 35.152116402116405,
                "w": 39.55853174603175,
                "h": 3.7698412698412698
            }
        },
        {
            "info": {
                "description": None,
                "image": None,
                "text": None
            },
            "boundingBox": {
                "x": 31.721230158730158,
                "y": 40.476190476190474,
                "w": 11.830357142857142,
                "h": 2.6124338624338623
            }
        },
        {
            "info": {
                "description": "Italian ice cream",
                "imageSrc": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/CafeMia.jpg/60px-CafeMia.jpg",
                "text": "Gelato"
            },
            "boundingBox": {
                "x": 28.39781746031746,
                "y": 43.61772486772487,
                "w": 18.5515873015873,
                "h": 3.373015873015873
            }
        },
        {
            "info": {
                "description": None,
                "image": None,
                "text": None
            },
            "boundingBox": {
                "x": 23.040674603174605,
                "y": 48.41269841269841,
                "w": 28.69543650793651,
                "h": 3.1415343915343916
            }
        },
        {
            "info": {
                "description": None,
                "imageSrc": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/NCI_Visuals_Food_Pie.jpg/60px-NCI_Visuals_Food_Pie.jpg",
                "text": "List of lemon dishes and drinks"
            },
            "boundingBox": {
                "x": 27.728174603174605,
                "y": 51.9510582010582,
                "w": 19.32043650793651,
                "h": 2.7116402116402116
            }
        },
        {
            "info": {
                "description": "Frozen dessert typically composed of ice cream between two biscuits",
                "imageSrc": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/IceCreamSandwich.jpg/60px-IceCreamSandwich.jpg",
                "text": "Ice cream sandwich"
            },
            "boundingBox": {
                "x": 26.3640873015873,
                "y": 62.36772486772487,
                "w": 21.875,
                "h": 3.1084656084656084
            }
        },
        {
            "info": {
                "description": "Pie topped with meringue",
                "imageSrc": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Theres_always_room_for_pie_%287859650026%29.jpg/60px-Theres_always_room_for_pie_%287859650026%29.jpg",
                "text": "Lemon meringue pie"
            },
            "boundingBox": {
                "x": 28.025793650793652,
                "y": 67.82407407407408,
                "w": 18.253968253968253,
                "h": 2.6124338624338623
            }
        },
        {
            "info": {
                "description": None,
                "imageSrc": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Bunnings_Sausage_sizzle.jpg/60px-Bunnings_Sausage_sizzle.jpg",
                "text": "List of Australian and New Zealand dishes"
            },
            "boundingBox": {
                "x": 21.875,
                "y": 70.93253968253968,
                "w": 30.555555555555557,
                "h": 3.1415343915343916
            }
        },
        {
            "info": {
                "description": "Pie topped with meringue",
                "imageSrc": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Theres_always_room_for_pie_%287859650026%29.jpg/60px-Theres_always_room_for_pie_%287859650026%29.jpg",
                "text": "Lemon meringue pie"
            },
            "boundingBox": {
                "x": 28.125,
                "y": 74.07407407407408,
                "w": 18.154761904761905,
                "h": 2.744708994708995
            }
        },
        {
            "info": {
                "description": "Water soluble food coloring",
                "imageSrc": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Caramel_Color_in_cola.jpg/60px-Caramel_Color_in_cola.jpg",
                "text": "Caramel color"
            },
            "boundingBox": {
                "x": 23.040674603174605,
                "y": 78.76984126984127,
                "w": 27.9265873015873,
                "h": 2.8439153439153437
            }
        },
        {
            "info": {
                "description": None,
                "imageSrc": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Bunnings_Sausage_sizzle.jpg/60px-Bunnings_Sausage_sizzle.jpg",
                "text": "List of Australian and New Zealand dishes"
            },
            "boundingBox": {
                "x": 23.4375,
                "y": 82.14285714285714,
                "w": 27.13293650793651,
                "h": 2.744708994708995
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
