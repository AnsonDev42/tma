from fastapi import APIRouter, Depends

from src.services.menu import retrieve_dish_image
from src.api.deps import get_user
from src.models import User
from src.services.user import get_access_limits

router = APIRouter()


@router.get("/user-info")
async def get_user_info(user: User = Depends(get_user)):
    """
    return the user role, usage and limits
    """
    return await get_access_limits(user)



@router.get("/keep-alive")
async def keep_alive():
    """
    Keep db live by query supabase
    """
    try:
        await retrieve_dish_image("test_dish") # query supabase a random dish to keep db alive
        return {"status": "success"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}