"""
reports.py — Async report trigger and status endpoints.
"""

import logging
from fastapi import APIRouter, Header, HTTPException, Query
from backend.db.supabase import supabase
from backend.utils.async_invoker import invoke_job_async

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reports", tags=["Reports"])


def get_user_id(authorization: str) -> str:
    try:
        token = authorization.replace("Bearer ", "")
        user = supabase.auth.get_user(token)
        return str(user.user.id)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.post("/run")
async def run_workflow(
    days: int = Query(default=30, ge=1, le=90),
    authorization: str = Header(...),
):
    """
    Trigger the full Artha multi-agent workflow asynchronously.
    Returns job_id immediately — poll /reports/status for result.
    """
    user_id = get_user_id(authorization)

    job = supabase.table("agent_jobs").insert({
        "user_id": user_id,
        "job_type": "report",
        "status": "pending",
        "payload": {"days": days},
    }).execute()

    job_id = job.data[0]["id"]
    invoke_job_async(job_id, user_id, "report", {"days": days})

    return {
        "job_id": job_id,
        "status": "pending",
        "message": f"Report is being generated. Poll /reports/status?job_id={job_id}",
    }


@router.get("/status")
async def get_job_status(
    job_id: str,
    authorization: str = Header(...),
):
    """
    Poll job status. Returns result inline when complete.
    Frontend polls every 3s until status is complete or error.
    """
    user_id = get_user_id(authorization)

    job = supabase.table("agent_jobs")\
        .select("*")\
        .eq("id", job_id)\
        .eq("user_id", user_id)\
        .single()\
        .execute()

    if not job.data:
        raise HTTPException(status_code=404, detail="Job not found")

    data = job.data
    response = {
        "job_id": job_id,
        "status": data["status"],
        "created_at": data["created_at"],
        "updated_at": data["updated_at"],
    }

    if data["status"] == "complete":
        response.update(data["result"])
    elif data["status"] == "error":
        response["error"] = data["error"]

    return response


@router.get("/latest")
async def get_latest_report(authorization: str = Header(...)):
    """
    Get latest completed report without re-running the workflow.
    """
    user_id = get_user_id(authorization)

    job = supabase.table("agent_jobs")\
        .select("*")\
        .eq("user_id", user_id)\
        .eq("job_type", "report")\
        .eq("status", "complete")\
        .order("created_at", desc=True)\
        .limit(1)\
        .execute()

    if not job.data:
        return {"message": "No completed reports found. Run /reports/run first."}

    result = job.data[0]["result"]
    result["job_id"] = job.data[0]["id"]
    result["generated_at"] = job.data[0]["updated_at"]
    return result
