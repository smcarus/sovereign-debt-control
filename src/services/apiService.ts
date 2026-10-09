/**
 * Ingestion Service for Sovereign Macroeconomic & Market Endpoints
 * (FRED, World Bank, DBnomics, IMF, and Local Ollama Inference)
 */

export interface EndpointConfig {
  fredApiKey: string;
  ollamaHost: string;
  ollamaModel: string;
  worldBankBase: string;
  dbnomicsBase: string;
  timescaleDbUrl: string;
}

const STORAGE_KEY = 'sovereign_control_tower_endpoints_v1';

export const DEFAULT_CONFIG: EndpointConfig = {
  fredApiKey: '',
  ollamaHost: import.meta.env.VITE_OLLAMA_HOST || 'http://localhost:11434',
  ollamaModel: import.meta.env.VITE_OLLAMA_MODEL || 'llama3.1:70b-instruct-q4_K_M',
  worldBankBase: 'https://api.worldbank.org/v2',
  dbnomicsBase: 'https://api.db.nomics.world/v22',
  timescaleDbUrl: 'postgresql://postgres:sovereign_secret@localhost:5432/sovereign_db',
};

export function loadEndpointConfig(): EndpointConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch (e) {
    // Ignore storage parse error
  }
  return DEFAULT_CONFIG;
}

export function saveEndpointConfig(config: EndpointConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save config to localStorage', e);
  }
}

/**
 * Probes local Ollama instance
 */
export async function testOllamaConnection(hostUrl = 'http://localhost:11434'): Promise<{
  online: boolean;
  models?: string[];
  message: string;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    // Try through proxy first or direct
    const endpoint = `${hostUrl.replace(/\/$/, '')}/api/tags`;
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const models = (data.models || []).map((m: any) => m.name || m.model);
      return {
        online: true,
        models,
        message: `Successfully connected to Ollama (${models.length} model(s) available: ${models.slice(0, 3).join(', ') || 'none loaded yet'})`,
      };
    }
    return {
      online: false,
      message: `Ollama replied with HTTP status ${res.status}`,
    };
  } catch (err: any) {
    return {
      online: false,
      message: `Unable to reach Ollama at ${hostUrl} (${err.name === 'AbortError' ? 'Timeout' : err.message}). Ensure Docker container is running with OLLAMA_ORIGINS=*`,
    };
  }
}

export interface FredObservation {
  date: string;
  value: number;
}

export interface FredSeriesResult {
  success: boolean;
  data?: FredObservation[];
  error?: string;
}

/** Fetches FRED observations through the server-side proxy. */
export async function fetchFredSeries(
  seriesId: string,
  _apiKey?: string,
  limit = 15
): Promise<FredSeriesResult> {
  try {
    const params = new URLSearchParams({ series_id: seriesId, limit: String(limit) });
    const res = await fetch(`/api/fred/series?${params.toString()}`);
    const json = await res.json();
    if (!res.ok || json.error_message) {
      return { success: false, error: json.error_message || `FRED API error: HTTP ${res.status}` };
    }

    const observations = (json.observations || [])
      .filter((o: any) => o.value !== '.' && !isNaN(parseFloat(o.value)))
      .map((o: any) => ({ date: o.date, value: parseFloat(o.value) }))
      .reverse();
    return { success: true, data: observations };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unable to reach the FRED proxy.' };
  }
}

/**
 * Fetches real sovereign debt metrics from World Bank IDS API (CORS enabled)
 */
export async function fetchWorldBankData(
  countryCode = 'BRA',
  indicator = 'GC.DOD.TOTL.GD.ZS' // Central government debt, total (% of GDP)
): Promise<{ success: boolean; data?: any[]; countryName?: string; error?: string }> {
  try {
    const url = `https://api.worldbank.org/v2/country/${countryCode}/indicator/${indicator}?format=json&per_page=10`;
    const res = await fetch(url);
    if (!res.ok) {
      return { success: false, error: `World Bank HTTP ${res.status}` };
    }
    const json = await res.json();
    if (!Array.isArray(json) || json.length < 2) {
      return { success: false, error: 'Invalid response schema from World Bank API' };
    }

    const records = json[1]
      .filter((rec: any) => rec.value !== null)
      .map((rec: any) => ({
        year: rec.date,
        value: Number(rec.value.toFixed(2)),
      }));

    const countryName = json[1][0]?.country?.value || countryCode;

    return { success: true, data: records, countryName };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetches macroeconomic indicators from DBnomics API (CORS enabled)
 */
export async function fetchDBnomicsData(): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const url = `https://api.db.nomics.world/v22/series/IMF/IFS/M.US.PCPI_IX?observations=1`;
    const res = await fetch(url);
    if (!res.ok) {
      return { success: false, error: `DBnomics HTTP ${res.status}` };
    }
    const json = await res.json();
    return { success: true, data: json };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
