import React, { useState, useEffect } from 'react';
import {
  loadEndpointConfig,
  saveEndpointConfig,
  testOllamaConnection,
  fetchFredSeries,
  fetchWorldBankData,
  fetchDBnomicsData,
  EndpointConfig,
  DEFAULT_CONFIG,
} from '../services/apiService';
import {
  Server,
  Activity,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Code,
  Terminal,
  Cpu,
  Database,
  ArrowRight,
  Zap,
} from 'lucide-react';

export const DockerApiGatewayTab: React.FC = () => {
  const [config, setConfig] = useState<EndpointConfig>(loadEndpointConfig());
  const [isSaved, setIsSaved] = useState<boolean>(false);
  
  // Connection states
  const [ollamaStatus, setOllamaStatus] = useState<{ testing: boolean; online?: boolean; msg?: string }>({ testing: false });
  const [fredStatus, setFredStatus] = useState<{ testing: boolean; online?: boolean; msg?: string }>({ testing: false });
  const [wbStatus, setWbStatus] = useState<{ testing: boolean; online?: boolean; msg?: string }>({ testing: false });
  const [dbnomicsStatus, setDbnomicsStatus] = useState<{ testing: boolean; online?: boolean; msg?: string }>({ testing: false });

  // Live series test states
  const [selectedSeries, setSelectedSeries] = useState<string>('GS10');
  const [fetchedData, setFetchedData] = useState<any[] | null>(null);
  const [isFetchingData, setIsFetchingData] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Docker files tab
  const [activeFileTab, setActiveFileTab] = useState<'compose' | 'dockerfile' | 'sql' | 'setup'>('compose');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Save handler
  const handleSave = () => {
    saveEndpointConfig(config);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  // Test Ollama
  const testOllama = async () => {
    setOllamaStatus({ testing: true });
    const res = await testOllamaConnection(config.ollamaHost);
    setOllamaStatus({ testing: false, online: res.online, msg: res.message });
  };

  // Test FRED
  const testFred = async () => {
    setFredStatus({ testing: true });
    if (!config.fredApiKey) {
      setFredStatus({
        testing: false,
        online: false,
        msg: 'Please provide a FRED API Key to test live queries.',
      });
      return;
    }
    const res = await fetchFredSeries('GS10', config.fredApiKey, 3);
    if (res.success && res.data) {
      setFredStatus({
        testing: false,
        online: true,
        msg: `Connected! Latest 10Y Yield observation: ${res.data[res.data.length - 1]?.value}% (${res.data[res.data.length - 1]?.date})`,
      });
    } else {
      setFredStatus({
        testing: false,
        online: false,
        msg: res.error || 'Connection failed',
      });
    }
  };

  // Test World Bank
  const testWorldBank = async () => {
    setWbStatus({ testing: true });
    const res = await fetchWorldBankData('BRA', 'GC.DOD.TOTL.GD.ZS');
    if (res.success && res.data) {
      setWbStatus({
        testing: false,
        online: true,
        msg: `Connected! Received ${res.data.length} historical debt ratio points for ${res.countryName}`,
      });
    } else {
      setWbStatus({
        testing: false,
        online: false,
        msg: res.error || 'World Bank API query failed',
      });
    }
  };

  // Test DBnomics
  const testDBnomics = async () => {
    setDbnomicsStatus({ testing: true });
    const res = await fetchDBnomicsData();
    if (res.success) {
      setDbnomicsStatus({
        testing: false,
        online: true,
        msg: 'Connected! DBnomics series repository endpoint responsive.',
      });
    } else {
      setDbnomicsStatus({
        testing: false,
        online: false,
        msg: res.error || 'DBnomics request timed out',
      });
    }
  };

  // Run live series fetch
  const handleFetchSeries = async () => {
    setIsFetchingData(true);
    setFetchError(null);
    setFetchedData(null);

    if (selectedSeries.startsWith('WB_')) {
      const code = selectedSeries.replace('WB_', '');
      const res = await fetchWorldBankData(code, 'GC.DOD.TOTL.GD.ZS');
      if (res.success && res.data) {
        setFetchedData(res.data);
      } else {
        setFetchError(res.error || 'Failed to fetch World Bank indicator');
      }
    } else {
      // FRED Series
      if (!config.fredApiKey) {
        setFetchError('FRED API Key is required to query live St. Louis Fed observations.');
        setIsFetchingData(false);
        return;
      }
      const res = await fetchFredSeries(selectedSeries, config.fredApiKey, 12);
      if (res.success && res.data) {
        setFetchedData(res.data);
      } else {
        setFetchError(res.error || 'Failed to fetch FRED series');
      }
    }
    setIsFetchingData(false);
  };

  // Test public endpoints on mount
  useEffect(() => {
    testWorldBank();
    testDBnomics();
  }, []);

  const dockerComposeCode = `version: '3.8'

services:
  # 1. Sovereign Control Tower Frontend & Proxy
  control-tower:
    build: .
    container_name: sovereign-control-tower
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - NODE_ENV=production
      - OLLAMA_HOST=http://ollama:11434
      - DATABASE_URL=postgresql://postgres:sovereign_secret@timescaledb:5432/sovereign_db
      - FRED_API_KEY=${config.fredApiKey ? config.fredApiKey : 'YOUR_FRED_API_KEY'}
    depends_on:
      timescaledb:
        condition: service_healthy
      ollama:
        condition: service_started
    networks:
      - sovereign-net

  # 2. TimescaleDB (PostgreSQL 16)
  timescaledb:
    image: timescale/timescaledb:latest-pg16
    container_name: sovereign-timescaledb
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=sovereign_db
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=sovereign_secret
      - TIMESCALEDB_TELEMETRY=off
    volumes:
      - timescale_data:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/01-init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d sovereign_db"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - sovereign-net

  # 3. Local Ollama LLM Inference Core
  ollama:
    image: ollama/ollama:latest
    container_name: sovereign-ollama
    restart: unless-stopped
    ports:
      - "11434:11434"
    volumes:
      - ollama_models:/root/.ollama
    environment:
      - OLLAMA_ORIGINS=*
      - OLLAMA_HOST=0.0.0.0:11434
    networks:
      - sovereign-net

networks:
  sovereign-net:
    driver: bridge

volumes:
  timescale_data:
    driver: local
  ollama_models:
    driver: local`;

  const dockerfileCode = `FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY docker-server.cjs ./server.cjs
USER node
EXPOSE 3000
CMD ["node", "server.cjs"]`;

  const initSqlCode = `-- PostgreSQL 16 & TimescaleDB Core Schemas
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Sovereign Entity Registry
CREATE TABLE IF NOT EXISTS sovereign_entities (
    country_iso_alpha3 CHAR(3) PRIMARY KEY,
    country_name VARCHAR(100) NOT NULL,
    reporting_currency CHAR(3) NOT NULL,
    credit_rating VARCHAR(10) NOT NULL,
    gdp_usd_billion NUMERIC(12, 2) NOT NULL,
    initial_debt_to_gdp NUMERIC(6, 2) NOT NULL,
    baseline_inflation NUMERIC(5, 2) NOT NULL,
    effective_tax_rate NUMERIC(5, 2) NOT NULL,
    fx_reserve_months NUMERIC(5, 2) NOT NULL
);

-- Hypertable: Macro & Market Ingestions
CREATE TABLE IF NOT EXISTS sovereign_macro_metrics (
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    country_iso CHAR(3) REFERENCES sovereign_entities(country_iso_alpha3),
    metric_code VARCHAR(50) NOT NULL,
    metric_value NUMERIC(20, 6) NOT NULL,
    source_identifier VARCHAR(30) NOT NULL
);

SELECT create_hypertable('sovereign_macro_metrics', 'timestamp', chunk_time_interval => INTERVAL '1 month', if_not_exists => TRUE);`;

  const setupScriptCode = `#!/usr/bin/env bash
# Quick Start:
docker compose up -d --build
# Pull target quantized model into Ollama:
docker exec -it sovereign-ollama ollama pull llama3.1:8b-instruct
# Open http://localhost:3000`;

  const currentFileContent =
    activeFileTab === 'compose'
      ? dockerComposeCode
      : activeFileTab === 'dockerfile'
      ? dockerfileCode
      : activeFileTab === 'sql'
      ? initSqlCode
      : setupScriptCode;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentFileContent);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Server className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-sm font-semibold text-white">
                Local Docker Hosting & Macroeconomic API Gateway
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Feed live data from FRED, World Bank, DBnomics, and route through your local containerized Ollama LLM
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Docker Stack Ready
            </span>
          </div>
        </div>

        {/* Live Endpoints Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
          {/* FRED */}
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">FRED API</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                fredStatus.online ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'
              }`}>
                {fredStatus.testing ? 'Probing...' : fredStatus.online ? 'Live Connected' : 'Unverified'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {fredStatus.msg || 'US Treasury Yields, SOFR, HY Spreads'}
            </p>
            <button
              onClick={testFred}
              disabled={fredStatus.testing}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-mono flex items-center gap-1 cursor-pointer pt-1"
            >
              <RefreshCw className={`w-3 h-3 ${fredStatus.testing ? 'animate-spin' : ''}`} />
              <span>Test FRED Endpoint</span>
            </button>
          </div>

          {/* World Bank */}
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">World Bank IDS</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                wbStatus.online ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'
              }`}>
                {wbStatus.testing ? 'Probing...' : wbStatus.online ? 'Live Connected' : 'Testing...'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {wbStatus.msg || 'External Sovereign Debt Stocks'}
            </p>
            <button
              onClick={testWorldBank}
              disabled={wbStatus.testing}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-mono flex items-center gap-1 cursor-pointer pt-1"
            >
              <RefreshCw className={`w-3 h-3 ${wbStatus.testing ? 'animate-spin' : ''}`} />
              <span>Probe World Bank API</span>
            </button>
          </div>

          {/* DBnomics */}
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">DBnomics API</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                dbnomicsStatus.online ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'
              }`}>
                {dbnomicsStatus.testing ? 'Probing...' : dbnomicsStatus.online ? 'Live Connected' : 'Testing...'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {dbnomicsStatus.msg || 'EURIBOR, PMIs, CPI indices'}
            </p>
            <button
              onClick={testDBnomics}
              disabled={dbnomicsStatus.testing}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-mono flex items-center gap-1 cursor-pointer pt-1"
            >
              <RefreshCw className={`w-3 h-3 ${dbnomicsStatus.testing ? 'animate-spin' : ''}`} />
              <span>Probe DBnomics</span>
            </button>
          </div>

          {/* Local Ollama */}
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">Ollama Local Core</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                ollamaStatus.online ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'
              }`}>
                {ollamaStatus.testing ? 'Connecting...' : ollamaStatus.online ? 'Online' : 'Standby / Localhost'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {ollamaStatus.msg || `${config.ollamaHost} · ${config.ollamaModel}`}
            </p>
            <button
              onClick={testOllama}
              disabled={ollamaStatus.testing}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-mono flex items-center gap-1 cursor-pointer pt-1"
            >
              <RefreshCw className={`w-3 h-3 ${ollamaStatus.testing ? 'animate-spin' : ''}`} />
              <span>Probe Ollama Daemon</span>
            </button>
          </div>
        </div>
      </div>

      {/* Configuration Form & Live Series Prober */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Endpoint Inputs Card */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Endpoint & Key Credentials
            </span>
            <span className="text-[11px] font-mono text-slate-500">Persisted locally in browser</span>
          </div>

          {/* FRED Key */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <label className="text-slate-300 font-medium">FRED API Key</label>
              <a
                href="https://fred.stlouisfed.org/docs/api/api_key.html"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1 font-mono"
              >
                Get Free Key <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="password"
              value={config.fredApiKey}
              onChange={(e) => setConfig({ ...config, fredApiKey: e.target.value })}
              placeholder="e.g. 8a2f5b4c1e9d3a7f..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <p className="text-[10px] text-slate-500 mt-0.5">
              Required for live Treasury curves (GS10, DGS2, SOFR, High Yield spreads).
            </p>
          </div>

          {/* Ollama Host */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">Ollama Host URL</label>
              <input
                type="text"
                value={config.ollamaHost}
                onChange={(e) => setConfig({ ...config, ollamaHost: e.target.value })}
                placeholder="http://localhost:11434"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">Target Model</label>
              <input
                type="text"
                value={config.ollamaModel}
                onChange={(e) => setConfig({ ...config, ollamaModel: e.target.value })}
                placeholder="llama3.1:70b-instruct-q4_K_M"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* TimescaleDB URL */}
          <div>
            <label className="text-xs text-slate-300 font-medium block mb-1">TimescaleDB Connection URL</label>
            <input
              type="text"
              value={config.timescaleDbUrl}
              onChange={(e) => setConfig({ ...config, timescaleDbUrl: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              className="flex-1 py-2 px-4 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-900/30"
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Configuration Saved!</span>
                </>
              ) : (
                <span>Save Credentials & Endpoints</span>
              )}
            </button>

            <button
              onClick={() => {
                testFred();
                testOllama();
                testWorldBank();
                testDBnomics();
              }}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              <span>Test All</span>
            </button>
          </div>
        </div>

        {/* Live Data Ingestion Prober */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Live Macroeconomic Feed Prober
            </span>
            <span className="text-[11px] font-mono text-slate-500">Real-time HTTP Ingestion</span>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedSeries}
              onChange={(e) => setSelectedSeries(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <optgroup label="FRED API Real-Time Series">
                <option value="GS10">GS10 - 10Y US Treasury Constant Maturity</option>
                <option value="DGS2">DGS2 - 2Y US Treasury Benchmark</option>
                <option value="SOFR">SOFR - Secured Overnight Financing Rate</option>
                <option value="BAMLH0A0HYM2">BAMLH0A0HYM2 - US High Yield Option-Adjusted Spread</option>
                <option value="DGS30">DGS30 - 30Y Treasury Bond Yield</option>
              </optgroup>
              <optgroup label="World Bank IDS (Public REST)">
                <option value="WB_BRA">Brazil (BRA) - Central Govt Debt % GDP</option>
                <option value="WB_ITA">Italy (ITA) - Central Govt Debt % GDP</option>
                <option value="WB_ZAF">South Africa (ZAF) - Central Govt Debt % GDP</option>
                <option value="WB_MEX">Mexico (MEX) - Central Govt Debt % GDP</option>
              </optgroup>
            </select>

            <button
              onClick={handleFetchSeries}
              disabled={isFetchingData}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm shadow-emerald-900/30"
            >
              {isFetchingData ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Fetching...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>Ingest Live</span>
                </>
              )}
            </button>
          </div>

          {/* Results display */}
          {fetchError && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-lg text-xs text-rose-300 font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{fetchError}</span>
            </div>
          )}

          {fetchedData && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-emerald-400 font-semibold">
                  Ingestion Success ({fetchedData.length} observation points)
                </span>
                <span className="text-slate-400">Target Hypertable: sovereign_macro_metrics</span>
              </div>

              <div className="max-h-48 overflow-y-auto bg-slate-950 rounded-lg border border-slate-800/80 p-2 font-mono text-[11px]">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800">
                      <th className="py-1">Observation Date</th>
                      <th className="py-1 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {fetchedData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/50">
                        <td className="py-1 text-slate-300">{item.date || item.year}</td>
                        <td className="py-1 text-right text-emerald-400 font-bold">{item.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!fetchedData && !fetchError && (
            <div className="p-6 bg-slate-950/60 border border-slate-800 rounded-lg text-center text-xs text-slate-500 font-mono">
              Select an external series above and click "Ingest Live" to test direct API communication.
            </div>
          )}
        </div>
      </div>

      {/* Docker Deployment Manifests & Command Center */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Local Docker Orchestration Cheatsheet & Files</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Complete production container files created in your repository root ready for launch
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy File Content</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* File Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveFileTab('compose')}
            className={`px-3 py-1 text-xs font-mono font-medium rounded-md transition-colors cursor-pointer ${
              activeFileTab === 'compose' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            docker-compose.yml
          </button>
          <button
            onClick={() => setActiveFileTab('dockerfile')}
            className={`px-3 py-1 text-xs font-mono font-medium rounded-md transition-colors cursor-pointer ${
              activeFileTab === 'dockerfile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Dockerfile
          </button>
          <button
            onClick={() => setActiveFileTab('sql')}
            className={`px-3 py-1 text-xs font-mono font-medium rounded-md transition-colors cursor-pointer ${
              activeFileTab === 'sql' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            init-db.sql
          </button>
          <button
            onClick={() => setActiveFileTab('setup')}
            className={`px-3 py-1 text-xs font-mono font-medium rounded-md transition-colors cursor-pointer ${
              activeFileTab === 'setup' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            docker-setup.sh
          </button>
        </div>

        {/* Code Box */}
        <pre className="p-4 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto max-h-80 leading-relaxed">
          {currentFileContent}
        </pre>

        {/* Command Quick Step Guide */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
            <span className="text-[11px] font-semibold text-indigo-400 block mb-1">Step 1: Start Container Stack</span>
            <code className="text-[11px] text-slate-300 font-mono bg-slate-900 px-2 py-1 rounded block">
              docker compose up -d --build
            </code>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
            <span className="text-[11px] font-semibold text-indigo-400 block mb-1">Step 2: Hydrate Ollama Weights</span>
            <code className="text-[11px] text-slate-300 font-mono bg-slate-900 px-2 py-1 rounded block">
              docker exec -it sovereign-ollama ollama pull llama3.1:8b-instruct
            </code>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
            <span className="text-[11px] font-semibold text-indigo-400 block mb-1">Step 3: Access Air-Gapped UI</span>
            <code className="text-[11px] text-emerald-400 font-mono bg-slate-900 px-2 py-1 rounded block">
              http://localhost:3000
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};
