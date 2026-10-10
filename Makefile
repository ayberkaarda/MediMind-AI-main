.DEFAULT_GOAL := help

.PHONY: help setup dev-backend dev-frontend train test test-backend test-frontend lint format typecheck docker-build docker-up docker-down clean

help: ## Show available targets
	@grep -E '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "%-16s %s\n", $$1, $$2}'

setup: ## Install backend, frontend, and pre-commit dependencies
	cd backend && uv sync --all-groups
	cd frontend && npm ci
	pre-commit install

dev-backend: ## Run the backend development server
	cd backend && uv run uvicorn app.main:app --reload --port 8000

dev-frontend: ## Run the frontend development server
	cd frontend && npm run dev

train: ## Train the disease model
	cd backend && uv run medimind-train

test: ## Run backend and frontend tests
	$(MAKE) test-backend
	$(MAKE) test-frontend

test-backend: ## Run backend tests with coverage
	cd backend && uv run pytest -q --cov=app --cov-report=term-missing

test-frontend: ## Run frontend tests
	cd frontend && npm test -- --run

lint: ## Run backend and frontend lint and format checks
	cd backend && uv run ruff check .
	cd backend && uv run ruff format --check .
	cd backend && uv run mypy app
	cd frontend && npm run lint
	cd frontend && npm run format:check

format: ## Format backend and frontend files
	cd backend && uv run ruff format .
	cd backend && uv run ruff check --fix .
	cd frontend && npm run format

typecheck: ## Check backend and frontend types
	cd backend && uv run mypy app
	cd frontend && npm run typecheck

docker-build: ## Build service images
	docker compose build

docker-up: ## Build and start services
	docker compose up --build -d

docker-down: ## Stop services
	docker compose down

clean: ## Remove caches and build output
	rm -rf backend/.pytest_cache backend/.mypy_cache backend/.ruff_cache backend/htmlcov backend/.coverage backend/dist backend/build frontend/.vite frontend/coverage frontend/dist
