"""
async_invoker.py — Lambda async self-invocation utility.
Triggers the /internal/process-job endpoint on this same Lambda
with InvocationType=Event so it returns immediately.
"""

import json
import logging
import os

import boto3

logger = logging.getLogger(__name__)

LAMBDA_FUNCTION_NAME = os.getenv("AWS_LAMBDA_FUNCTION_NAME", "artha-api")
INTERNAL_SECRET = os.getenv("INTERNAL_SECRET", "artha-internal")


def invoke_job_async(job_id: str, user_id: str, job_type: str, payload: dict):
    """
    Invoke the job processor asynchronously via Lambda self-invocation.
    Returns immediately — job runs in background.
    """
    client = boto3.client("lambda", region_name="us-east-1")

    event = {
        "version": "2.0",
        "routeKey": "POST /internal/process-job",
        "rawPath": "/internal/process-job",
        "rawQueryString": "",
        "headers": {
            "content-type": "application/json",
            "x-internal-secret": INTERNAL_SECRET,
        },
        "requestContext": {
            "accountId": "975050138120",
            "http": {
                "method": "POST",
                "path": "/internal/process-job",
                "protocol": "HTTP/1.1",
                "sourceIp": "127.0.0.1",
                "userAgent": "artha-internal",
            },
            "requestId": f"internal-{job_id}",
            "stage": "$default",
        },
        "body": json.dumps(
            {
                "job_id": job_id,
                "user_id": user_id,
                "job_type": job_type,
                "payload": payload,
            }
        ),
        "isBase64Encoded": False,
    }

    client.invoke(
        FunctionName=LAMBDA_FUNCTION_NAME,
        InvocationType="Event",  # async — fire and forget
        Payload=json.dumps(event),
    )

    logger.info(f"Async job dispatched: {job_id} ({job_type})")
