# ============================================
# PlotSure Makefile
# For easier development commands
# ============================================

# Colors
GREEN = \033[0;32m
YELLOW = \033[0;33m
NC = \033[0m

# Default target
help:
	@echo "$(GREEN)PlotSure Development Commands$(NC)"
	@echo ""
	@echo "  $(YELLOW)make install$(NC)   - Install all dependencies"
	@echo "  $(YELLOW)make backend-install$(NC) - Create backend venv and install deps"
	@echo "  $(YELLOW)make dev$(NC)       - Start development servers"
	@echo "  $(YELLOW)make build$(NC)      - Build Docker containers"
	@echo "  $(YELLOW)make start$(NC)      - Start Docker containers"
	@echo "  $(YELLOW)make stop$(NC)       - Stop Docker containers"
	@echo "  $(YELLOW)make supabase-local-start$(NC) - Start local Supabase via CLI"
	@echo "  $(YELLOW)make supabase-local-stop$(NC)  - Stop local Supabase via CLI"
	@echo "  $(YELLOW)make clean$(NC)      - Clean up containers and volumes"
	@echo "  $(YELLOW)make logs$(NC)       - View logs"
	@echo "  $(YELLOW)make test$(NC)       - Run tests"
	@echo "  $(YELLOW)make lint$(NC)      - Run linters"
	@echo ""

# Install dependencies
install:
	@echo "Installing frontend dependencies..."
	npm install
	@$(MAKE) backend-install

# Install backend dependencies inside a local virtual environment
backend-install:
	@echo "Creating backend virtual environment (.venv)..."
	cd backend && python3 -m venv .venv
	@echo "Installing backend dependencies in .venv..."
	cd backend && . .venv/bin/activate && pip install -r requirements.txt

# Development server (requires Supabase)
dev:
	@echo "Starting development servers..."
	@echo "Backend: http://localhost:8000"
	@echo "Frontend: http://localhost:5173"
	@echo "API Docs: http://localhost:8000/docs"
	docker-compose up

# Local Supabase helpers (requires Supabase CLI installed)
supabase-local-start:
	supabase start

supabase-local-stop:
	supabase stop

# Build Docker containers
build:
	docker-compose up --build

# Start containers
start:
	docker-compose up -d

# Stop containers
stop:
	docker-compose down

# Clean up
clean:
	docker-compose down -v
	rm -rf backend/__pycache__
	rm -rf backend/.venv
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true

# View logs
logs:
	docker-compose logs -f

# Test
test:
	npm run test
	cd backend && pytest

# Lint
lint:
	npm run lint
	cd backend && ruff check .

.PHONY: help install backend-install dev build start stop supabase-local-start supabase-local-stop clean logs test lint