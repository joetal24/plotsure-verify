# PlotSure Backend

FastAPI backend for the PlotSure land verification platform.

## Quick Start

### 1. Create Python virtual environment

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to **SQL Editor** and run the contents of `supabase_schema.sql`
3. Go to **Storage** and create a bucket named `certificates` (set to public)
4. Go to **Settings > API** and copy:
   - Project URL → `SUPABASE_URL`
   - `anon` key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
5. Go to **Settings > API > JWT Settings** and copy the JWT secret → `JWT_SECRET`

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

### 4. Run the server

```bash
uvicorn app.main:app --reload --port 8000
```

### 5. Configure frontend

In the project root:
```bash
cp .env.example .env.local
# Edit .env.local with:
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key
# VITE_API_URL=http://localhost:8000
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/verify` | ✅ JWT | Verify a land plot |
| GET | `/verify/{id}` | ✅ JWT | Get verification result |
| GET | `/history` | ✅ JWT | Get user's search history |
| POST | `/certificates/{search_id}` | ✅ JWT | Generate certificate |
| GET | `/certificates/{id}` | ✅ JWT | Get certificate |
| GET | `/certificates/verify/{hash}` | ❌ Public | Verify certificate by hash |
| GET | `/health` | ❌ Public | Health check |

## Architecture

```
backend/
├── app/
│   ├── main.py          # FastAPI app, CORS, router mounting
│   ├── config.py        # Settings from env vars  
│   ├── auth.py          # JWT validation dependency
│   ├── database.py      # Supabase client
│   ├── schemas.py       # Pydantic models
│   ├── routers/
│   │   ├── verify.py        # POST/GET /verify
│   │   ├── certificates.py  # Certificate CRUD + verify
│   │   └── history.py       # GET /history
│   └── services/
│       ├── verification.py  # Risk scoring + price estimation
│       └── certificate.py   # Hash + PDF generation
└── supabase_schema.sql  # Database migration
```
