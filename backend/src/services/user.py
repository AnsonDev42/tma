import datetime

from fastapi import HTTPException

from src.core.vendor import get_supabase_client
from src.models import User


async def get_access_limits(user: User):
    user_id = user.sub
    supabase = await get_supabase_client()

    # Get the user's role
    # TODO: for now assume the role is simply based on user_roles, skip check for expired subscriptions
    response = (
        await supabase.table("user_roles")
        .select("role")
        .eq("user_id", user_id)
        .execute()
    )
    if not response.data or len(response.data) == 0:
        user_role = "free"
    else:
        user_role = response.data[0]["role"]

    # Get the daily limit for the role
    response = (
        await supabase.table("access_limits")
        .select("daily_limit")
        .eq("role", user_role)
        .execute()
    )
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=404, detail="Access limit not found")
    daily_limit = response.data[0]["daily_limit"]

    # Check if the user is a trial or pro user and if their subscription has expired
    if user_role in ["trial", "pro"]:
        response = (
            await supabase.table("user_subscriptions")
            .select("expires_at")
            .eq("user_id", user_id)
            .execute()
        )
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="User subscription not found")
        expires_at = response.data[0]["expires_at"]
        if datetime.datetime.fromisoformat(expires_at) < datetime.datetime.now(
            datetime.UTC
        ):
            # update user role to free
            await supabase.table("user_roles").upsert(
                {"role": "free", "user_id": user_id}, ["user_id"]
            )

    # Count accesses for today
    today = datetime.datetime.now(datetime.UTC)

    start_of_today = datetime.datetime.combine(today, datetime.datetime.min.time())
    end_of_today = start_of_today + datetime.timedelta(days=1)
    response = (
        await supabase.table("user_access_records")
        .select("*")
        .eq("user_id", user_id)
        .gte("accessed_at", start_of_today.isoformat())
        .lt("accessed_at", end_of_today.isoformat())
        .execute()
    )
    accesses_today = len(response.data)

    remaining_accesses = max(0, daily_limit - accesses_today)

    return {
        "role": user_role,
        "daily_limit": daily_limit,
        "remaining_accesses": remaining_accesses,
        "expires_at": expires_at if user_role in ["trial", "pro"] else None,
    }


async def record_access(user: User):
    user_id = user.sub
    supabase = await get_supabase_client()

    data = {
        "user_id": user_id,
        "accessed_at": datetime.datetime.now(datetime.UTC).isoformat(),
    }
    await supabase.table("user_access_records").insert(data).execute()
