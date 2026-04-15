# ============================================
# PlotSure Backend Dockerfile
# ============================================
# Build: docker build -t plotsure-backend ./backend
# Run:   docker run -p 8000:8000 --env-file ./backend/.env plotsure-backend
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies for reportlab (PDF generation) + curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]