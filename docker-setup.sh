#!/usr/bin/env bash
# =============================================================================
# Local Docker Setup & Deployment Script for Sovereign Control Tower
# =============================================================================

set -eo pipefail

echo "==================================================================="
echo "  Sovereign Fiscal, Debt Dynamics & Derivatives Dashboard"
echo "  Local-First Air-Gapped Docker Orchestration"
echo "==================================================================="

# Check for Docker and Docker Compose
command -v docker >/dev/null 2>&1 || { echo >&2 "Error: docker is required but not installed. Aborting."; exit 1; }
command -v docker compose >/dev/null 2>&1 || { echo >&2 "Error: 'docker compose' is required but not installed. Aborting."; exit 1; }

# Step 1: Initialize local environment file
if [ ! -f .env ]; then
  echo "[-] Creating .env from .env.example..."
  cp .env.example .env
fi

# Step 2: Build and start the containerized stack
echo "[+] Starting Docker Compose services (Control Tower, TimescaleDB, Ollama)..."
docker compose up -d --build

echo "[+] Waiting for TimescaleDB to initialize health state..."
until [ "`docker inspect -f {{.State.Health.Status}} sovereign-timescaledb 2>/dev/null`"=="healthy" ]; do
    sleep 2
    echo "    Waiting for PostgreSQL / TimescaleDB..."
done
echo "[+] TimescaleDB is healthy and initialized with schema!"

# Step 3: Check Ollama and pull local model weights
echo "[+] Pulling quantized reasoning model into Ollama container..."
docker exec -it sovereign-ollama ollama pull llama3.1:8b-instruct || {
  echo "[!] Note: Could not auto-pull model. You can manually run:"
  echo "    docker exec -it sovereign-ollama ollama pull llama3.1:70b-instruct-q4_K_M"
}

echo "==================================================================="
echo "  Stack successfully running!"
echo "  - Web Dashboard:     http://localhost:3000"
echo "  - TimescaleDB:       localhost:5432 (User: postgres / DB: sovereign_db)"
echo "  - Ollama Engine:     http://localhost:11434"
echo "==================================================================="
