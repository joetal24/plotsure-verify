"""Neo4j graph service for ownership chain queries and sync."""
from neo4j import AsyncGraphDatabase
from app.config import settings


class GraphService:
    def __init__(self):
        self.driver = None

    async def _get_driver(self):
        if self.driver is None:
            self.driver = AsyncGraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
            )
        return self.driver

    async def close(self):
        if self.driver:
            await self.driver.close()
            self.driver = None

    async def get_ownership_chain(self, plot_ref: str) -> dict:
        query = """
            MATCH (p:Person)-[r:OWNED]->(plot:Plot {ref: $ref})
            RETURN p.name AS person, r.from AS from_date, r.to AS to_date
            ORDER BY r.from DESC
        """
        driver = await self._get_driver()
        async with driver.session() as session:
            result = await session.run(query, ref=plot_ref)
            records = await result.data()
            return {"plot_ref": plot_ref, "ownership": records}

    async def get_person_plots(self, name: str) -> dict:
        query = """
            MATCH (p:Person {name: $name})-[r:OWNED]->(plot:Plot)
            RETURN plot.ref AS ref, plot.district AS district,
                   r.from AS from_date, r.to AS to_date
            ORDER BY r.from DESC
        """
        driver = await self._get_driver()
        async with driver.session() as session:
            result = await session.run(query, name=name)
            records = await result.data()
            return {"person": name, "plots": records}

    async def sync_verification(
        self, plot_ref: str, owner: str, district: str, land_type: str, created_at: str
    ):
        query = """
            MERGE (plot:Plot {ref: $ref})
            ON CREATE SET plot.district = $district, plot.land_type = $land_type
            WITH plot
            MERGE (person:Person {name: $owner})
            MERGE (person)-[r:OWNED]->(plot)
            ON CREATE SET r.from = $created_at, r.to = null
            ON MATCH SET r.to = null
        """
        driver = await self._get_driver()
        async with driver.session() as session:
            await session.run(
                query,
                ref=plot_ref,
                owner=owner,
                district=district,
                land_type=land_type,
                created_at=created_at,
            )

    async def create_transfer(
        self,
        plot_ref: str,
        previous_owner: str,
        new_owner: str,
        transfer_date: str,
        district: str,
        land_type: str,
    ):
        query = """
            MERGE (plot:Plot {ref: $ref})
            ON CREATE SET plot.district = $district, plot.land_type = $land_type
            MERGE (prev:Person {name: $previous_owner})
            MERGE (next:Person {name: $new_owner})
            MATCH (prev)-[r:OWNED]->(plot)
            SET r.to = $transfer_date
            MERGE (next)-[:OWNED {from: $transfer_date, to: null}]->(plot)
        """
        driver = await self._get_driver()
        async with driver.session() as session:
            await session.run(
                query,
                ref=plot_ref,
                previous_owner=previous_owner,
                new_owner=new_owner,
                transfer_date=transfer_date,
                district=district,
                land_type=land_type,
            )


graph_service = GraphService()
