import time
import os
import json
from src.services.ocr.build_paragraph import build_paragraph

if __name__ == "__main__":
    start = time.time()
    abs_path = os.path.abspath(__file__)
    abs_json_path = os.path.join(
        os.path.dirname(abs_path), "fixture_dip_results.json"
    )
    with open(abs_json_path) as f:
        json_data = json.load(f)
        print(build_paragraph(json_data))
    print(f"Elapsed time: {time.time() - start}")
