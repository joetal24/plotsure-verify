# ============================================
# PlotSure Backend — Dockerfile
# ============================================
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast dependency installation
RUN pip install --no-cache-dir uv

# Set working directory
WORKDIR /app

# Copy dependency file first for better caching
COPY backend/requirements.txt .

# Install Python dependencies via uv
RUN uv pip install --system --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/app/ ./app/

# Copy scripts (used by backfill_fraud_scores)
COPY backend/scripts/ ./scripts/

# Expose port
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]