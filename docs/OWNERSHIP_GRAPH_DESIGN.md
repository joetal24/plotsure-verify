# Ownership History Graph — Design Document

## Understanding Summary

- **What**: A standalone interactive ownership history graph explorer, backed by Neo4j AuraDB. Users can view the chain of title transfers for a plot and click through to explore connected people and plots.
- **Why**: Make land ownership history visual and explorable — uncover transfer patterns, see who owned what and when.
- **Who**: Land buyers, sellers, and admins verifying titles.
- **Key constraints**: FastAPI (Python) backend, Neo4j AuraDB cloud, seeded from existing Postgres data + real-time sync via verify API, Cytoscape.js frontend, new `/graph` route.
- **Non-goals**: Not replacing Postgres, not a full fraud detection graph (yet), not mobile-optimized.

## Assumptions

- Neo4j AuraDB free tier is sufficient for initial scale (<10 concurrent users, hundreds of nodes)
- Existing backend can be extended with the `neo4j` Python driver
- The `verify` endpoint owns the sync logic — after each successful verification, it also writes to Neo4j
- Same owner name across different plots = same Person node in Neo4j (deduplicated by name)
- The frontend graph page uses a Cytoscape.js `cose` layout for initial rendering

## Decision Log

| Decision | Choice | Alternatives Considered |
|---|---|---|
| Scope | Ownership Chain Graph (Approach A) | Rich Entity Graph with Listing/Verification nodes |
| Backend integration | Neo4j driver in existing FastAPI app | Separate microservice |
| Deployment | Neo4j AuraDB (cloud) | Local Docker, local installation |
| Data seeding | Bulk seed from Postgres + real-time sync | Seed-only, sync-only |
| Graph library | Cytoscape.js | vis-network, D3.js, Sigma.js |
| Graph interaction | Interactive explorer (click to expand) | Read-only visualization |
| Data model | Person + Plot nodes, OWNED relationship | Multiple node/relationship types |

## Final Design

### 1. Neo4j Data Model

```
(:Person {name: string})
    ↑
    │ [:OWNED {from: ISO-date, to: ISO-date | null}]
    │
(:Plot {ref: string, district: string, land_type: string})
```

- `to: null` = current ownership
- One direction: Person → Plot (ownership flows from person to property)
- Future extension: add a `TRANSFERRED` relationship between Plot nodes to model the chain-of-title directly

### 2. Backend — New Dependencies

Add to `backend/requirements.txt`:
```
neo4j>=5.27.0
```

Add to `backend/app/config.py`:
```python
NEO4J_URI: str = os.getenv("NEO4J_URI", "")
NEO4J_USER: str = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD: str = os.getenv("NEO4J_PASSWORD", "")
```

### 3. Backend — New Files

**`backend/app/services/graph.py`** — Neo4j client singleton and helpers:
```python
from neo4j import GraphDatabase, AsyncGraphDatabase
from app.config import settings

class GraphService:
    def __init__(self):
        self.driver = AsyncGraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
        )

    async def close(self):
        await self.driver.close()

    async def get_ownership_chain(self, plot_ref: str) -> dict:
        query = """
            MATCH (p:Person)-[r:OWNED]->(plot:Plot {ref: $ref})
            RETURN p.name AS person, r.from AS from_date, r.to AS to_date
            ORDER BY r.from DESC
        """
        async with self.driver.session() as session:
            result = await session.run(query, ref=plot_ref)
            records = await result.data()
            return {"plot_ref": plot_ref, "ownership": records}

    async def get_person_plots(self, name: str) -> dict:
        query = """
            MATCH (p:Person {name: $name})-[r:OWNED]->(plot:Plot)
            RETURN plot.ref AS ref, plot.district AS district, r.from AS from_date, r.to AS to_date
            ORDER BY r.from DESC
        """
        async with self.driver.session() as session:
            result = await session.run(query, name=name)
            records = await result.data()
            return {"person": name, "plots": records}

    async def sync_verification(self, plot_ref: str, owner: str, district: str, land_type: str, created_at: str):
        query = """
            MERGE (plot:Plot {ref: $ref})
            ON CREATE SET plot.district = $district, plot.land_type = $land_type
            MERGE (person:Person {name: $owner})
            MERGE (person)-[r:OWNED]->(plot)
            ON CREATE SET r.from = $created_at, r.to = null
            ON MATCH SET r.to = null
        """
        async with self.driver.session() as session:
            await session.run(query, ref=plot_ref, owner=owner, district=district, land_type=land_type, created_at=created_at)

    async def seed_from_db(self):
        """One-time seed: reads all searches from Supabase, writes to Neo4j."""
        # Implementation in seed script
        pass

graph_service = GraphService()
```

