from src.api.deps import get_user
from fastapi.testclient import TestClient
import os
import time
from src.main import app
from src.models import User

def override_get_free_user():
    # Return a mock user object
    return User(
        role="free", user_metadata={"user_role": "free"}, iat=0, exp=0, sub="test-sub"
    )


if __name__ == "__main__":

    client = TestClient(app)
    app.dependency_overrides[get_user] = override_get_free_user
    headers = {
        "Authorization": "Bearer test-token",
        "dip": "true",
    }
    file_path = os.path.join(os.path.dirname(__file__), "test1.jpg")
    with open(file_path, "rb") as f:
        file_content = f.read()

    # Prepare the form data
    form_data = {
        "file": (os.path.basename(file_path), file_content, "image/jpeg"),
        "file_name": os.path.basename(file_path).split(".")[0] + "_compressed.jpg",
    }
    # show the response time took in pytest
    start_time = time.time()

    response = client.post(
        "/upload",
        headers=headers,
        files=form_data,
    )
    end_time = time.time()
    print(f"Response time: {end_time - start_time} seconds")
    assert response.status_code == 200