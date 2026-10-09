# Sovereign Fiscal, Debt Dynamics & Derivatives Control Tower

An institutional-grade sovereign debt management, fiscal sustainability analysis (DSA), yield curve modeling, derivatives portfolio risk engine, and real-time sovereign surveillance platform.

---

## 🏛️ Executive Overview

The **Sovereign Control Tower** is engineered for central banks, ministries of finance, sovereign debt management offices (DMOs), and institutional fixed-income macro desks. It provides a local-first, air-gapped architecture that combines quantitative fiscal modeling with local LLM-assisted policy analysis, TimescaleDB time-series storage, and live macroeconomic data feeds (IMF SDMX-JSON, FRED, World Bank).

---

## 🚀 Key Modules & Capabilities

### 1. Fiscal Projections & Debt Sustainability Analysis (DSA)
- Multi-year debt-to-GDP trajectory modeling under IMF-style baseline and stress scenarios.
- Dynamic **$(r - g)$ differential** calculations (real interest rate minus real GDP growth rate).
- Primary balance sensitivity fan charts and stochastic debt path simulations.
- Sovereign entity profiles across frontier, emerging market, and developed economies (e.g., Alpha, Beta, Gamma, Delta).

### 2. Yield Curves & Sovereign Debt Risk Heatmap
- Full term structure sovereign yield curve visualization (3M to 30Y) against benchmark reference curves.
- Multi-metric global risk heatmap analyzing Yield, CDS Spread, Debt/GDP, and Inflation across tenors and sovereigns.
- **Threshold-Based Alert System**: Configurable alert triggers highlighting sovereign yield spikes exceeding user-defined tolerances over the baseline.

### 3. Derivatives Portfolio & Risk Management
- Sovereign Interest Rate Swaps (IRS) and Cross-Currency Interest Rate Swaps (CCIRS) ledger.
- Mark-to-market (MTM) net present value computations, Credit Support Annex (CSA) collateral threshold monitoring, and SOFR/EURIBOR fixings.
- Duration gap and interest rate sensitivity analytics.

### 4. Debt Restructuring & Collective Action Clause (CAC) Engine
- Sovereign bond restructuring simulation with Single-Limb and Two-Limb aggregated voting thresholds.
- Net Present Value (NPV) haircut calculations, face value write-down modeling, coupon step-up schedules, and maturity extensions.
- Exit yield scenarios and creditor holdout risk assessment.

### 5. Correlation Matrix & Risk Clusters
- Cross-asset correlation heatmap analyzing sovereign bond yields, CDS spreads, FX volatility, inflation, and policy rates.
- Risk clustering algorithms to detect contagion channels and systemic co-movements across emerging and peripheral debt.

### 6. Global Risk Watchlist (Sidebar Widget)
- Real-time global volatility indices: **MOVE** (US Treasury Volatility), **VIX** (Equity Risk-Off), **CVIX** (G7/EM Currency Volatility), and **VSTOXX** (Euro Sovereign Debt Stress).
- Live sovereign spread changes (1D delta in bps) comparing the active sovereign to peer medians.
- Synchronous widening vs. idiosyncratic decoupling indicators and peer dispersion meters.
- Interactive live feed controls (Pause, Resume, Instant Refresh).

### 7. IMF SDMX-JSON Real-Time Data Ingestion
- Dedicated service layer consuming the official IMF SDMX-JSON REST API (`dataservices.imf.org`) for General Government Gross Debt (% of GDP).
- Grounded baselines with fallback caching and automated Debt Sustainability Framework (DSF) risk grading.

### 8. Air-Gapped Local LLM Inference Core
- Embedded Ollama proxy (`/api/ollama/*`) connecting to local LLM models (e.g., `llama3.1:8b-instruct` or `llama3.1:70b-instruct`).
- Zero cloud data leakage: confidential sovereign fiscal metrics and debt restructuring models remain strictly on-premise.

---

## 🐳 Docker Deployment Guide

The platform is fully containerized and deployable via standard Docker and Docker Compose.

### Architecture Overview

```
                        ┌────────────────────────────────────────┐
                        │          Browser Client (Port 3000)    │
                        └───────────────────┬────────────────────┘
                                            │ HTTP / WebSocket
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Docker Network: sovereign-net                                                   │
│                                                                                 │
│  ┌─────────────────────────┐  Internal   ┌────────────────────────────────────┐ │
│  │ sovereign-control-tower │────────────▶│ sovereign-timescaledb              │ │
│  │ Node 22 Alpine Runtime  │             │ PostgreSQL 16 + TimescaleDB        │ │
│  │ Port 3000 (Non-root)    │             │ Port 5432 (Auto-seeded schema)     │ │
│  └────────────┬────────────┘             └────────────────────────────────────┘ │
│               │ Internal Proxy                                                  │
│               ▼                                                                 │
│  ┌─────────────────────────┐                                                    │
│  │ sovereign-ollama        │                                                    │
│  │ Ollama LLM Inference    │                                                    │
│  │ Port 11434 (Air-gapped) │                                                    │
│  └─────────────────────────┘                                                    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Quick Start (Automated Script)

On Linux or macOS with Docker and Docker Compose installed:

```bash
chmod +x docker-setup.sh
./docker-setup.sh
```

This script will:
1. Copy `.env.example` to `.env` if not present.
2. Build the multi-stage production Docker container.
3. Start TimescaleDB with the pre-seeded schema (`init-db.sql`).
4. Pull the local reasoning model (`llama3.1:8b-instruct`) inside Ollama.
5. Launch the Web UI at **`http://localhost:3000`**.

