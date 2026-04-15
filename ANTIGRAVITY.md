# ANTIGRAVITY.md

## Project: PlotSure MVP

PlotSure is a land verification platform focused on Uganda. It enables users to verify land ownership, assess fraud risk, estimate price ranges, and generate tamper-evident certificates.

This document defines system behavior, architecture assumptions, constraints, and operational logic for the AI agent and backend services.

---

# 🎯 Core Objective

Provide fast, reliable land verification with:
- Ownership validation (UgNLIS or fallback)
- Basic fraud risk scoring
- Price estimation
- Certificate generation with tamper evidence

---

# 🧱 System Architecture (MVP)

## Stack
- Frontend: React
- Backend: FastAPI (single service)
- Auth & DB: Supabase (PostgreSQL + Auth + Storage)

## Principles
- Single backend service (modular monolith)
- Supabase is the source of truth
- Avoid microservices in MVP
- Prefer deterministic logic over ML

---

# 🔐 Authentication & Authorization

## Auth Source
- Supabase Auth (JWT-based)

## Rules
- All backend endpoints MUST validate JWT
- NEVER trust frontend-provided user_id
- Always derive user identity from token

## Authorization
- Users can only access their own data
- Enforced via:
  - Supabase Row-Level Security (RLS)
  - Backend validation checks

---

# 🗄️ Data Model (Simplified)

## users
- id (UUID)
- role (land_buyer | admin)

## searches
- id
- user_id
- plot_reference
- location
- owner
- title_status
- encumbrances (JSON)
- transfer_count
- risk_level (LOW | MEDIUM | HIGH)
- price_min
- price_max
- created_at

## certificates
- id
- search_id
- user_id
- hash (SHA-256)
- file_url
- created_at

---

# 🔍 Verification Logic

## Endpoint
POST /verify

## Flow
1. Authenticate user
2. Validate input (plot_reference required)
3. Check cache (existing recent search)
4. Fetch data:
   - UgNLIS (if available)
   - fallback mock data if unavailable
5. Compute:
   - risk score
   - price estimate
6. Store result in DB
7. Return response

---

# ⚠️ Risk Scoring Rules (Deterministic)

HIGH risk if:
- transfer_count > 2 within short period
- encumbrances exist
- missing ownership data

MEDIUM risk if:
- transfer_count == 1 recent
- partial data available

LOW risk otherwise

---

# 💰 Price Estimation (Heuristic)

Formula:
- base price (by district)
- × land type multiplier
- × simple adjustments

No external GIS required for MVP.

---

# 📜 Certificate Generation

## Process
1. Take verification result (structured JSON)
2. Normalize into canonical format
3. Generate SHA-256 hash
4. Store hash in DB
5. Generate PDF
6. Upload to Supabase Storage

## Verification
GET /certificates/verify/{hash}

Returns:
- validity (true/false)
- associated search data

---

# ⚡ Performance & Caching

## Rules
- Cache verification results by plot_reference
- Avoid repeated UgNLIS calls
- Use DB-based cache (no Redis required initially)

---

# 🚦 Rate Limiting

## Required
- Limit /verify endpoint usage

Example:
- 5–10 verifications per user per day

Purpose:
- prevent abuse
- control external API costs

---

# 🔄 Async Handling (Optional MVP+)

If verification becomes slow:
- return "pending"
- process in background
- allow polling

---

# 🛑 Constraints

- No Neo4j (graph DB) in MVP
- No blockchain anchoring in MVP
- No ML models in MVP
- No heavy GIS pipelines

---

# 🔐 Security Rules

- Enforce RLS on all tables
- Validate all inputs
- Never expose service role keys
- Use HTTPS only
- Store secrets in environment variables

---

# 📡 API Contract (Minimal)

## Verification
- POST /verify
- GET /verify/{id}

## History
- GET /history

## Certificates
- POST /certificates/{search_id}
- GET /certificates/{id}
- GET /certificates/verify/{hash}

---

# 🧪 Failure Handling

## UgNLIS Failure
- fallback to cached data
- mark response as "stale"

## Missing Data
- assign higher risk score
- return partial results

---

# 🧠 AI Agent Behavior Rules

When assisting with this system:
- Prefer simple, deterministic solutions
- Avoid introducing new infrastructure unless necessary
- Do not suggest microservices for MVP
- Keep logic explainable (no black-box ML)
- Optimize for speed of delivery over completeness

---

# 🚀 Future Phases (Do NOT implement in MVP)

## Phase 2
- GIS integration
- async job queues
- improved pricing model

## Phase 3
- ML anomaly detection
- graph-based fraud detection
- blockchain certificate anchoring

---

# ✅ Definition of Done (MVP)

System is complete when:
- users can authenticate
- users can verify a plot
- risk level is returned
- price estimate is shown
- certificate is generated + downloadable
- certificate can be verified via hash

---

# END
