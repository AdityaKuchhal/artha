"""
categorization_agent.py — AI-powered transaction categorization.

Uses Claude to assign human-readable categories and detect
recurring transactions from merchant names and amounts.

Why Claude over a rules engine:
- Handles ambiguous merchants ("AMZN" could be shopping or AWS)
- Detects recurring patterns across variable amounts
- Produces consistent category taxonomy regardless of Plaid's labels
- Improves over time as we tune the prompt
"""

import os
import json
import logging
from anthropic import Anthropic

logger = logging.getLogger(__name__)

CATEGORY_TAXONOMY = [
    "Food & Dining",
    "Groceries",
    "Transportation",
    "Entertainment",
    "Subscriptions",
    "Shopping",
    "Healthcare",
    "Utilities",
    "Rent & Housing",
    "Education",
    "Personal Care",
    "Travel",
    "Income",
    "Transfer",
    "Other",
]

SYSTEM_PROMPT = f"""You are a financial transaction categorizer for Artha, a personal finance app.

Your job is to categorize transactions into one of these categories:
{", ".join(CATEGORY_TAXONOMY)}

Rules:
- Use "Subscriptions" for recurring digital services (Netflix, Spotify, etc.)
- Use "Income" for deposits and paychecks
- Use "Transfer" for inter-account transfers
- Use "Food & Dining" for restaurants, cafes, fast food
- Use "Groceries" for supermarkets and grocery stores
- Respond ONLY with a valid JSON array — no preamble, no markdown

Input format: array of objects with merchant_name and amount
Output format: same array with ai_category and is_recurring added to each object"""


def categorize_transactions(transactions: list[dict]) -> list[dict]:
    """
    Categorize transactions using Claude.

    Processes in batches of 50 to stay within context limits.
    Falls back to Plaid category if Claude fails.

    Args:
        transactions: List of structured transaction dicts

    Returns:
        Same list with ai_category and is_recurring added
    """
    if not transactions:
        return transactions

    client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    results = []
    batch_size = 50

    batches = [
        transactions[i:i + batch_size]
        for i in range(0, len(transactions), batch_size)
    ]

    for batch_num, batch in enumerate(batches):
        # Build minimal payload for Claude — only what it needs
        payload = [
            {
                "plaid_transaction_id": t["plaid_transaction_id"],
                "merchant_name": t["merchant_name"],
                "amount": t["amount"],
            }
            for t in batch
        ]

        try:
            response = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=2000,
                system=SYSTEM_PROMPT,
                messages=[{
                    "role": "user",
                    "content": f"Categorize these transactions:\n{json.dumps(payload)}"
                }]
            )

            categorized = json.loads(response.content[0].text)

            # Merge AI categories back into original batch
            cat_map = {
                t["plaid_transaction_id"]: t
                for t in categorized
            }

            for txn in batch:
                ai_data = cat_map.get(txn["plaid_transaction_id"], {})
                txn["ai_category"] = ai_data.get("ai_category", txn["category"])
                txn["is_recurring"] = ai_data.get("is_recurring", False)
                results.append(txn)

            logger.info(f"Categorized batch {batch_num + 1}/{len(batches)}")

        except Exception as e:
            logger.error(f"Categorization batch {batch_num} failed: {e}")
            # Fallback — use Plaid category
            for txn in batch:
                txn["ai_category"] = txn.get("category", "Other")
                txn["is_recurring"] = False
                results.append(txn)

    return results
