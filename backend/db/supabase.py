"""
supabase.py — Supabase client initialization.

Single client instance reused across all database operations.
Service role key used for server-side operations (bypasses RLS
where needed). Anon key used for user-scoped operations.
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()


def get_supabase() -> Client:
    """Return initialized Supabase client with service role key."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")

    return create_client(url, key)


def get_supabase_anon() -> Client:
    """Return initialized Supabase client with anon key (user-scoped)."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_ANON_KEY")

    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set")

    return create_client(url, key)


# Module-level client — initialized once, reused across requests
supabase: Client = get_supabase()
