import ast
import base64
from typing import Any

import cv2
import numpy as np
import requests
import ujson

from src.core.vendor import PD_OCR_API_URL
from src.services.exceptions import OCRError
from src.services.utils import duration

MAX_IMAGE_WIDTH = 550
TIMEOUT = 60


@duration
def compress_image(img_nparr: np.ndarray) -> tuple[str, int, int]:
    img = cv2.imdecode(img_nparr, cv2.IMREAD_COLOR)
    img_height, img_width, _ = img.shape

    if img_width > MAX_IMAGE_WIDTH:
        scale_ratio = MAX_IMAGE_WIDTH / img_width

        img_width = int(img_width * scale_ratio)
        img_height = int(img_height * scale_ratio)

        img = cv2.resize(img, (img_width, img_height), interpolation=cv2.INTER_AREA)

    # encode and compress image
    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 30]  # compression level (100: no compression)
    _, encimg = cv2.imencode('.jpeg', img, encode_param)
    image = base64.b64encode(encimg).decode("utf8")
    return image, img_height, img_width


@duration
def run_ocr(file_content: bytes) -> tuple[int, int, Any]:
    """
    Post uploaded image file content to pdOCR server and return img dimension and OCR results in json format
    return: (img_height, img_width), ocr_results
    """
    # convert image from bytes and compress image
    img_nparr = np.frombuffer(file_content, np.uint8)
    image, img_height, img_width = compress_image(img_nparr)

    data = {"key": ["image"], "value": [image]}
    response = requests.post(url=PD_OCR_API_URL, data=ujson.dumps(data), timeout=TIMEOUT)
    response.raise_for_status()
    result = response.json()

    if result["err_no"]:
        raise OCRError("Failed to get OCR results")

    ocr_results_str = result["value"][0]
    ocr_results = ast.literal_eval(ocr_results_str)
    if not isinstance(ocr_results, list) or not ocr_results:
        raise OCRError("Failed to parse OCR results")

    return img_width, img_height, ocr_results
