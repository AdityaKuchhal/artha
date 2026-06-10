"""
extraction_agent.py — Extracts and structures raw Plaid transactions.

Takes raw Plaid transaction objects and:
1. Normalizes merchant names
2. Detects recurring transactions
3. Identifies subscriptions
4. Passes to categorization agent for AI labeling
5. Upserts to Supabase transactions table
"""

import logging
import re

from backend.agents.categorization_agent import categorize_transactions
from backend.db.supabase import supabase

logger = logging.getLogger(__name__)

# Known subscription patterns — merchant name substrings
SUBSCRIPTION_PATTERNS = [
    "netflix",
    "spotify",
    "apple",
    "google",
    "amazon prime",
    "disney",
    "hulu",
    "youtube",
    "microsoft",
    "adobe",
    "dropbox",
    "slack",
    "notion",
    "github",
    "openai",
    "chatgpt",
    "cursor",
    "figma",
    "canva",
    "grammarly",
]


def normalize_merchant(name: str | None, raw_name: str | None) -> str:
    """Clean and normalize merchant name from Plaid data."""
    display = name or raw_name or "Unknown"
    # Remove trailing numbers, store codes, location suffixes
    display = re.sub(r"\s+#\d+", "", display)
    display = re.sub(r"\s+\d{3,}", "", display)
    return display.strip()


def is_subscription(merchant: str, amount: float) -> bool:
    """Detect if a transaction looks like a subscription."""
    merchant_lower = merchant.lower()
    return any(pattern in merchant_lower for pattern in SUBSCRIPTION_PATTERNS)


def process_transactions(user_id: str, raw_transactions: list) -> int:
    """
    Process raw Plaid transactions into structured records.

    Args:
        user_id: Authenticated user's UUID
        raw_transactions: List of Plaid Transaction objects

    Returns:
        Number of transactions successfully upserted
    """
    if not raw_transactions:
        return 0

    # Build structured records
    structured = []
    for txn in raw_transactions:
        # Skip pending and income transactions
        if txn.pending:
            continue

        merchant = normalize_merchant(
            getattr(txn, "merchant_name", None), getattr(txn, "name", None)
        )
        amount = float(txn.amount)
        subscription = is_subscription(merchant, amount)

        structured.append(
            {
                "plaid_transaction_id": txn.transaction_id,
                "merchant_name": merchant,
                "amount": amount,
                "date": str(txn.date),
                "category": txn.personal_finance_category.primary
                if hasattr(txn, "personal_finance_category") and txn.personal_finance_category
                else "UNCATEGORIZED",
                "is_subscription": subscription,
                "raw": merchant,
            }
        )

    if not structured:
        return 0

    # Run AI categorization on batches
    categorized = categorize_transactions(structured)

    # Upsert to Supabase
    upsert_payload = []
    for txn in categorized:
        upsert_payload.append(
            {
                "user_id": user_id,
                "plaid_transaction_id": txn["plaid_transaction_id"],
                "merchant_name": txn["merchant_name"],
                "amount": txn["amount"],
                "date": txn["date"],
                "category": txn["category"],
                "ai_category": txn.get("ai_category", txn["category"]),
                "is_subscription": txn["is_subscription"],
                "is_recurring": txn.get("is_recurring", False),
            }
        )

    if upsert_payload:
        supabase.table("transactions").upsert(
            upsert_payload, on_conflict="plaid_transaction_id"
        ).execute()

    logger.info(f"Processed {len(upsert_payload)} transactions for user {user_id}")
    return len(upsert_payload)
