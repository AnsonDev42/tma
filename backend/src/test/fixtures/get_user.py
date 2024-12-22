# Mock function to override `get_user`
from src.models import User


async def override_get_free_user():
    # Return a mock user object
    return User(
        role="free", user_metadata={"user_role": "free"}, iat=0, exp=0, sub="test-sub"
    )
