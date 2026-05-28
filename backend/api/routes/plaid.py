"""
plaid.py — Plaid Link integration endpoints.

Flow:
  1. POST /plaid/link-token    — create a Link token for the frontend
  2. POST /plaid/exchange      — exchange public token for access token
  3. POST /plaid/sync          — fetch and store transactions
"""

import os
import logging
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.transactions_get_request_options import TransactionsGetRequestOptions
from plaid.model.country_code import CountryCode
from plaid.model.products import Products
from plaid import ApiClient, Configuration, Environment
from datetime import date, timedelta
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
        }
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
        exchange_request = ItemPublicTokenExchangeRequest(
            public_token=data.public_token
        )
        response = client.item_public_token_exchange(exchange_request)
        access_token = response.access_token
        item_id = response.item_id

        # Store access token in Supabase
        supabase.table("plaid_items").upsert({
            "user_id": user_id,
            "access_token": access_token,
            "item_id": item_id,
            "institution_name": data.institution_name,
        }).execute()

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
    Fetch transactions from Plaid and store in Supabase.
    Triggers the extraction agent pipeline.
    """
    user_id = get_user_id(authorization)
    client = get_plaid_client()

    # Get user's linked accounts
    items = supabase.table("plaid_items")\
        .select("*")\
        .eq("user_id", user_id)\
        .execute()

    if not items.data:
        raise HTTPException(
            status_code=404,
            detail="No linked bank accounts. Connect a bank first."
        )

    all_transactions = []
    end_date = date.today()
    start_date = end_date - timedelta(days=days)

    for item in items.data:
        try:
            request = TransactionsGetRequest(
                access_token=item["access_token"],
                start_date=start_date,
                end_date=end_date,
                options=TransactionsGetRequestOptions(count=500),
            )
            response = client.transactions_get(request)
            all_transactions.extend(response.transactions)

        except Exception as e:
            logger.error(f"Error fetching transactions for item {item['item_id']}: {e}")
            continue

    if not all_transactions:
        return {"synced": 0, "message": "No transactions found"}

    # Run through extraction + categorization agent
    from backend.agents.extraction_agent import process_transactions
    synced = process_transactions(user_id, all_transactions)

    return {
        "synced": synced,
        "period": f"{start_date} to {end_date}",
        "accounts": len(items.data),
    }
