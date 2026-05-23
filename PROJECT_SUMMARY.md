# PlotSure Project Summary

## Overview
PlotSure is a land verification platform focused on Uganda. It helps users verify land ownership, assess fraud risk, estimate price ranges, and generate tamper-evident verification certificates. The MVP emphasizes fast, deterministic logic and avoids heavy GIS or ML dependencies.

## Core Capabilities
- Land plot verification via authenticated requests, with cache-first lookup and UgNLIS or fallback data sources.
- Deterministic fraud risk scoring based on transfers, encumbrances, and data completeness.
- Heuristic price estimation using district-based base prices and simple multipliers.
- Certificate generation with SHA-256 hashing, PDF output, and public verification by hash.

## Architecture
- Frontend: React + Vite + TypeScript + shadcn/ui + Tailwind CSS.
- Backend: FastAPI (modular monolith) with JWT validation.
- Auth and data: Supabase (PostgreSQL, Auth, Storage) with RLS enforcement.

## API Surface (MVP)
- POST `/verify` and GET `/verify/{id}` for verification flows.
- GET `/history` for user search history.
- POST `/certificates/{search_id}`, GET `/certificates/{id}`, and GET `/certificates/verify/{hash}` for certificate lifecycle and public validation.

## Data Model (Simplified)
- users: id, role.
- searches: plot reference, location, owner data, title status, encumbrances, transfer count, risk level, price range, timestamps.
- certificates: search linkage, user linkage, hash, file URL, timestamps.

## Security and Constraints
- JWT authentication on all protected endpoints; user identity derived from token only.
- RLS and backend validation to enforce per-user data access.
- No microservices, no external ledgers, no ML models, and no heavy GIS pipelines in MVP.

## Testing and Quality
- Frontend: Vitest, ESLint, production builds.
- Backend: pytest and Ruff linting.
- Manual test plan for map interaction, pricing accuracy, PDF content, risk logic, and end-to-end flows.

## Future Phases (Not in MVP)
- Phase 2: GIS integration, async job queues, improved pricing model.
- Phase 3: ML anomaly detection, graph-based fraud detection, signed PDFs.
