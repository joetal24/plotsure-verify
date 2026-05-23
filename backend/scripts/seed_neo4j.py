"""
One-time script: seed Neo4j from existing Supabase searches table.

Usage:
    cd backend && python -m backend.scripts.seed_neo4j

Requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEO4J_URI, NEO4J_USERNAME,
NEO4J_PASSWORD to be set in the environment or .env files.
"""
import asyncio
import os
import sys
import time
from dotenv import load_dotenv

# Load .env from backend directory (SUPABASE vars), then root .env (NEO4J vars)
backend_dotenv = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(backend_dotenv)
root_dotenv = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
load_dotenv(root_dotenv)

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from supabase import create_client
from neo4j import AsyncGraphDatabase


async def seed():
    supabase_url = os.getenv("SUPABASE_URL", "")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    neo4j_uri = os.getenv("NEO4J_URI", "")
    neo4j_user = os.getenv("NEO4J_USERNAME", "neo4j")
    neo4j_pass = os.getenv("NEO4J_PASSWORD", "")

    if not all([supabase_url, supabase_key, neo4j_uri, neo4j_pass]):
        print("Missing required environment variables")
        sys.exit(1)

    print("Connecting to Supabase...")
    db = create_client(supabase_url, supabase_key)

    print("Fetching all search records...")
    all_rows = []
    page = 0
    page_size = 1000

    while True:
        offset = page * page_size
        result = (
            db.table("searches")
            .select("plot_reference, owner, location, land_type, created_at")
            .neq("owner", "")
            .not_.is_("owner", "null")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        rows = result.data
        if not rows:
            break
        all_rows.extend(rows)
        page += 1
        print(f"  Fetched {len(all_rows)} records...")

    # Deduplicate by (plot_ref, owner) — keep the earliest created_at
    seen = {}
    for row in all_rows:
        plot_ref = row.get("plot_reference")
        owner = row.get("owner", "Unknown")
        if not plot_ref or not owner:
            continue
        key = (plot_ref, owner)
        created_at = row.get("created_at", "")
        if key not in seen or created_at < seen[key].get("created_at", ""):
            seen[key] = row

    unique = list(seen.values())
    print(f"Fetched {len(all_rows)} total, {len(unique)} unique (plot_ref, owner) pairs")

    print(f"Connecting to Neo4j ({neo4j_uri})...")
    driver = AsyncGraphDatabase.driver(
        neo4j_uri,
        auth=(neo4j_user, neo4j_pass),
        connection_timeout=30,
        max_connection_lifetime=600,
    )

    BATCH_SIZE = 500
    total_created = 0

    async with driver.session() as session:
        for i in range(0, len(unique), BATCH_SIZE):
            batch = unique[i : i + BATCH_SIZE]
            batch_data = [
                {
                    "ref": r["plot_reference"],
                    "owner": r["owner"],
                    "district": r.get("location", ""),
                    "land_type": r.get("land_type", "Freehold"),
                    "created_at": r.get("created_at", ""),
                }
                for r in batch
            ]

            query = """
                UNWIND $batch AS row
                MERGE (plot:Plot {ref: row.ref})
                ON CREATE SET plot.district = row.district, plot.land_type = row.land_type
                WITH row, plot
                MERGE (person:Person {name: row.owner})
                MERGE (person)-[r:OWNED]->(plot)
                ON CREATE SET r.from = row.created_at, r.to = null
                ON MATCH SET r.to = null
            """
            await session.run(query, batch=batch_data)
            total_created += len(batch)
            print(f"  Seeded {total_created}/{len(unique)}...")

    await driver.close()
    print(f"Done. Seeded {total_created} ownership relationships into Neo4j.")


if __name__ == "__main__":
    start = time.time()
    asyncio.run(seed())
    print(f"Elapsed: {time.time() - start:.1f}s")
