"""PlotSure Backend Configuration"""
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    BACKEND_PUBLIC_URL: str = os.getenv("BACKEND_PUBLIC_URL", "http://localhost:8000")

    # Neo4j
    NEO4J_URI: str = os.getenv("NEO4J_URI", "")
    NEO4J_USER: str = os.getenv("NEO4J_USERNAME", "neo4j")
    NEO4J_PASSWORD: str = os.getenv("NEO4J_PASSWORD", "")

    # Rate limiting
    VERIFY_RATE_LIMIT: str = "10/day"

    # Cache TTL (seconds) — 24 hours
    CACHE_TTL_SECONDS: int = 86400

    # Kafka / Redpanda
    KAFKA_BOOTSTRAP_SERVERS: str = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    KAFKA_TOPIC_FRAUD_CHECK: str = os.getenv("KAFKA_TOPIC_FRAUD_CHECK", "fraud.check.queue")
    KAFKA_TOPIC_DEAD_LETTER: str = os.getenv("KAFKA_TOPIC_DEAD_LETTER", "fraud.check.failed")
    KAFKA_GROUP_ID: str = os.getenv("KAFKA_GROUP_ID", "plotsure-fraud-workers")

    # Deployment
    SYSTEM_ADMIN_EMAIL: str = os.getenv("SYSTEM_ADMIN_EMAIL", "admin@plotsure.ug")


settings = Settings()