---

### Manual Docker Compose Deployment

#### 1. Configure Environment Variables
```bash
cp .env.example .env
```
*(Optional)* Add your free Federal Reserve Economic Data (FRED) API key in `.env`:
```env
FRED_API_KEY="your_api_key_here"
VITE_FRED_API_KEY="your_api_key_here"
```

#### 2. Build and Start Services
```bash
docker compose up -d --build
```

#### 3. Verify Container Status & Health
```bash
docker compose ps
```
Expected output:
```
NAME                      IMAGE                              COMMAND                   SERVICE         STATUS
sovereign-control-tower   sovereign-control-tower-frontend   "docker-entrypoint.s…"    control-tower   Up (healthy)
sovereign-timescaledb     timescale/timescaledb:latest-pg16  "docker-entrypoint.s…"    timescaledb     Up (healthy)
sovereign-ollama          ollama/ollama:latest               "/bin/ollama serve"       ollama          Up
```

#### 4. Pull Local LLM Model Weights
```bash
docker exec -it sovereign-ollama ollama pull llama3.1:8b-instruct
```

#### 5. Access Services
- **Control Tower Web UI**: [http://localhost:3000](http://localhost:3000)
- **Healthcheck Endpoint**: [http://localhost:3000/health](http://localhost:3000/health)
- **TimescaleDB / Postgres**: `localhost:5432` (`postgres` / `sovereign_secret` / `sovereign_db`)
- **Ollama Engine**: [http://localhost:11434](http://localhost:11434)

---

### Standalone Docker Container (Single Container Build)

If you wish to deploy only the frontend and API proxy container without the database and Ollama sidecars:

```bash
# Build the standalone container
docker build -t sovereign-control-tower:latest .

# Run the container
docker run -d \
  --name sovereign-control-tower \
  -p 3000:3000 \
  -e PORT=3000 \
  -e NODE_ENV=production \
  sovereign-control-tower:latest
```

Open `http://localhost:3000` in your browser.

---

## 🛠️ Local Development (Without Docker)

### Prerequisites
- Node.js 20+ or 22+
- npm or bun

### Setup Instructions
```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Start the Vite development server (port 3000)
npm run dev

# 3. Type-check & lint
npm run lint

# 4. Build production static bundle
npm run build

# 5. Run production server
npm start
```

---

## 🔒 Security & Air-Gapped Compliance

1. **Non-Root Execution**: The production Docker container executes as the unprivileged `node` user (UID 1000).
2. **Multi-Stage Build**: Development toolchains and raw TypeScript source files are omitted from the production image.
3. **Zero Telemetry**: TimescaleDB telemetry is explicitly disabled (`TIMESCALEDB_TELEMETRY=off`).
4. **Air-Gapped LLM Operation**: The local Ollama proxy routes all LLM prompts within the internal Docker bridge network without transmitting data to third-party AI endpoints.

---

## 📁 Repository Structure

```
├── Dockerfile              # Multi-stage production container build (Alpine Node 22)
├── docker-compose.yml      # Orchestration for Control Tower, TimescaleDB & Ollama
├── docker-server.cjs       # Hardened Express production static server & API proxy
├── docker-setup.sh         # One-click bootstrap script for local Docker environment
├── init-db.sql             # SQL schema & seed datasets for TimescaleDB / PostgreSQL
├── .env.example            # Environment variable configuration template
├── .dockerignore           # Exclusions for container build efficiency
├── package.json            # Project dependencies and operational scripts
├── src/
│   ├── components/         # Tab modules (DSA, Yield Curves, Restructuring, Derivatives, Correlation, Watchlist)
│   ├── engine/             # Quantitative engines (Fiscal DSA, Yield curves, Restructuring, Derivatives)
│   ├── services/           # IMF SDMX-JSON & macroeconomic ingestion services
│   ├── types/              # Sovereign data types and schema contracts
│   └── data/               # Seed datasets and sovereign benchmarks
└── vite.config.ts          # Vite build configuration
```

---

## 📄 License

Proprietary & Confidential. Designed for institutional sovereign debt research and policy simulation.
