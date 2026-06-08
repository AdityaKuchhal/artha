"""
jobs_worker.py — Internal async job processor.
Called by Lambda invoking itself with InvocationType=Event.
Never exposed to frontend directly.
"""

import logging
import json
from fastapi import APIRouter, Header, HTTPException, Request
from backend.db.supabase import supabase
from backend.orchestrator.workflow import artha_workflow

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/internal", tags=["Internal"])

INTERNAL_SECRET = __import__('os').getenv("INTERNAL_SECRET", "artha-internal")


@router.post("/process-job")
async def process_job(request: Request):
    """
    Internal endpoint — processes a queued agent_job.
    Called asynchronously by Lambda self-invocation.
    Secured by INTERNAL_SECRET header.
    """
    secret = request.headers.get("x-internal-secret")
    if secret != INTERNAL_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

    body = await request.json()
    job_id = body.get("job_id")
    user_id = body.get("user_id")
    job_type = body.get("job_type")
    payload = body.get("payload", {})

    if not all([job_id, user_id, job_type]):
        raise HTTPException(status_code=400, detail="Missing job_id, user_id, or job_type")

    supabase.table("agent_jobs").update({
        "status": "running",
        "updated_at": "now()",
    }).eq("id", job_id).execute()

    try:
        if job_type == "report":
            result = await _run_report(user_id, payload)
        elif job_type == "sync":
            result = await _run_sync(user_id, payload)
        else:
            raise ValueError(f"Unknown job type: {job_type}")

        supabase.table("agent_jobs").update({
            "status": "complete",
            "result": result,
            "updated_at": "now()",
        }).eq("id", job_id).execute()

        return {"status": "complete", "job_id": job_id}

    except Exception as e:
        logger.error(f"Job {job_id} failed: {e}")
        supabase.table("agent_jobs").update({
            "status": "error",
            "error": str(e),
            "updated_at": "now()",
        }).eq("id", job_id).execute()
        raise


async def _run_report(user_id: str, payload: dict) -> dict:
    days = payload.get("days", 30)
    initial_state = {
        "user_id": user_id,
        "transactions": [],
        "categorized": [],
        "analysis": {},
        "budget_alerts": [],
        "report": "",
        "errors": [],
        "sync_period_days": days,
    }
    config = {"configurable": {"thread_id": f"artha_{user_id}"}}
    result = artha_workflow.invoke(initial_state, config=config)

    return {
        "transactions_processed": len(result["categorized"]),
        "total_spent": result["analysis"].get("total_spent", 0),
        "daily_burn_rate": result["analysis"].get("daily_burn_rate", 0),
        "top_categories": sorted(
            result["analysis"].get("by_category", {}).items(),
            key=lambda x: x[1], reverse=True
        )[:5],
        "anomalies": result["analysis"].get("anomalies", []),
        "budget_alerts": result["budget_alerts"],
        "report": result["report"],
        "errors": result["errors"],
    }


async def _run_sync(user_id: str, payload: dict) -> dict:
    from plaid.api import plaid_api
    from plaid.model.transactions_get_request import TransactionsGetRequest
    from plaid.model.transactions_get_request_options import TransactionsGetRequestOptions
    from plaid import ApiClient, Configuration, Environment
    from backend.agents.extraction_agent import process_transactions
    from datetime import date, timedelta
    import os, certifi

    days = payload.get("days", 30)
    items = supabase.table("plaid_items").select("*").eq("user_id", user_id).execute()
    if not items.data:
        return {"synced": 0, "message": "No linked accounts"}

    configuration = Configuration(
        host=Environment.Sandbox,
        api_key={
            "clientId": os.getenv("PLAID_CLIENT_ID"),
            "secret": os.getenv("PLAID_SECRET"),
        },
        ssl_ca_cert=certifi.where(),
    )
    client = plaid_api.PlaidApi(ApiClient(configuration))

    end_date = date.today()
    start_date = end_date - timedelta(days=days)
    all_transactions = []

    for item in items.data:
        try:
            req = TransactionsGetRequest(
                access_token=item["access_token"],
                start_date=start_date,
                end_date=end_date,
                options=TransactionsGetRequestOptions(count=500),
            )
            resp = client.transactions_get(req)
            all_transactions.extend(resp.transactions)
        except Exception as e:
            logger.error(f"Plaid fetch error for item {item['item_id']}: {e}")
            continue

    if not all_transactions:
        return {"synced": 0, "message": "No transactions found"}

    synced = process_transactions(user_id, all_transactions)
    return {
        "synced": synced,
        "period": f"{start_date} to {end_date}",
        "accounts": len(items.data),
    }
