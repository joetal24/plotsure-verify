"""Supabase client initialization"""
from supabase import create_client, Client
from app.config import settings


def get_supabase() -> Client:
    """Get Supabase client with service role key for backend operations."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def get_supabase_anon() -> Client:
    """Get Supabase client with anon key (for auth operations)."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
