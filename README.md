# PlotSure — Land Verification Platform for Uganda

A land verification platform focused on Uganda. Enables users to verify land ownership, assess fraud risk, estimate price ranges, and generate tamper-evident certificates.

## Tech Stack

- **Frontend**: React + Vite + TypeScript + shadcn/ui + Tailwind CSS
- **Backend**: FastAPI (Python)
- **Auth & Database**: Supabase (PostgreSQL + Auth + Storage)

## Quick Start (Docker)

### Prerequisites

- [Docker](https://docker.com) installed
- [Docker Compose](https://docs.docker.com/compose/) installed

### Steps

1. **Create a Supabase project**

   - Go to [supabase.com](https://supabase.com) and sign up
   - Create a new project
   - Go to **Settings → API** and copy your credentials

2. **Configure environment variables**

   ```bash
   # Frontend (root)
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials

   # Backend
   cp backend/.env.example backend/.env
   # Edit backend/.env with your Supabase credentials
   ```

3. **Set up the database**

   - Go to Supabase Dashboard → **SQL Editor**
   - Copy and run the contents of `backend/supabase_schema.sql`
   - Go to **Storage** → **New Bucket**
   - Create a bucket named `certificates` and set it to **public**

4. **Run the application**

   ```bash
   docker-compose up --build
   ```

5. **Access the application**

   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## Quick Start (Local Development)

### Backend

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Copy env file
cp .env.example .env

# Run the server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
# Install dependencies
npm install

# Copy env file
cp .env.example .env.local

# Run the development server
npm run dev
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

## Environment Variables

### Frontend (.env.local)

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:8000
```

### Backend (backend/.env)

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret
FRONTEND_URL=http://localhost:5173
```

## Project Structure

```
plotsure-verify/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app
│   │   ├── config.py        # Settings
│   │   ├── auth.py         # JWT validation
│   │   ├── database.py     # Supabase client
│   │   ├── schemas.py     # Pydantic models
│   │   ├── routers/       # API endpoints
│   │   └── services/     # Business logic
│   ├── Dockerfile
│   ├── requirements.txt
│   └── supabase_schema.sql
├── src/                    # React frontend
├── docker-compose.yml
├── Dockerfile.frontend
├── .env.example
└── README.md
```

## License

MIT