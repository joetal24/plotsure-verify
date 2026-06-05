# PlotSure — Land Verification Platform for Uganda

A land verification platform focused on Uganda. Enables users to verify land ownership, assess fraud risk, estimate price ranges, and generate tamper-evident certificates.

## Tech Stack

- **Frontend**: React + Vite + TypeScript + shadcn/ui + Tailwind CSS
- **Backend**: FastAPI (Python)
- **Auth & Database**: Managed PostgreSQL + JWT auth + object storage

## Quick Start (Docker)

### Prerequisites

- [Docker](https://docker.com) installed
- [Docker Compose](https://docs.docker.com/compose/) installed

### Steps

1. **Configure environment variables**

   ```bash
   # Frontend (root)
   cat > .env.local << 'EOF'
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_API_URL=http://localhost:8000
   EOF

   # Backend
   cat > backend/.env << 'EOF'
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   JWT_SECRET=your-jwt-secret
   FRONTEND_URL=http://localhost:5173
   BACKEND_PUBLIC_URL=http://localhost:8000
   EOF
   ```

2. **Set up the database and storage**

   - Run the SQL in `backend/supabase_schema.sql` on your PostgreSQL database
   - Create a public storage bucket named `certificates`

3. **Run the application**

   ```bash
   docker-compose up --build
   ```

4. **Access the application**

   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## Quick Start (Local Development)

### Backend

```bash
cd backend

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Create env file
cat > .env << 'EOF'
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret
FRONTEND_URL=http://localhost:5173
BACKEND_PUBLIC_URL=http://localhost:8000
EOF

# Run the server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
# Install dependencies
npm install

# Create env file
cat > .env.local << 'EOF'
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:8000
EOF

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
BACKEND_PUBLIC_URL=http://localhost:8000
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
└── README.md
```

## Event-Driven Fraud Detection (Kafka)

PlotSure uses Apache Kafka (via **Redpanda** locally, **Upstash Kafka** in production) for async fraud detection.

### Architecture

```
POST /verify  →  Supabase write (immediate)
            ↘  Kafka publish (fire-and-forget)
                              ↘  fraud-worker consumes
                                  ├── Neo4j circular ownership check
                                  ├── IsolationForest ML check
                                  └── Updates Supabase fraud_status
```

### Running Kafka locally

```bash
# Start Redpanda + workers
docker compose --profile fraud-worker up --build
```

This starts:
- `redpanda` — Kafka-compatible broker on port 9092
- `fraud-worker` — Consumes `fraud.check.queue`, runs Neo4j + ML, updates Supabase
- `dlq-handler` — Consumes `fraud.check.failed`, stores failures in `fraud_check_failures` table

### Topics

| Topic | Purpose |
|---|---|
| `fraud.check.queue` | Verification events awaiting fraud analysis |
| `fraud.check.failed` | Messages that failed processing (DLQ) |

### Fraud Status Flow

```
pending → processing → verified  (clean)
                     → flagged   (suspicious — see fraud_details)
                     → failed    (error occurred)
```

### Status Polling

After `POST /verify`, poll `GET /verify/{id}/status`:

```json
{
  "verification_id": "uuid",
  "status": "processing" | "verified" | "flagged" | "failed",
  "fraud_details": { ... }  // only present when flagged
}
```

### Deploying to production with Upstash

1. Create a Kafka cluster on [Upstash](https://upstash.com)
2. Set environment variables:

```bash
KAFKA_BOOTSTRAP_SERVERS=<upstash-endpoint>:9092
KAFKA_TOPIC_FRAUD_CHECK=fraud.check.queue
KAFKA_TOPIC_DEAD_LETTER=fraud.check.failed
KAFKA_GROUP_ID=plotsure-fraud-workers
```

3. Deploy the fraud worker as a separate service (Render worker, Railway service, etc.):

```bash
python -m app.workers.fraud_worker
```

4. Deploy the DLQ handler similarly:

```bash
python -m app.workers.dlq_handler
```

### Fallback Behavior

If Kafka is unreachable, the producer falls back to running the fraud check synchronously — the `/verify` endpoint never breaks.

### Admin Retry

Failed fraud checks can be manually retried:

```bash
curl -X POST /admin/retry/{verification_id} \
  -H "Authorization: Bearer <admin-token>"
```

Requires `admin` role.

## License

MIT