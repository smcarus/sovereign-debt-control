import React, { useState, useEffect, useMemo } from 'react';
import { SovereignEntity } from '../types/sovereign';
import { YIELD_CURVE_DATA } from '../data/mockDatabase';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Radio,
  RefreshCw,
  Eye,
  Sliders,
  ChevronDown,
  ChevronUp,
  Zap,
  BarChart2,
  Globe2,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react';

export interface VolatilityIndexData {
  id: string;
  name: string;
  category: string;
  ticker: string;
  value: number;
  change1D: number;
  changePct1D: number;
  history: number[];
  warningThreshold: number;
  criticalThreshold: number;
  unit: string;
}

interface PeerRiskMetric {
  iso: string;
  name: string;
  rating: string;
  yield10Y: number;
  benchmark10Y: number;
  spread10YBps: number;
  spread1DDeltaBps: number;
  cds5YBps: number;
  cds1DDeltaBps: number;
  betaToMove: number;
  riskTier: 'Anchor / Prime' | 'Semi-Core' | 'High Beta' | 'Distressed';
}

interface GlobalRiskWatchlistProps {
  sovereigns: SovereignEntity[];
  selectedIso: string;
  onSelectIso: (iso: string) => void;
}

export const GlobalRiskWatchlist: React.FC<GlobalRiskWatchlistProps> = ({
  sovereigns,
  selectedIso,
  onSelectIso,
}) => {
  // Widget collapse/expand state
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<'overview' | 'peers' | 'volatility'>('overview');
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);
  const [lastTickTime, setLastTickTime] = useState<string>('Live');
  const [tickCounter, setTickCounter] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Volatility Indices baseline state
  const [volatilityIndices, setVolatilityIndices] = useState<VolatilityIndexData[]>([
    {
      id: 'MOVE',
      name: 'MOVE Index',
      category: 'Treasury / Bond Vol',
      ticker: 'ICE:MOVE',
      value: 108.45,
      change1D: 3.82,
      changePct1D: 3.65,
      history: [102.1, 103.5, 101.8, 105.2, 104.6, 106.9, 108.45],
      warningThreshold: 95.0,
      criticalThreshold: 115.0,
      unit: 'pts',
    },
    {
      id: 'VIX',
      name: 'VIX Fear Index',
      category: 'Global Equity Vol',
      ticker: 'CBOE:VIX',
      value: 18.62,
      change1D: -0.45,
      changePct1D: -2.36,
      history: [19.8, 19.4, 20.1, 19.2, 18.9, 18.8, 18.62],
      warningThreshold: 20.0,
      criticalThreshold: 28.0,
      unit: 'pts',
    },
    {
      id: 'CVIX',
      name: 'FX Volatility',
      category: 'G7/EM Currency Vol',
      ticker: 'JPM:CVIX',
      value: 8.94,
      change1D: 0.28,
      changePct1D: 3.23,
      history: [8.2, 8.4, 8.3, 8.6, 8.7, 8.8, 8.94],
      warningThreshold: 9.0,
      criticalThreshold: 12.0,
      unit: '%',
    },
    {
      id: 'VSTOXX',
      name: 'VSTOXX Index',
      category: 'Euro Area Stress',
      ticker: 'STOXX:V2X',
      value: 16.35,
      change1D: 0.18,
      changePct1D: 1.11,
      history: [15.8, 16.0, 15.9, 16.4, 16.1, 16.2, 16.35],
      warningThreshold: 18.0,
      criticalThreshold: 24.0,
      unit: 'pts',
    },
  ]);

  // Baseline peer market profiles
  const peerBaselines = useMemo<Record<string, { deltaSpread: number; deltaCds: number; beta: number; tier: PeerRiskMetric['riskTier'] }>>(() => ({
    ALP: { deltaSpread: 12, deltaCds: 8, beta: 1.45, tier: 'High Beta' },
    BET: { deltaSpread: -3, deltaCds: -2, beta: 0.92, tier: 'Semi-Core' },
    GAM: { deltaSpread: 75, deltaCds: 110, beta: 2.85, tier: 'Distressed' },
    DEL: { deltaSpread: -1, deltaCds: -1, beta: 0.42, tier: 'Anchor / Prime' },
  }), []);

  // Compute live peer data for all sovereigns
  const peerMetrics = useMemo<PeerRiskMetric[]>(() => {
    return sovereigns.map((sov) => {
      const iso = sov.country_iso_alpha3;
      const rawData = YIELD_CURVE_DATA[iso] || YIELD_CURVE_DATA['ALP'];
      const yields = rawData.sovereign_yields;
      const bYields = rawData.benchmark_yields;
      
      // 10Y is at index 5 in the standard 7-tenor curve
      const yield10Y = yields[5] ?? 5.0;
      const benchmark10Y = bYields[5] ?? 4.0;
      const spread10YBps = Math.round((yield10Y - benchmark10Y) * 100);
      const cds5YBps = rawData.cds_spreads_bps;
      
      const baseline = peerBaselines[iso] || {
        deltaSpread: 4,
        deltaCds: 3,
        beta: 1.0,
        tier: 'Semi-Core',
      };

      // Add small live tick variance if counter > 0
      const tickVarianceSpread = isLiveStreaming ? Math.round(Math.sin(tickCounter + iso.charCodeAt(0)) * 2) : 0;
      const tickVarianceCds = isLiveStreaming ? Math.round(Math.cos(tickCounter * 0.8 + iso.charCodeAt(1)) * 3) : 0;

      return {
        iso,
        name: sov.country_name.split('(')[0].trim(),
        rating: sov.credit_rating,
        yield10Y,
        benchmark10Y,
        spread10YBps: spread10YBps + tickVarianceSpread,
        spread1DDeltaBps: baseline.deltaSpread + tickVarianceSpread,
        cds5YBps: cds5YBps + tickVarianceCds,
        cds1DDeltaBps: baseline.deltaCds + tickVarianceCds,
        betaToMove: baseline.beta,
        riskTier: baseline.tier,
      };
    });
  }, [sovereigns, peerBaselines, tickCounter, isLiveStreaming]);

  // Selected sovereign metric
  const selectedMetric = useMemo(() => {
    return peerMetrics.find((p) => p.iso === selectedIso) || peerMetrics[0];
  }, [peerMetrics, selectedIso]);

  // Peer group stats (peers excluding selected or entire universe)
  const peerStats = useMemo(() => {
    const peersOnly = peerMetrics.filter((p) => p.iso !== selectedIso);
    const universe = peersOnly.length > 0 ? peersOnly : peerMetrics;
    
    // Sort spreads to get median
    const sortedSpreads = [...universe.map((p) => p.spread10YBps)].sort((a, b) => a - b);
    const midIndex = Math.floor(sortedSpreads.length / 2);
    const medianSpread = sortedSpreads.length % 2 !== 0
      ? sortedSpreads[midIndex]
      : Math.round((sortedSpreads[midIndex - 1] + sortedSpreads[midIndex]) / 2);

    const sortedCds = [...universe.map((p) => p.cds5YBps)].sort((a, b) => a - b);
    const medianCds = sortedCds.length % 2 !== 0
      ? sortedCds[midIndex]
      : Math.round((sortedCds[midIndex - 1] + sortedCds[midIndex]) / 2);

    // Differential of target to peer median
    const spreadDiffVsMedian = selectedMetric.spread10YBps - medianSpread;
    const cdsDiffVsMedian = selectedMetric.cds5YBps - medianCds;

    // Highest and lowest spread in universe
    const minSpread = Math.min(...peerMetrics.map((p) => p.spread10YBps));
    const maxSpread = Math.max(...peerMetrics.map((p) => p.spread10YBps));

    // Rank of selected country (1 = tightest/lowest risk, 4 = widest/highest risk)
    const rank = [...peerMetrics].sort((a, b) => a.spread10YBps - b.spread10YBps).findIndex((p) => p.iso === selectedIso) + 1;

    // Average 1D delta of peers
    const avgPeerDeltaSpread = Math.round(
      universe.reduce((sum, p) => sum + p.spread1DDeltaBps, 0) / universe.length
    );

    return {
      medianSpread,
      medianCds,
      spreadDiffVsMedian,
      cdsDiffVsMedian,
      minSpread,
      maxSpread,
      rank,
      totalCount: peerMetrics.length,
      avgPeerDeltaSpread,
    };
  }, [peerMetrics, selectedIso, selectedMetric]);

  // Real-time ticking simulation
  useEffect(() => {
    if (!isLiveStreaming) return;

    const interval = setInterval(() => {
      setTickCounter((prev) => prev + 1);
      const now = new Date();
      setLastTickTime(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );

      // Micro-fluctuate volatility indices realistically
      setVolatilityIndices((prevIndices) =>
        prevIndices.map((idx) => {
          const noise = (Math.random() - 0.48) * 0.15;
          const newValue = Math.max(1, Number((idx.value + noise).toFixed(2)));
          const newChange1D = Number((idx.change1D + noise * 0.5).toFixed(2));
          const newChangePct = Number(((newChange1D / (newValue - newChange1D)) * 100).toFixed(2));
          const updatedHistory = [...idx.history.slice(1), newValue];

          return {
            ...idx,
            value: newValue,
            change1D: newChange1D,
            changePct1D: newChangePct,
            history: updatedHistory,
          };
        })
      );
    }, 3800);

    return () => clearInterval(interval);
  }, [isLiveStreaming]);

  // Manual refresh trigger
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTickCounter((prev) => prev + 1);
    const now = new Date();
    setLastTickTime(
      now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    );
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  // Sparkline SVG helper
  const renderSparkline = (points: number[], color: string) => {
    if (!points || points.length < 2) return null;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const width = 48;
    const height = 18;

    const coords = points.map((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((p - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return (
      <svg width={width} height={height} className="shrink-0 overflow-visible">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={coords.join(' ')}
        />
        {/* Pulsing endpoint dot */}
        <circle
          cx={(width).toFixed(1)}
          cy={(height - ((points[points.length - 1] - min) / range) * (height - 4) - 2).toFixed(1)}
          r="2"
          fill={color}
        />
      </svg>
    );
  };

  // Status assessment
  const moveIdx = volatilityIndices.find((v) => v.id === 'MOVE')?.value || 100;
  const vixIdx = volatilityIndices.find((v) => v.id === 'VIX')?.value || 18;
  const isHighGlobalStress = moveIdx > 110 || vixIdx > 22;
  const isModerateStress = moveIdx > 95 || vixIdx > 19;

  return (
    <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl overflow-hidden shadow-lg transition-all">
      {/* Header Bar */}
      <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isLiveStreaming ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            />
            {isLiveStreaming && (
              <span className="absolute w-2.5 h-2.5 rounded-full bg-emerald-400/40 animate-ping" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
              Global Risk Watchlist
            </span>
            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <span>{isLiveStreaming ? 'REAL-TIME' : 'PAUSED'}</span>
              <span>•</span>
              <span className="text-slate-500">{lastTickTime}</span>
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsLiveStreaming(!isLiveStreaming)}
            title={isLiveStreaming ? 'Pause Real-time Feed' : 'Resume Real-time Feed'}
            className={`p-1 rounded text-[11px] transition-colors cursor-pointer ${
              isLiveStreaming
                ? 'text-emerald-400 hover:bg-emerald-950/50'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleManualRefresh}
            title="Refresh Quotes"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse Widget' : 'Expand Widget'}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 space-y-3.5">
          {/* Regime & Contagion Status Banner */}
          <div
            className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between text-[11px] font-medium ${
              isHighGlobalStress
                ? 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                : isModerateStress
                ? 'bg-amber-950/40 border-amber-800/80 text-amber-300'
                : 'bg-emerald-950/30 border-emerald-800/70 text-emerald-300'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span>
                {isHighGlobalStress
                  ? 'High Systemic Stress Regime'
                  : isModerateStress
                  ? 'Elevated Bond Volatility'
                  : 'Benign Sovereign Liquidity'}
              </span>
            </div>
            <span className="font-mono text-[10px] opacity-80 uppercase">
              β = {selectedMetric.betaToMove.toFixed(2)}x
            </span>
          </div>

          {/* Sub-Tabs: Overview | Peers | Volatility */}
          <div className="grid grid-cols-3 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800 text-[11px] font-medium text-slate-400">
            <button
              onClick={() => setActiveView('overview')}
              className={`py-1 rounded cursor-pointer transition-colors ${
                activeView === 'overview'
                  ? 'bg-slate-800 text-white font-semibold shadow-xs'
                  : 'hover:text-slate-200'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveView('peers')}
              className={`py-1 rounded cursor-pointer transition-colors ${
                activeView === 'peers'
                  ? 'bg-slate-800 text-white font-semibold shadow-xs'
                  : 'hover:text-slate-200'
              }`}
            >
              Peers ({peerMetrics.length})
            </button>
            <button
              onClick={() => setActiveView('volatility')}
              className={`py-1 rounded cursor-pointer transition-colors ${
                activeView === 'volatility'
                  ? 'bg-slate-800 text-white font-semibold shadow-xs'
                  : 'hover:text-slate-200'
              }`}
            >
              Indices
            </button>
          </div>

          {/* VIEW 1: OVERVIEW */}
          {activeView === 'overview' && (
            <div className="space-y-3">
              {/* Selected Sovereign Spread Focus Card */}
              <div className="bg-slate-900/80 rounded-lg p-2.5 border border-indigo-900/40 space-y-2">
                <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-indigo-300">
                      {selectedMetric.iso}
                    </span>
                    <span className="text-[11px] text-slate-300 truncate max-w-[110px]">
                      {selectedMetric.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    Rank #{peerStats.rank}/{peerStats.totalCount}
                  </span>
                </div>

                {/* 10Y Benchmark Spread Row */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      10Y Benchmark Spread
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-bold font-mono text-white">
                        +{selectedMetric.spread10YBps}
                      </span>
                      <span className="text-[10px] text-slate-400">bps</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`inline-flex items-center text-[11px] font-mono font-semibold ${
                        selectedMetric.spread1DDeltaBps > 0
                          ? 'text-rose-400'
                          : selectedMetric.spread1DDeltaBps < 0
                          ? 'text-emerald-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {selectedMetric.spread1DDeltaBps > 0 ? (
                        <ArrowUpRight className="w-3 h-3 mr-0.5" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3 mr-0.5" />
                      )}
                      {selectedMetric.spread1DDeltaBps > 0 ? '+' : ''}
                      {selectedMetric.spread1DDeltaBps} bps
                    </div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">
                      {selectedMetric.spread1DDeltaBps > 0 ? 'Widening 1D' : 'Tightening 1D'}
                    </div>
                  </div>
                </div>

                {/* 5Y CDS Spread Row */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      5Y CDS Spread
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs font-bold font-mono text-amber-300">
                        {selectedMetric.cds5YBps}
                      </span>
                      <span className="text-[10px] text-slate-400">bps</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-[10px] font-mono font-medium ${
                        selectedMetric.cds1DDeltaBps > 0
                          ? 'text-rose-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {selectedMetric.cds1DDeltaBps > 0 ? '+' : ''}
                      {selectedMetric.cds1DDeltaBps} bps 1D
                    </span>
                    <div className="text-[9px] text-slate-500">
                      {selectedMetric.riskTier}
                    </div>
                  </div>
                </div>

                {/* Peer Group Comparison Indicator */}
                <div className="pt-1.5 border-t border-slate-800/70 text-[10px] space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>vs Peer Group Median:</span>
                    <span
                      className={`font-mono font-semibold ${
                        peerStats.spreadDiffVsMedian > 0
                          ? 'text-rose-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {peerStats.spreadDiffVsMedian > 0 ? '+' : ''}
                      {peerStats.spreadDiffVsMedian} bps
                    </span>
                  </div>

                  {/* Relative Spread Gauge Bar */}
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
                    {peerMetrics.map((p) => {
                      const spreadPct = Math.min(
                        100,
                        Math.max(5, (p.spread10YBps / (peerStats.maxSpread || 1)) * 100)
                      );
                      const isTarget = p.iso === selectedIso;
                      return (
                        <div
                          key={p.iso}
                          style={{ width: `${100 / peerMetrics.length}%` }}
                          className={`h-full border-r border-slate-900 ${
                            isTarget
                              ? 'bg-indigo-500'
                              : p.spread10YBps > peerStats.medianSpread
                              ? 'bg-rose-500/40'
                              : 'bg-emerald-500/40'
                          }`}
                          title={`${p.iso}: ${p.spread10YBps} bps`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                    <span>Min: {peerStats.minSpread} bps</span>
                    <span>Median: {peerStats.medianSpread} bps</span>
                    <span>Max: {peerStats.maxSpread} bps</span>
                  </div>
                </div>
              </div>

              {/* Real-Time Volatility Strip (Top 2 Primary Gauges: MOVE & VIX) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  <span>Core Volatility Indices</span>
                  <span className="text-[9px] text-slate-500">1D Delta</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {volatilityIndices.slice(0, 2).map((idx) => {
                    const isAlert = idx.value >= idx.warningThreshold;
                    const isCritical = idx.value >= idx.criticalThreshold;
                    const sparkColor = isCritical ? '#f43f5e' : isAlert ? '#f59e0b' : '#10b981';

                    return (
                      <div
                        key={idx.id}
                        className="bg-slate-900/90 border border-slate-800 rounded-lg p-2 flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold text-slate-200">
                            {idx.id}
                          </span>
                          <span
                            className={`text-[9px] font-mono font-medium ${
                              idx.change1D >= 0 ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {idx.change1D >= 0 ? '+' : ''}
                            {idx.change1D}
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between">
                          <span
                            className={`text-sm font-mono font-extrabold ${
                              isCritical
                                ? 'text-rose-400'
                                : isAlert
                                ? 'text-amber-300'
                                : 'text-slate-100'
                            }`}
                          >
                            {idx.value.toFixed(2)}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono">
                            {idx.unit}
                          </span>
                        </div>

                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-[8px] text-slate-500 uppercase">
                            {idx.category.split('/')[0]}
                          </span>
                          {renderSparkline(idx.history, sparkColor)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Spillover Alert Bar */}
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 text-[10px] flex items-center justify-between">
                <span className="text-slate-400">Peer Contagion Delta:</span>
                <span className="font-mono text-slate-300">
                  {selectedMetric.spread1DDeltaBps > peerStats.avgPeerDeltaSpread ? (
                    <span className="text-rose-400 font-medium">
                      Widening Faster ({selectedMetric.spread1DDeltaBps > 0 ? '+' : ''}
                      {selectedMetric.spread1DDeltaBps - peerStats.avgPeerDeltaSpread} bps)
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-medium">
                      Decoupled / Resilient
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* VIEW 2: PEERS COMPARISON MATRIX */}
          {activeView === 'peers' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Select peer to switch view:</span>
                <span className="font-mono">10Y Spread | 1D Δ</span>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                {peerMetrics.map((peer) => {
                  const isCurrent = peer.iso === selectedIso;
                  const spreadRatio = Math.min(100, Math.max(8, (peer.spread10YBps / 2500) * 100));

                  return (
                    <div
                      key={peer.iso}
                      onClick={() => onSelectIso(peer.iso)}
                      className={`p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                        isCurrent
                          ? 'bg-indigo-950/60 border-indigo-500/80 shadow-xs'
                          : 'bg-slate-900/80 border-slate-800/80 hover:bg-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono font-bold ${
                              isCurrent ? 'text-indigo-300' : 'text-white'
                            }`}
                          >
                            {peer.iso}
                          </span>
                          <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                            {peer.rating}
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-medium">
                              ACTIVE
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-100">
                            +{peer.spread10YBps}
                            <span className="text-[9px] text-slate-400 font-normal ml-0.5">bps</span>
                          </span>
                          <span
                            className={`font-mono text-[10px] font-medium ${
                              peer.spread1DDeltaBps > 0
                                ? 'text-rose-400'
                                : peer.spread1DDeltaBps < 0
                                ? 'text-emerald-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {peer.spread1DDeltaBps > 0 ? '+' : ''}
                            {peer.spread1DDeltaBps}
                          </span>
                        </div>
                      </div>

                      {/* Visual Spread Bar */}
                      <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden mb-1">
                        <div
                          style={{ width: `${spreadRatio}%` }}
                          className={`h-full ${
                            peer.spread10YBps > 500
                              ? 'bg-rose-500'
                              : peer.spread10YBps > 150
                              ? 'bg-amber-400'
                              : 'bg-emerald-400'
                          }`}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="truncate max-w-[120px]">{peer.name}</span>
                        <span className="font-mono text-slate-400 text-[10px]">
                          CDS: <span className="text-amber-300 font-medium">{peer.cds5YBps}</span> bps
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Peer Group Dispersion Footnote */}
              <div className="pt-1 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Spread Dispersion:</span>
                <span className="font-mono text-slate-300 font-medium">
                  {peerStats.maxSpread - peerStats.minSpread} bps
                </span>
              </div>
            </div>
          )}

          {/* VIEW 3: VOLATILITY INDICES FULL LIST */}
          {activeView === 'volatility' && (
            <div className="space-y-2">
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>Volatility Gauges (Live Tickers)</span>
                <span>Sparkline (7D)</span>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                {volatilityIndices.map((idx) => {
                  const isWarning = idx.value >= idx.warningThreshold;
                  const isCritical = idx.value >= idx.criticalThreshold;
                  const sparkColor = isCritical ? '#f43f5e' : isWarning ? '#f59e0b' : '#10b981';

                  return (
                    <div
                      key={idx.id}
                      className="bg-slate-900/90 border border-slate-800 rounded-lg p-2 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-white mr-1.5">
                            {idx.id}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {idx.name}
                          </span>
                        </div>

                        <div className="text-right">
                          <span
                            className={`font-mono text-xs font-bold ${
                              isCritical
                                ? 'text-rose-400'
                                : isWarning
                                ? 'text-amber-300'
                                : 'text-slate-200'
                            }`}
                          >
                            {idx.value.toFixed(2)} {idx.unit}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-0.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-mono font-medium ${
                              idx.change1D >= 0 ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {idx.change1D >= 0 ? '+' : ''}
                            {idx.change1D.toFixed(2)} ({idx.changePct1D >= 0 ? '+' : ''}
                            {idx.changePct1D.toFixed(1)}%)
                          </span>
                          <span className="text-[9px] text-slate-500 uppercase">
                            1D
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {renderSparkline(idx.history, sparkColor)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Volatility Regime Alert */}
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-[10px] text-slate-400 flex items-center gap-1.5">
                <AlertTriangle
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isHighGlobalStress ? 'text-rose-400' : 'text-amber-400'
                  }`}
                />
                <span>
                  MOVE &gt; 100 indicates heightened Treasury term-premia & sovereign debt volatility.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
