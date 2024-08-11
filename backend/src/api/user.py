from fastapi import APIRouter, Depends

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
