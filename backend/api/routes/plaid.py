"""
plaid.py — Plaid Link integration endpoints.

Flow:
  1. POST /plaid/link-token    — create a Link token for the frontend
  2. POST /plaid/exchange      — exchange public token for access token
  3. POST /plaid/sync          — fetch and store transactions
"""

import logging
import os

from fastapi import APIRouter, Header, HTTPException
from plaid import ApiClient, Configuration, Environment
from plaid.api import plaid_api
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from pydantic import BaseModel

from backend.db.supabase import supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/plaid", tags=["Plaid"])


def get_plaid_client() -> plaid_api.PlaidApi:
    """Initialize Plaid API client from environment."""
    env = os.getenv("PLAID_ENV", "sandbox")
    host = {
        "sandbox": Environment.Sandbox,
        "development": Environment.Sandbox,  # use sandbox for dev
        "production": Environment.Production,
    }.get(env, Environment.Sandbox)

    configuration = Configuration(
        host=host,
        api_key={
            "clientId": os.getenv("PLAID_CLIENT_ID"),
            "secret": os.getenv("PLAID_SECRET"),
        },
    )
    api_client = ApiClient(configuration)
    return plaid_api.PlaidApi(api_client)


def get_user_id(authorization: str) -> str:
    try:
        token = authorization.replace("Bearer ", "")
        user = supabase.auth.get_user(token)
        return str(user.user.id)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


class PublicTokenExchange(BaseModel):
    public_token: str
    institution_name: str


@router.post("/link-token")
async def create_link_token(authorization: str = Header(...)):
    """
    Create a Plaid Link token.
    Frontend uses this to initialize the Plaid Link UI.
    """
    user_id = get_user_id(authorization)
    client = get_plaid_client()

    request = LinkTokenCreateRequest(
        products=[Products("transactions")],
        client_name="Artha",
        country_codes=[CountryCode("CA"), CountryCode("US")],
        language="en",
        user=LinkTokenCreateRequestUser(client_user_id=user_id),
    )

    try:
        response = client.link_token_create(request)
        return {"link_token": response.link_token}
    except Exception as e:
        logger.error(f"Plaid link token error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/exchange")
async def exchange_public_token(
    data: PublicTokenExchange,
    authorization: str = Header(...),
):
    """
    Exchange Plaid public token for access token.
    Called after user successfully links their bank in the UI.
    Access token is stored securely in Supabase.
    """
    user_id = get_user_id(authorization)
    client = get_plaid_client()

    try:
        exchange_request = ItemPublicTokenExchangeRequest(public_token=data.public_token)
        response = client.item_public_token_exchange(exchange_request)
        access_token = response.access_token
        item_id = response.item_id

        # Store access token in Supabase
        supabase.table("plaid_items").upsert(
            {
                "user_id": user_id,
                "access_token": access_token,
                "item_id": item_id,
                "institution_name": data.institution_name,
            }
        ).execute()

        logger.info(f"Linked bank account for user {user_id}: {data.institution_name}")
        return {
            "status": "success",
            "institution": data.institution_name,
            "item_id": item_id,
        }

    except Exception as e:
        logger.error(f"Plaid exchange error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/sync")
async def sync_transactions(
    days: int = 30,
    authorization: str = Header(...),
):
    """
    Trigger async transaction sync.
    Returns job_id immediately — poll /reports/status?job_id= for result.
    """
    from backend.utils.async_invoker import invoke_job_async

    user_id = get_user_id(authorization)

    items = supabase.table("plaid_items").select("id").eq("user_id", user_id).execute()

    if not items.data:
        raise HTTPException(
            status_code=404, detail="No linked bank accounts. Connect a bank first."
        )

    job = (
        supabase.table("agent_jobs")
        .insert(
            {
                "user_id": user_id,
                "job_type": "sync",
                "status": "pending",
                "payload": {"days": days},
            }
        )
        .execute()
    )

    job_id = job.data[0]["id"]
    invoke_job_async(job_id, user_id, "sync", {"days": days})

    return {
        "job_id": job_id,
        "status": "pending",
        "message": f"Sync started. Poll /reports/status?job_id={job_id}",
    }
