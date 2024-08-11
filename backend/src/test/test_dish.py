from fastapi.testclient import TestClient
from src.main import app 

client = TestClient(app)

def test_read_item():
    response = client.get("/dish1")
    assert response.status_code == 200
    assert response.json() != {"item_id": 1, "name": "Item 1"}
