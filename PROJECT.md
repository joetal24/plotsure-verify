# PlotSure — Land Verification Platform for Uganda

PlotSure enables Ugandan land buyers to verify ownership, detect fraud, estimate fair prices, and generate tamper-evident PDF certificates. Sellers can list verified plots for sale. The platform is built on React + FastAPI + Supabase + Neo4j.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Integrations](#2-integrations)
3. [Data Model](#3-data-model)
4. [Backend Structure](#4-backend-structure)
5. [Frontend Structure](#5-frontend-structure)
6. [Key Flows](#6-key-flows)
7. [Configuration & Environment](#7-configuration--environment)
8. [Scripts & Seed Data](#8-scripts--seed-data)
9. [Testing](#9-testing)
10. [Recent Changes Log](#10-recent-changes-log)

---

## 1. Architecture Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  React SPA   │────▶│  FastAPI     │────▶│  Supabase    │
│  (Vite/TS)   │     │  (Python)    │     │  (Postgres)  │
├──────────────┤     ├──────────────┤     ├──────────────┤
│  shadcn/ui   │     │  10 Routers  │     │  RLS + Auth  │
│  Leaflet     │     │  6 Services  │     │  Storage     │
│  Recharts    │     │  Pydantic    │     └──────────────┘
│  Cytoscape   │     └──────────────┤           │
└──────────────┘           │       └──────────────┘
                           │       ┌──────────────┐
                           └──────▶│  Neo4j Aura  │
                                   │  (Graph DB)  │
                                   └──────────────┘
```

**Frontend**: React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui components, Leaflet maps, Recharts, Cytoscape.js.

**Backend**: FastAPI (Python 3.12), Pydantic schemas, JWT auth, rate limiting (slowapi), PDF generation (ReportLab), scikit-learn (IsolationForest).

**Database**: Supabase PostgreSQL with Row Level Security, service_role key for backend operations.

**Graph**: Neo4j AuraDB for ownership chain queries (Person → Plot relationships).

---

## 2. Integrations

### 2.1 Supabase (Auth, Database, Storage)

| Purpose | Mechanism | Key Used |
|---|---|---|
| User authentication | Backend `/auth/login` proxies email/password to Supabase auth endpoint. JWT tokens returned to frontend. | anon_key |
| Token validation | Backend `get_current_user()` calls Supabase `/auth/v1/user` to verify JWT, falls back to local JWT decode. | anon_key |
| Database operations | All CRUD via `supabase-py` client. Backend uses `get_supabase()` which uses **service_role** key to bypass RLS. | service_role |
| Storage (PDFs) | Certificate PDFs uploaded to `certificates` bucket. Public bucket for download. | service_role |
| Row Level Security | Applied on `users`, `searches`, `certificates`, `land_listings`. Service role bypasses RLS; anon/authenticated users are restricted to their own rows. | — |

**Auth flow:**
1. User submits email/password → `POST /auth/login` → backend calls Supabase Token endpoint → returns `access_token` + `refresh_token`
2. Tokens stored in frontend `localStorage` and `supabase.auth.session`
3. Every `apiFetch()` call attaches `Authorization: Bearer <token>` header
4. Backend `get_current_user()` dependency validates the token on every authenticated endpoint

**Auth guard pattern** (frontend): Every protected page checks `authLoading` and `user`:
```tsx
if (authLoading) return null;
if (!user) { navigate("/login"); return; }
```

### 2.2 Neo4j (Ownership Graph)

| File | Purpose |
|---|---|
| `backend/app/services/graph.py` | `GraphService` class wrapping Neo4j async driver. Methods: `get_ownership_chain()`, `get_person_plots()`, `sync_verification()`, `create_transfer()`. |
| `backend/app/routers/graph.py` | Two endpoints: `GET /api/v1/graph/ownership/{plot_ref}` and `GET /api/v1/graph/person/{name}`. |
| `backend/scripts/seed_neo4j.py` | Batch seed script: fetches all searches from Supabase, deduplicates, creates Person/Plot nodes with OWNED relationships. |

**Sync flow**: After each successful `POST /verify`, the verification router fire-and-forgets `graph_service.sync_verification(search_id, ...)` which `MERGE`s a `Plot:{ref}` node and a `Person:{name}` node, then creates an `OWNED` relationship.

**Graph model:**
```
(:Person {name}) -[:OWNED {from, to}]-> (:Plot {ref, district, land_type})
```

### 2.3 OpenStreetMap Nominatim (Geocoding)

- Endpoint: `GET /api/v1/gis/geocode?district=X&county=Y`
- Proxies to Nominatim API, returns `{ lat, lng, display_name, polygon_geojson }`
- Used by `PlotMap` component to display district boundary polygons
- Used by `LocationMap` in add-listing form for initial map center

### 2.4 UgNLIS (Mock)

- The verification service simulates UgNLIS data via `fetch_land_data()` which generates deterministic mock results based on the plot reference hash
- No real UgNLIS API integration in MVP — the `ANTIGRAVITY.md` contract allows mock data

### 2.5 Frontend Dependencies

| Library | Purpose |
|---|---|
| Leaflet / react-leaflet | Interactive maps on browse page, add-listing form, search results |
| Recharts | Market insights charts on buyer dashboard |
| Cytoscape.js | Ownership graph visualization on graph explorer page |
| TanStack Query | Server state management (minimal usage — contexts used instead) |
| Lucide React | Icon library |

---

## 3. Data Model

### 3.1 `public.users`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, references `auth.users.id` |
| roles | TEXT[] | Default `['land_buyer']`, CHECK at least 1 |
| created_at | TIMESTAMPTZ | Auto on insert |

**Trigger**: `on_auth_user_created` inserts a row into `public.users` when a new Supabase auth user signs up.

### 3.2 `public.searches`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, auto-generated |
| user_id | UUID | FK → `users.id` |
| plot_reference | TEXT | e.g. "VOL 312 FOL 4" |
| location | TEXT | District/location string |
| owner | TEXT | Registered owner name |
| title_status | TEXT | "CLEAN" or "ENCUMBERED" |
| encumbrances | JSONB | Array of encumbrance strings |
| transfer_count | INTEGER | Number of ownership transfers |
| last_transfer_date | TEXT | ISO date |
| risk_level | TEXT | LOW / MEDIUM / HIGH |
| price_min | NUMERIC | Estimated low price |
| price_max | NUMERIC | Estimated high price |
| land_type | TEXT | Freehold / Leasehold / Mailo |
| plot_size | NUMERIC | |
| plot_size_unit | TEXT | Decimals / Acres / Square Metres |
| fraud_score | NUMERIC | 0–100 |
| fraud_risk_level | TEXT | LOW / MEDIUM / HIGH |
| anomaly_flags | JSONB | Array of flag strings |
| ml_anomaly_score | NUMERIC | 0–1 from IsolationForest |
| created_at | TIMESTAMPTZ | |

### 3.3 `public.land_listings`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → `users.id` |
| search_id | UUID | FK → `searches.id`, nullable |
| listing_status | TEXT | PENDING / ACTIVE / SOLD |
| county | TEXT | |
| village | TEXT | |
| specific_area | TEXT | |
| price_min | NUMERIC | |
| price_max | NUMERIC | |
| description | TEXT | |
| contact_preference | TEXT | email / phone / both |
| contact_phone | TEXT | 10 digits starting with 07, regex-checked |
| views_count | INTEGER | Default 0 |
| latitude | NUMERIC | |
| longitude | NUMERIC | |
| district | TEXT | |
| parish | TEXT | |
| area_acres | NUMERIC | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### 3.4 `public.certificates`

| Column | Type |
|---|---|
| id | UUID PK |
| search_id | UUID FK → searches |
| user_id | UUID FK → users |
| hash | TEXT UNIQUE (SHA-256) |
| file_url | TEXT nullable |
| qr_code | TEXT |
| file_size | INTEGER |
| verification_url | TEXT |
| created_at | TIMESTAMPTZ |

### 3.5 `public.inquiries`

| Column | Type |
|---|---|
| id | UUID PK |
| listing_id | UUID FK → land_listings |
| buyer_name | TEXT |
| buyer_email | TEXT |
| buyer_phone | TEXT |
| message | TEXT |
| created_at | TIMESTAMPTZ |

### 3.6 `public.saved_properties`

| Column | Type |
|---|---|
| id | UUID PK |
| user_id | UUID FK → users |
| listing_id | UUID FK → land_listings |
| created_at | TIMESTAMPTZ |

---

## 4. Backend Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI entry, CORS, routers, rate limiter
│   ├── config.py            # Settings from env vars (Singleton)
│   ├── auth.py              # JWT validation dependency
│   ├── database.py          # Supabase client factories
│   ├── schemas.py           # All Pydantic models
│   ├── routers/
│   │   ├── auth.py          # POST /auth/login, POST /auth/register
│   │   ├── verify.py        # POST /verify, GET /verify/{id}
│   │   ├── certificates.py  # CRUD + hash verification
│   │   ├── history.py       # GET /history
│   │   ├── listings.py      # Full CRUD for land listings + seller contact
│   │   ├── inquiries.py     # Buyer → seller inquiries
│   │   ├── ml.py            # Fraud score computation
│   │   ├── gis.py           # Geocoding via Nominatim
│   │   ├── graph.py         # Neo4j ownership chain queries
│   │   └── analytics.py     # Market insights aggregations
│   └── services/
│       ├── verification.py   # UgNLIS mock, risk scoring, price estimation
│       ├── fraud_detection.py# Heuristic + ML fraud scoring
│       ├── certificate.py    # SHA-256 hashing, ReportLab PDF generation
│       ├── pricing_data.py   # 50+ district pricing dataset
│       ├── anomaly_detection.py # IsolationForest model
│       └── graph.py          # Neo4j service (sync + queries)
├── scripts/
│   ├── seed_listings.py      # 5 sample listings (3 clean, 2 flagged)
│   ├── seed_neo4j.py         # Bulk-load searches into Neo4j
│   └── backfill_fraud_scores.py  # Compute fraud scores for NULL rows
├── tests/
│   ├── test_verification.py  # 6 tests
│   ├── test_fraud_detection.py # 7 tests
│   ├── test_pricing.py       # 4 tests
│   └── test_anomaly_detection.py # 5 tests
├── supabase_schema.sql       # Core schema (users, searches, certs, listings)
├── supabase_schema_phase2.sql # Phase 2 migration (pricing, enhanced fields)
├── supabase_migration_gis.sql # GIS columns migration
├── supabase_migration_saved_properties.sql # Bookmark feature
├── requirements.txt
├── Dockerfile
├── pytest.ini
└── .env
```

### 4.1 Router Purpose

| Router | Auth Required | Public Endpoints | Key Functions |
|---|---|---|---|
| `auth` | No | POST /auth/login, /auth/register | Signup, login proxied to Supabase |
| `verify` | POST: Yes, GET: Yes | — | Full verification pipeline |
| `certificates` | POST/GET: Yes | GET /certificates/verify/{hash} | Generate + verify PDFs |
| `history` | Yes | — | Last 10 searches |
| `listings` | POST/PUT/PATCH: Yes | GET /listings, GET /listings/{id} | CRUD for land listings |
| `inquiries` | GET: Yes | POST /listings/{id}/inquiries | Buyer → seller contact |
| `ml` | Yes | — | Fraud score computation |
| `gis` | No | GET /api/v1/gis/geocode | Nominatim geocoding proxy |
| `graph` | Yes | — | Neo4j ownership queries |
| `analytics` | Yes | — | Market insights from searches |

### 4.2 Fraud Detection Pipeline

```
verify.py  ──▶  score_fraud()
                   │
                   ├── heuristic_rules()
                   │   ├── price/size ratio check
                   │   ├── transfer frequency check
                   │   ├── unknown district check
                   │   ├── recent suspicious transfer check
                   │   └── build anomaly_flags[]
                   │
                   ├── compute_ml_anomaly_score()
                   │   └── IsolationForest.predict(X)
                   │       X = [plot_size, asking_price, district_code,
                   │             land_type_code, transfer_count, days_since]
                   │       Returns normalized score [0, 1]
                   │
                   └── FraudScoreResult {
                         fraud_score: float,        # 0-100 weighted
                         risk_level: "LOW"|"MEDIUM"|"HIGH",
                         anomaly_flags: string[],
                         ml_anomaly_score: float     # 0-1
                       }
```

---

## 5. Frontend Structure

```
src/
├── main.tsx                  # Entry point
├── App.tsx                   # Router + Providers
├── index.css                 # Tailwind + CSS vars
├── lib/
│   ├── api.ts                # All API calls (typed)
│   └── supabase.ts           # Supabase client init
├── contexts/
│   ├── AuthContext.tsx        # Auth state management
│   └── SearchContext.tsx      # Verification search state
├── pages/
│   ├── Landing.tsx           # Public landing page
│   ├── Login.tsx             # Login/Register
│   ├── Dashboard.tsx         # Role router (buyer/seller)
│   ├── BuyerDashboard.tsx    # Buyer home + market insights
│   ├── SellerDashboard.tsx   # Seller home + listings
│   ├── LandSearch.tsx        # 3-step verification wizard
│   ├── BrowseLand.tsx        # Browse listed plots + detail panel
│   ├── AddListing.tsx        # Create/edit listing form
│   ├── Certificate.tsx       # View/download certificate
│   ├── SearchHistory.tsx     # Past searches table
│   ├── LandListings.tsx      # Alternative listings view
│   ├── GraphExplorer.tsx     # Ownership graph (Cytoscape)
│   └── NotFound.tsx          # 404
├── components/
│   ├── AppTopBar.tsx         # Navigation header
│   ├── ErrorBoundary.tsx     # Error boundary
│   ├── LocationMap.tsx       # Clickable map for add-listing
│   ├── PlotMap.tsx           # GeoJSON map for search results
│   ├── MapComponent.tsx      # Simpler map component
│   ├── PlotSureLogo.tsx      # Brand logo
│   ├── RiskBadge.tsx         # Risk level badge
│   ├── RoleBadge.tsx         # User role badge
│   └── NavLink.tsx           # Styled nav link
├── hooks/
│   ├── use-toast.ts          # Toast notification system
│   ├── use-mobile.tsx        # Mobile detection
│   └── use-require-role.ts   # Role guard
└── components/ui/            # 49 shadcn/ui components
```

### 5.1 Page Routing

| Route | Component | Auth Required | Role |
|---|---|---|---|
| `/` | Landing | No | — |
| `/login` | Login | No | — |
| `/dashboard` | Dashboard | Yes | Any |
| `/search` | LandSearch | Yes | Any |
| `/search?vol=X&fol=Y` | LandSearch | Yes | Auto-submits title search |
| `/search?district=X` | LandSearch | Yes | Pre-fills district + banner |
| `/browse` | BrowseLand | No (view), Yes (actions) | Any |
| `/sell` | SellerDashboard | Yes | land_seller |
| `/sell/add` | AddListing | Yes | land_seller |
| `/sell/edit/:id` | AddListing | Yes | land_seller |
| `/certificate/:id` | Certificate | Yes | Any |
| `/history` | SearchHistory | Yes | Any |
| `/graph` | GraphExplorer | Yes | Any |
| `/land` | LandListings | Yes | Any |

### 5.2 State Management

| Context | Purpose |
|---|---|
| `AuthContext` | `{ user, login, register, logout, loading }` — holds current user, provides auth methods |
| `SearchContext` | `{ searches, currentResult, addSearch, setCurrentResult, loading, error }` — manages verification state |

### 5.3 API Call Pattern

```
apiFetch<T>(path, options?)    → attaches JWT, 5s AbortController timeout
publicApiFetch<T>(path, options?) → no auth, no timeout
```

All API functions are typed with interfaces matching backend Pydantic schemas.

---

## 6. Key Flows

### 6.1 Land Verification (Search)

```
User enters plot details
        │
        ▼
Step 1: POST /verify
        │
        ├── Cache check (same plot_reference + user within 24h)
        ├── fetch_land_data()        ← mock UgNLIS
        ├── compute_risk()           ← deterministic rules
        ├── estimate_price()         ← pricing_data lookup
        ├── score_fraud()            ← heuristics + ML
        ├── Insert into searches table
        ├── Sync to Neo4j            ← fire-and-forget
        └── Return VerifyResponse
        │
        ▼
Step 2: Loading (animated)
        │
        ▼
Step 3: Show 4 result cards:
        - Title Verification
        - Price Estimate
        - Fraud Risk Assessment (with ML bar)
        - Transaction Cost Breakdown
        + PlotMap, Document Checklist
```

### 6.2 Browse Land → Verify Smart Flow

```
User clicks "Verify & Check Title" on a listing card or panel CTA
        │
        ▼
smartNavigate(listing)
        │
        ├── User not logged in → redirect to /login
        │
        ├── search_id exists + has volume/folio from plot_reference
        │   └── navigate to /search?vol=X&fol=Y&listing=Z
        │       → LandSearch auto-fills title fields, auto-submits immediately
        │
        └── no search_id
            └── navigate to /search?district=X&listing=Z
                → LandSearch pre-fills district, shows amber banner:
                  "The seller hasn't verified this plot on PlotSure yet.
                   Enter the Volume and Folio to verify it yourself."
```

### 6.3 Listing Creation

```
Seller clicks "Add Listing"
        │
        ▼
Step 1: Verify land → POST /verify → get verified data
        │
        ▼
Step 2: Fill listing details
        ├── County, Village, Specific Area (required)
        ├── GIS: Lat/Lng (with map picker), District, Parish, Area
        ├── Price range (UGX)
        ├── Description
        ├── Contact Phone Number (required, validated: /^07\d{8}$/)
        └── Contact Preference (email/phone/both)
        │
        ▼
POST /listings → Navigate to /sell (Seller Dashboard)
```

### 6.4 Certificate Generation

```
User clicks "Generate Certificate" on search results
        │
        ▼
POST /certificates/{search_id}
        │
        ├── generate_certificate_hash()
        │   └── SHA-256 of canonical JSON of search + timestamp + user_id
        │
        ├── generate_certificate_pdf()
        │   └── ReportLab A4 PDF with:
        │       certificate ID, date, plot ref, owner
        │       estimated price, risk assessment
        │       SHA-256 hash watermark
        │
        ├── Upload PDF to Supabase Storage (certificates bucket)
        ├── Insert into certificates table
        └── Return CertificateResponse
```

### 6.5 Browse Land — Detail Panel

```
User clicks "View Details" on listing card
        │
        ▼
Slide-in right panel opens
        │
        ├── HEADER: District · Village, status badge, close button
        ├── MAP: Leaflet at zoom 16, marker at lat/lng (or "Location not provided")
        ├── DETAILS: Location rows, Area, Price range, Description, Listed date
        ├── CONTACT SELLER:
        │   ├── GET /listings/{id}/seller → { name, email, contact_phone, contact_preference }
        │   ├── phone or both → show phone number + "Call Seller" + "WhatsApp"
        │   │   └── WhatsApp: wa.me/256{number_without_leading_0}
        │   ├── email or both → show email + "Email Seller"
        │   └── null → "Seller has not provided contact details yet."
        │
        └── CTA: "Verify & Check Title" → same smart flow as card button
```

---

## 7. Configuration & Environment

### 7.1 Required Variables

| Variable | File | Purpose |
|---|---|---|
| `SUPABASE_URL` | `backend/.env` | Supabase project URL |
| `SUPABASE_ANON_KEY` | `backend/.env`, `frontend/.env.local` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | `backend/.env` | Admin key (secret) |
| `JWT_SECRET` | `backend/.env` | For local JWT fallback |
| `FRONTEND_URL` | `backend/.env` | CORS origin |
| `BACKEND_PUBLIC_URL` | `backend/.env` | Public backend URL |
| `NEO4J_URI` | `backend/.env` or root `.env` | Neo4j connection string |
| `NEO4J_USERNAME` | `backend/.env` or root `.env` | Neo4j user |
| `NEO4J_PASSWORD` | `backend/.env` or root `.env` | Neo4j password |
| `VITE_SUPABASE_URL` | `.env.local` | Frontend Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | `.env.local` | Frontend Supabase anon key |
| `VITE_API_URL` | `.env.local` | Backend API base URL |

### 7.2 CORS

The backend allows origins from `FRONTEND_URL` and `http://localhost:5173` (and port 4173 for preview).

---

## 8. Scripts & Seed Data

### 8.1 `scripts/seed_listings.py`

Creates 5 sample ACTIVE listings for testing the browse page:

| # | District | Status | Fraud Level | Anomaly Flags |
|---|---|---|---|---|
| 1 | Kampala Central (Kololo) | Clean | LOW (score 5) | None |
| 2 | Wakiso (Kira) | Clean | LOW (score 3) | None |
| 3 | Mukono (Seeta) | Clean | LOW (score 2) | None |
| 4 | Kampala West (Lubiri) | Flagged | HIGH (score 85) | unusual_price_ratio, rapid_ownership_changes, high_risk_location |
| 5 | Kampala East (Bwaise) | Flagged | HIGH (score 95) | unusual_price_ratio, rapid_ownership_changes, suspiciously_low_price |

Usage: `cd backend && python3 scripts/seed_listings.py`

### 8.2 `scripts/backfill_fraud_scores.py`

One-time migration. Fetches all `searches` rows where `fraud_score IS NULL`, computes scores via `score_fraud()`, batch-upserts in groups of 200.

Usage: `cd backend && python3 scripts/backfill_fraud_scores.py`

### 8.3 `scripts/seed_neo4j.py`

Seeds Neo4j from existing Supabase searches. Deduplicates by (plot_reference, owner), creates Person and Plot nodes with OWNED relationships in batches of 500.

Usage: `cd backend && python -m backend.scripts.seed_neo4j`

---

## 9. Testing

| Test Suite | File | Tests | What it covers |
|---|---|---|---|
| Verification | `test_verification.py` | 6 | compute_risk() scenarios, build_plot_reference(), normalize_size_to_decimals() |
| Fraud Detection | `test_fraud_detection.py` | 7 | score_fraud() LOW/MEDIUM/HIGH, all 6 anomaly flag types, score capping |
| Pricing | `test_pricing.py` | 4 | District lookup, price calculation, growth rates, categories |
| ML Anomaly | `test_anomaly_detection.py` | 5 | Normal vs outlier scores, model caching, integration with fraud result |

Run: `cd backend && python3 -m pytest tests/ -v`

---

## 10. Recent Changes Log

| Date | Change | Files |
|---|---|---|
| 2026-05 | Edit mode bug: `formLoading` moved out of `finally` block to prevent empty-form flash on ownership check fail | `AddListing.tsx` |
| 2026-05 | Browse Land panel: slide-in detail panel with Leaflet map, location details, seller contact (Call/WhatsApp/Email), smart Verify & Check Title flow | `BrowseLand.tsx` |
| 2026-05 | Smart verify flow: auto-submit title search from browse, pre-fill district + amber banner for unverified plots | `LandSearch.tsx` |
| 2026-05 | Seller contact endpoint: `GET /listings/{id}/seller` fetches contact_phone from listing + email from auth.users | `listings.py`, `api.ts` |
| 2026-05 | Contact phone field added to listing form: validation (regex `/^07\d{8}$/`), stored in `land_listings.contact_phone` | `AddListing.tsx`, `schemas.py`, `api.ts` |
| 2026-05 | Contact phone column added to DB schema with CHECK constraint | `supabase_schema.sql`, `supabase_schema_phase2.sql` |
| 2026-05 | Contact Seller section in panel: phone row with Call + WhatsApp, email row, fallback text | `BrowseLand.tsx` |
| 2026-05 | Seed script: 5 listings (3 clean Kololo/Kira/Seeta, 2 flagged Lubiri/Bwaise) | `seed_listings.py` |
| 2026-04 | Fraud score backfill script: two-phase fetch-then-upsert, all 10,003 rows backfilled | `backfill_fraud_scores.py` |
| 2026-04 | `ml_anomaly_score` column added to searches table | `supabase_schema.sql`, `supabase_schema_phase2.sql` |
| 2026-04 | IsolationForest anomaly detection service with lazy-loaded model | `anomaly_detection.py` |
| 2026-04 | Market insights analytics endpoint + buyer dashboard section | `analytics.py`, `BuyerDashboard.tsx`, `api.ts` |
| 2026-04 | `getListings`/`getListing` switched to `publicApiFetch` (endpoints are public) | `api.ts` |
| 2026-04 | SellerDashboard: fixed missing Info import + inquiry state declarations | `SellerDashboard.tsx` |
| 2026-04 | Browse Land page: filter bar, card grid, pagination, role-based CTAs | `BrowseLand.tsx` |
