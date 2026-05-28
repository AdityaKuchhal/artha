"""
routes/jobs.py — Job profile API endpoints.
"""

from fastapi import APIRouter, Header, HTTPException
from backend.api.schemas import JobCreate, JobUpdate, JobResponse
from backend.income.jobs import create_job, get_jobs, get_job, update_job, delete_job
from backend.db.supabase import supabase

router = APIRouter(prefix="/jobs", tags=["Jobs"])


def get_user_id(authorization: str) -> str:
    """Extract user ID from Supabase JWT token."""
    try:
        token = authorization.replace("Bearer ", "")
        user = supabase.auth.get_user(token)
        return str(user.user.id)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.post("", status_code=201)
async def create_job_route(
    data: JobCreate,
    authorization: str = Header(...),
):
    """Create a new job profile."""
    user_id = get_user_id(authorization)
    try:
        return create_job(user_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("")
async def get_jobs_route(
    active_only: bool = True,
    authorization: str = Header(...),
):
    """Get all job profiles for the authenticated user."""
    user_id = get_user_id(authorization)
    return get_jobs(user_id, active_only=active_only)


@router.get("/{job_id}")
async def get_job_route(
    job_id: str,
    authorization: str = Header(...),
):
    """Get a single job profile."""
    user_id = get_user_id(authorization)
    job = get_job(user_id, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.patch("/{job_id}")
async def update_job_route(
    job_id: str,
    data: JobUpdate,
    authorization: str = Header(...),
):
    """Update a job profile."""
    user_id = get_user_id(authorization)
    try:
        return update_job(user_id, job_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{job_id}", status_code=204)
async def delete_job_route(
    job_id: str,
    authorization: str = Header(...),
):
    """Soft delete a job profile."""
    user_id = get_user_id(authorization)
    try:
        delete_job(user_id, job_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
