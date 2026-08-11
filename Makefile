.DEFAULT_GOAL := help

NPM := npm
EFFECT ?= artistic
PHOTO ?= 1
X ?=
AI_DEBUG_FLAG := $(if $(X),-X,)

.PHONY: help install build build-backend build-frontend \
	dev dev-backend dev-frontend start clean clean-all \
	db-up db-down db-clean db-migrate db-seed db-studio

help: ## Show this help
	@echo "Available targets:"
	@echo "  install         Install all workspace dependencies"
	@echo "  build           Build backend and frontend"
	@echo "  build-back   	 Build backend only"
	@echo "  build-front	 Build frontend only"
	@echo "  dev             Run backend and frontend dev servers together"
	@echo "  dev-back	     Run backend dev server (http://localhost:4000)"
	@echo "  dev-front	     Run frontend dev server (http://localhost:5173)"
	@echo "  ai              Run ai-photo-test (PHOTO=<n> for samples/photo<n>.jpg, default 1; EFFECT=<effect>, X=1 to log full request/response)"
	@echo "  start           Run backend from its production build (runs 'build-back' first)"
	@echo "  clean           Remove build artifacts (backend/dist, frontend/dist)"
	@echo "  clean-all       clean + remove all node_modules"
	@echo "  db-up           Start local MariaDB (docker compose)"
	@echo "  db-down         Stop local MariaDB"
	@echo "  db-clean        Reset the local database from scratch (all data lost)"
	@echo "  db-migrate      Run Prisma migrations (dev) against local MariaDB"
	@echo "  db-seed         Seed the database (admin user, provedores, categorias)"
	@echo "  db-studio       Open Prisma Studio"

install: ## Install dependencies for both workspaces
	$(NPM) install

build: build-backend build-frontend ## Build backend and frontend

build-backend: ## Build backend only
	$(NPM) run build --workspace backend

build-frontend: ## Build frontend only
	$(NPM) run build --workspace frontend

build-ai: ## Build ai-photo-test only
	$(NPM) run build --workspace ai-photo-test

dev-backend: ## Run backend dev server
	$(NPM) run dev --workspace backend

dev-frontend: ## Run frontend dev server
	$(NPM) run dev --workspace frontend

dev: ## Run backend and frontend dev servers together
	@trap 'kill 0' EXIT INT TERM; \
	$(NPM) run dev --workspace backend & \
	$(NPM) run dev --workspace frontend & \
	wait

start: build-backend ## Run backend production build
	$(NPM) run start --workspace backend

ai: build-ai ## Run ai-photo-test with a sample image (PHOTO=<n>, default 1; EFFECT=<effect>, default artistic; X=1 to log full request/response)
	$(NPM) run generate --workspace ai-photo-test -- --image samples/photo$(PHOTO).jpg --effect $(EFFECT) $(AI_DEBUG_FLAG)
#	$(NPM) run generate --workspace ai-photo-test -- --image samples/photo$(PHOTO).jpg --effect $(EFFECT) --provider gemini $(AI_DEBUG_FLAG)

clean: ## Remove build artifacts
	rm -rf backend/dist frontend/dist

clean-all: clean ## Remove build artifacts and all node_modules
	rm -rf node_modules backend/node_modules frontend/node_modules

db-up: ## Start local mysql (docker compose)
	docker compose up -d mysql

db-down: ## Stop local MariaDB
	docker compose stop mysql

db-clean: db-up ## Reset the local database: drops it, recreates it, and reapplies all migrations (all data lost)
	$(NPM) run prisma:reset --workspace backend

db-migrate: ## Run Prisma migrations (dev) against local DB
	$(NPM) run prisma:migrate --workspace backend

db-seed: ## Seed the database (admin user, provedores, categorias)
	$(NPM) run prisma:seed --workspace backend

db-studio: ## Open Prisma Studio
	$(NPM) run prisma:studio --workspace backend
