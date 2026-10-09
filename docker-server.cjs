/**
 * Production Static & API Proxy Server for Docker Container
 */
const express = require('express');
const path = require('path');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://ollama:11434';

app.use(express.json({ limit: '10mb' }));

// Health check endpoint for Docker compose healthchecks
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'sovereign-control-tower',
    mode: 'air-gapped-local',
  });
});

// Ollama Local Inference Proxy
app.post('/api/ollama/generate', async (req, res) => {
  try {
    const targetUrl = `${OLLAMA_HOST}/api/generate`;
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Ollama service returned HTTP ${response.status}`,
      });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err) {
    return res.status(503).json({
      error: 'Ollama service unreachable on internal network',
      details: err.message,
    });
  }
});

// IMF SDMX-JSON Proxy Endpoint
app.get('/api/imf/sdmx', async (req, res) => {
  try {
    const { country = 'BR', indicator = 'GGXWDG_NGDP' } = req.query;
    const targetUrl = `https://dataservices.imf.org/REST/SDMX_JSON.svc/CompactData/WEO/A.${country}.${indicator}`;
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      return res.status(response.status).json({ error: `IMF returned HTTP ${response.status}` });
    }
    const data = await response.json();
    return res.json(data);
  } catch (err) {
    return res.status(502).json({ error: 'IMF API proxy unreachable', details: err.message });
  }
});

// Ollama Local Status Check
app.get('/api/ollama/status', async (req, res) => {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`, { method: 'GET' });
    if (response.ok) {
      const data = await response.json();
      return res.json({ connected: true, models: data.models || [] });
    }
    return res.json({ connected: false, error: `HTTP ${response.status}` });
  } catch (err) {
    return res.json({ connected: false, error: err.message });
  }
});

// Serve frontend static build
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Fallback all routes to index.html for SPA client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Sovereign Control Tower] Running in Docker on http://0.0.0.0:${PORT}`);
  console.log(`[Ollama Proxy Target] Bound to ${OLLAMA_HOST}`);
});