**`backend/app/routers/graph.py`** — FastAPI router:
```python
from fastapi import APIRouter, Depends, HTTPException
from app.auth import get_current_user
from app.services.graph import graph_service

router = APIRouter(prefix="/api/v1/graph", tags=["Graph"])

@router.get("/ownership/{plot_ref}")
async def get_ownership(plot_ref: str, user: dict = Depends(get_current_user)):
    result = await graph_service.get_ownership_chain(plot_ref)
    if not result["ownership"]:
        raise HTTPException(404, "Plot not found in graph")
    return result

@router.get("/person/{name}")
async def get_person(name: str, user: dict = Depends(get_current_user)):
    result = await graph_service.get_person_plots(name)
    return result
```

**Integration with existing verify flow** (in `backend/app/routers/verify.py` line ~157, after DB insert):
```python
from app.services.graph import graph_service

# After successful DB insert, sync to Neo4j (fire-and-forget)
try:
    await graph_service.sync_verification(
        plot_ref=plot_ref,
        owner=land_data["owner"],
        district=district,
        land_type=body.land_type.value,
        created_at=now,
    )
except Exception:
    logger.warning("Neo4j sync failed for %s", plot_ref)
```

**Seed script** `backend/scripts/seed_neo4j.py`:
- Reads all rows from `searches` table via Supabase
- For each row: MERGE Person, MERGE Plot, MERGE OWNED relationship
- Deduplicates by Person name and Plot ref using MERGE

### 4. Frontend — New API Function

Add to `src/lib/api.ts`:
```typescript
export interface GraphNode {
  id: string;
  label: string;
  type: "person" | "plot";
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  properties: Record<string, unknown>;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export async function fetchOwnershipChain(plotRef: string): Promise<GraphResponse> {
  const data = await apiFetch<{ plot_ref: string; ownership: Array<{ person: string; from_date: string; to_date: string | null }> }>(
    `/api/v1/graph/ownership/${encodeURIComponent(plotRef)}`
  );
  // Transform to Cytoscape-friendly format
  return transformOwnershipToGraph(data);
}

export async function fetchPersonPlots(name: string): Promise<GraphResponse> {
  // Similar transformation
}
```

### 5. Frontend — Graph Explorer Page

New page `src/pages/GraphExplorer.tsx` at route `/graph`:

**Layout**:
- AppTopBar at top
- Search bar: input + "Explore" button (defaults to `?ref=` from URL if present)
- Cytoscape.js container: `h-[600px]` full-width with white/rounded border
- Right side panel (collapsible, 280px): node detail view
- Legend overlay (bottom-right): green circle = Person, navy rounded-rect = Plot

**Cytoscape stylesheet**:
```typescript
const cyStyles: cytoscape.Stylesheet[] = [
  {
    selector: 'node[type="person"]',
    style: {
      shape: 'ellipse',
      'background-color': '#16a34a',
      width: 50,
      height: 50,
      label: 'data(label)',
      color: '#1e293b',
      'font-size': '12px',
      'text-valign': 'bottom',
      'text-halign': 'center',
      'padding-top': '10px',
    },
  },
  {
    selector: 'node[type="plot"]',
    style: {
      shape: 'round-rectangle',
      'background-color': '#1e3a6e',
      width: 80,
      height: 40,
      label: 'data(label)',
      color: '#fff',
      'font-size': '11px',
      'text-valign': 'center',
      'text-halign': 'center',
    },
  },
  {
    selector: 'edge',
    style: {
      width: 2,
      'line-color': '#94a3b8',
      'target-arrow-color': '#94a3b8',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      label: 'data(label)',
      'font-size': '10px',
      color: '#64748b',
    },
  },
];
```

**Interaction**:
- `cose` layout with `animate: true`
- Click Person node → highlight all connected Plot nodes, dim others, show person details in panel
- Click Plot node → fetch `ownership` for that ref, replace graph, show plot details in panel
- Double-click: expand node (fetch deeper connections)
- Cytoscape `tap` event → update detail panel

### 6. Route Registration

**Backend**: Add to `backend/app/main.py`:
```python
from app.routers import graph as graph_router
app.include_router(graph_router.router)
```

**Frontend**: Add to `src/App.tsx`:
```tsx
import GraphExplorer from "@/pages/GraphExplorer";
<Route path="/graph" element={<GraphExplorer />} />
```

## Implementation Order

1. Add `neo4j` to requirements.txt, NEO4J_* vars to config
2. Create `backend/app/services/graph.py` with GraphService
3. Create `backend/app/routers/graph.py` with ownership + person endpoints
4. Register graph router in `main.py`
5. Integrate Neo4j sync into `verify.py` after DB insert
6. Create seed script `backend/scripts/seed_neo4j.py`
7. Install `cytoscape` npm package in frontend
8. Add `fetchOwnershipChain` + `fetchPersonPlots` to `api.ts`
9. Build `GraphExplorer.tsx` page with Cytoscape.js
10. Register `/graph` route in `App.tsx`
11. Build and verify end-to-end
