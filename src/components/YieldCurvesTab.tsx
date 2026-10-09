import React, { useState, useEffect, useMemo } from 'react';
import { SovereignEntity } from '../types/sovereign';
import { YIELD_CURVE_DATA, generateCDSTimeSeries } from '../data/mockDatabase';
import { fetchFredSeries, FredObservation } from '../services/apiService';
import {
  TrendingUp,
  Activity,
  BarChart2,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Sliders,
  AlertTriangle,
  Bell,
  ShieldAlert,
  CheckCircle2,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import { SovereignRiskHeatmap } from './SovereignRiskHeatmap';
import { IMFDebtMetricsCard } from './IMFDebtMetricsCard';

interface YieldCurvesTabProps {
  sovereign: SovereignEntity;
  onSelectCountry?: (iso: string) => void;
}

export const YieldCurvesTab: React.FC<YieldCurvesTabProps> = ({ sovereign, onSelectCountry }) => {
  const [curveShiftBps, setCurveShiftBps] = useState<number>(0);
  const [hoveredMaturity, setHoveredMaturity] = useState<number | null>(null);

  // Threshold-based alert system state
  const [thresholdPct, setThresholdPct] = useState<number>(25); // default +25%
  const [baselineMode, setBaselineMode] = useState<'benchmark' | 'preshock'>('benchmark');
  const [enableVisualHalos, setEnableVisualHalos] = useState<boolean>(true);

  const [fredData, setFredData] = useState<Record<string, FredObservation | null>>({ GS10: null, DGS2: null, SOFR: null });
  const [fredError, setFredError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all(['GS10', 'DGS2', 'SOFR'].map(async seriesId => [seriesId, await fetchFredSeries(seriesId, undefined, 1)] as const))
      .then(results => {
        if (cancelled) return;
        const next: Record<string, FredObservation | null> = { GS10: null, DGS2: null, SOFR: null };
        const errors: string[] = [];
        results.forEach(([seriesId, result]) => {
          if (result.success && result.data?.length) next[seriesId] = result.data[result.data.length - 1];
          else if (result.error) errors.push(`${seriesId}: ${result.error}`);
        });
        setFredData(next);
        setFredError(errors.length ? errors.join(' · ') : null);
      });
    return () => { cancelled = true; };
  }, []);

  const liveGs10 = fredData.GS10?.value;
  const liveDgs2 = fredData.DGS2?.value;

  const rawData = YIELD_CURVE_DATA[sovereign.country_iso_alpha3] || YIELD_CURVE_DATA['ALP'];
  const maturities = rawData.maturities;
  
  // Shifted sovereign yields
  const sovereignYields = rawData.sovereign_yields.map(y => Number((y + curveShiftBps / 100.0).toFixed(2)));
  const benchmarkYields = [...rawData.benchmark_yields];
  if (liveDgs2 !== undefined) benchmarkYields[3] = liveDgs2;
  if (liveGs10 !== undefined) benchmarkYields[5] = liveGs10;
  const spreadsBps = sovereignYields.map((sy, i) => Math.round((sy - benchmarkYields[i]) * 100));

  // Threshold-based calculations
  const tenorAlertAnalysis = useMemo(() => {
    return maturities.map((mat, i) => {
      const sYield = sovereignYields[i];
      const baseYield = baselineMode === 'benchmark' ? benchmarkYields[i] : rawData.sovereign_yields[i];
      const divergencePct = Number((((sYield - baseYield) / baseYield) * 100).toFixed(1));
      const isBreached = divergencePct >= thresholdPct;

      return {
        maturity: mat,
        index: i,
        sovereignYield: sYield,
        baselineYield: baseYield,
        divergencePct,
        isBreached,
        spreadBps: spreadsBps[i],
      };
    });
  }, [maturities, sovereignYields, benchmarkYields, rawData.sovereign_yields, baselineMode, thresholdPct, spreadsBps]);

  const breachedTenors = tenorAlertAnalysis.filter(t => t.isBreached);
  const hasBreaches = breachedTenors.length > 0;

  // CDS time series
  const cdsHistory = generateCDSTimeSeries(rawData.cds_spreads_bps);
  const latestCds = cdsHistory[cdsHistory.length - 1].spread;
  const priorCds = cdsHistory[0].spread;
  const cdsChange = latestCds - priorCds;

  // Key curve indicators
  const yield2Y = sovereignYields[3];
  const yield10Y = sovereignYields[5];
  const slope2s10s = Math.round((yield10Y - yield2Y) * 100); // bps
  const isInverted = slope2s10s < 0;

  // Chart dimension calculations for SVG
  const width = 640;
  const height = 280;
  const padL = 45;
  const padR = 25;
  const padT = 30;
  const padB = 40;

  const minY = Math.min(...benchmarkYields, ...sovereignYields) - 0.5;
  const maxY = Math.max(...benchmarkYields, ...sovereignYields) + 1.2;

  const getX = (index: number) => padL + (index / (maturities.length - 1)) * (width - padL - padR);
  const getY = (val: number) => height - padB - ((val - minY) / (maxY - minY)) * (height - padT - padB);

  // SVG paths
  const sovereignPath = sovereignYields
    .map((y, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(y)}`)
    .join(' ');

  const benchmarkPath = benchmarkYields
    .map((y, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(y)}`)
    .join(' ');

  // Area under sovereign path
  const areaPath = `${sovereignPath} L ${getX(maturities.length - 1)} ${height - padB} L ${getX(0)} ${height - padB} Z`;

  // CDS Chart SVG
  const cdsWidth = 520;
  const cdsHeight = 220;
  const cdsPadL = 45;
  const cdsPadR = 20;
  const cdsPadT = 20;
  const cdsPadB = 35;
  const minCds = Math.min(...cdsHistory.map(c => c.spread)) * 0.95;
  const maxCds = Math.max(...cdsHistory.map(c => c.spread)) * 1.05;

  const getCdsX = (index: number) => cdsPadL + (index / (cdsHistory.length - 1)) * (cdsWidth - cdsPadL - cdsPadR);
  const getCdsY = (val: number) => cdsHeight - cdsPadB - ((val - minCds) / (maxCds - minCds)) * (cdsHeight - cdsPadT - cdsPadB);

  const cdsPath = cdsHistory
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${getCdsX(i)} ${getCdsY(c.spread)}`)
    .join(' ');

  return (
    <div className="space-y-6">
      {/* Top Indicators KPI strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">10Y Benchmark Yield</div>
          <div className="text-3xl font-bold font-mono text-white mt-1.5 tracking-tight">
            {yield10Y.toFixed(2)}%
          </div>
          <div className="text-xs text-slate-300 mt-1.5 flex items-center gap-1.5 font-mono">
            <span>Spread to US/Bund:</span>
            <span className="text-amber-400 font-bold bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800/80">+{spreadsBps[5]} bps</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">2s10s Curve Slope</div>
          <div className={`text-3xl font-bold font-mono mt-1.5 tracking-tight ${isInverted ? 'text-rose-400' : 'text-emerald-400'}`}>
            {slope2s10s > 0 ? `+${slope2s10s}` : slope2s10s} bps
          </div>
          <div className="text-xs text-slate-300 mt-1.5 font-mono flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${isInverted ? 'bg-rose-400 animate-pulse' : 'bg-emerald-400'}`} />
            <span>{isInverted ? 'Inverted (Recession Distress)' : 'Normal Upward Slope'}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">5Y CDS Market Spread</div>
          <div className="text-3xl font-bold font-mono text-amber-300 mt-1.5 tracking-tight">
            {latestCds} bps
          </div>
          <div className="text-xs text-slate-300 mt-1.5 flex items-center gap-1 font-mono">
            {cdsChange >= 0 ? (
              <span className="text-rose-400 font-bold flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> +{cdsChange} bps (30d)
              </span>
            ) : (
              <span className="text-emerald-400 font-bold flex items-center">
                <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" /> {cdsChange} bps (30d)
              </span>
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Yield Curve Stress Shift</div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-base font-mono text-indigo-300 font-bold">
              {curveShiftBps > 0 ? `+${curveShiftBps}` : curveShiftBps} bps
            </span>
            <button
              onClick={() => setCurveShiftBps(0)}
              className="text-xs text-slate-300 hover:text-white px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 cursor-pointer font-medium transition-colors"
            >
              Reset
            </button>
          </div>
          <input
            type="range"
            min="-200"
            max="300"
            step="10"
            value={curveShiftBps}
            onChange={(e) => setCurveShiftBps(parseInt(e.target.value))}
            className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg mt-2 cursor-pointer"
          />
        </div>
      </div>

      {/* Threshold-Based Alert System Configuration & Active Breach Bar */}
      <div className={`p-4 rounded-xl border transition-colors shadow-xs ${
        hasBreaches
          ? 'bg-rose-950/50 border-rose-700/80'
          : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Status Indicator */}
          <div className="flex items-start sm:items-center gap-3">
            <div className={`p-2.5 rounded-xl shrink-0 ${
              hasBreaches
                ? 'bg-rose-900/80 text-rose-200 border border-rose-600 animate-pulse'
                : 'bg-emerald-950/90 text-emerald-300 border border-emerald-700'
            }`}>
              {hasBreaches ? <ShieldAlert className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Threshold Alert Engine
                </span>
                <span className={`px-2.5 py-0.5 rounded-md text-xs font-mono font-bold ${
                  hasBreaches
                    ? 'bg-rose-900 text-rose-100 border border-rose-500'
                    : 'bg-emerald-950 text-emerald-200 border border-emerald-600'
                }`}>
                  {hasBreaches
                    ? `🚨 ${breachedTenors.length} of ${maturities.length} Tenors Exceed +${thresholdPct}% Threshold`
                    : `✅ All ${maturities.length} Tenors Below +${thresholdPct}% Limit`}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {hasBreaches ? (
                  <span className="text-rose-200 font-medium">
                    Breached Tenors: {breachedTenors.map(b => `${b.maturity} (+${b.divergencePct}%)`).join(' · ')}
                  </span>
                ) : (
                  <span>Bond yields within established risk tolerance versus {baselineMode === 'benchmark' ? 'benchmark risk-free curve' : 'pre-shock baseline'}.</span>
                )}
              </p>
            </div>
          </div>

          {/* Alert Parameters & Presets */}
          <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
            {/* Baseline Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1">
              <span className="text-[11px] text-slate-400 px-1 font-sans">Baseline:</span>
              <button
                onClick={() => setBaselineMode('benchmark')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  baselineMode === 'benchmark'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Benchmark (US/Bund)
              </button>
              <button
                onClick={() => setBaselineMode('preshock')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  baselineMode === 'preshock'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Pre-Shock Base
              </button>
            </div>

            {/* Threshold Slider & Presets */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1">
              <span className="text-slate-300 text-xs font-medium">Ceiling:</span>
              <span className={`font-bold text-xs ${hasBreaches ? 'text-rose-400' : 'text-indigo-400'}`}>
                +{thresholdPct}%
              </span>
              <input
                type="range"
                min="5"
                max="80"
                step="5"
                value={thresholdPct}
                onChange={(e) => setThresholdPct(parseInt(e.target.value))}
                className="w-20 accent-rose-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
              <div className="flex items-center gap-1 pl-1">
                {[15, 25, 40, 60].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setThresholdPct(preset)}
                    className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                      thresholdPct === preset
                        ? 'bg-slate-700 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>

            {/* Halo Toggle */}
            <button
              onClick={() => setEnableVisualHalos(!enableVisualHalos)}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1.5 ${
                enableVisualHalos
                  ? 'bg-rose-950 text-rose-200 border-rose-700'
                  : 'bg-slate-950 text-slate-300 border-slate-800'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{enableVisualHalos ? 'Halos On' : 'Halos Off'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Charts Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Yield Curve Chart */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Sovereign Term Structure vs. Benchmark Risk-Free Curve
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Comparison of {sovereign.country_iso_alpha3} yields against US Treasury / AAA Core
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
                <span className="w-3 h-0.5 bg-rose-500 inline-block" /> {sovereign.country_iso_alpha3} (Domestic)
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-0.5 bg-slate-400 border-b border-dashed inline-block" /> Benchmark
              </span>
            </div>
          </div>

          <div className="relative w-full overflow-hidden bg-slate-950/80 rounded-lg p-2 border border-slate-800">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
              <defs>
                <linearGradient id="sovereignGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[minY, (minY + maxY) / 2, maxY].map((val, idx) => (
                <g key={idx}>
                  <line
                    x1={padL}
                    y1={getY(val)}
                    x2={width - padR}
                    y2={getY(val)}
                    stroke="#1e293b"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padL - 6}
                    y={getY(val) + 4}
                    textAnchor="end"
                    fill="#94a3b8"
                    fontSize="11"
                    fontWeight="500"
                    fontFamily="monospace"
                  >
                    {val.toFixed(1)}%
                  </text>
                </g>
              ))}

              {/* Area */}
              <path d={areaPath} fill="url(#sovereignGrad)" />

              {/* Benchmark Path */}
              <path
                d={benchmarkPath}
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2"
                strokeDasharray="4 4"
              />

              {/* Sovereign Path */}
              <path
                d={sovereignPath}
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2.5"
              />

              {/* X Axis labels & Data dots */}
              {maturities.map((mat, i) => {
                const x = getX(i);
                const sY = getY(sovereignYields[i]);
                const bY = getY(benchmarkYields[i]);
                const isHovered = hoveredMaturity === i;
                const alertItem = tenorAlertAnalysis[i];

                return (
                  <g key={mat} onMouseEnter={() => setHoveredMaturity(i)} onMouseLeave={() => setHoveredMaturity(null)} className="cursor-pointer">
                    <line
                      x1={x}
                      y1={padT}
                      x2={x}
                      y2={height - padB}
                      stroke={isHovered ? '#64748b' : '#1e293b'}
                      strokeWidth={isHovered ? 1.5 : 1}
                      strokeDasharray={isHovered ? undefined : '2 2'}
                    />
                    <text
                      x={x}
                      y={height - padB + 18}
                      textAnchor="middle"
                      fill={isHovered ? '#ffffff' : '#cbd5e1'}
                      fontSize="12"
                      fontWeight={isHovered ? '700' : '600'}
                      fontFamily="monospace"
                    >
                      {mat}
                    </text>

                    {/* Benchmark Dot */}
                    <circle cx={x} cy={bY} r="3.5" fill="#94a3b8" />

                    {/* Threshold Alert Pulsing Halos */}
                    {alertItem.isBreached && enableVisualHalos && (
                      <g>
                        <circle
                          cx={x}
                          cy={sY}
                          r={isHovered ? '16' : '13'}
                          fill="#ef4444"
                          opacity="0.22"
                        />
                        <circle
                          cx={x}
                          cy={sY}
                          r={isHovered ? '12' : '9.5'}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="1.5"
                          strokeDasharray="3 2"
                        />
                        {/* Alert Badge Pin */}
                        <rect
                          x={x - 20}
                          y={sY - 24}
                          width="40"
                          height="16"
                          rx="4"
                          fill="#450a0a"
                          stroke="#ef4444"
                          strokeWidth="1.2"
                        />
                        <text
                          x={x}
                          y={sY - 12}
                          textAnchor="middle"
                          fill="#fee2e2"
                          fontSize="9.5"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          +{Math.round(alertItem.divergencePct)}%
                        </text>
                      </g>
                    )}

                    {/* Sovereign Dot */}
                    <circle
                      cx={x}
                      cy={sY}
                      r={isHovered ? '6.5' : '4.5'}
                      fill={alertItem.isBreached ? '#ef4444' : '#f43f5e'}
                      stroke="#0f172a"
                      strokeWidth="2"
                    />
                  </g>
                );
              })}
            </svg>

            {hoveredMaturity !== null && (
              <div className="absolute top-3 right-3 bg-slate-900/98 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs font-mono space-y-1.5 z-10 backdrop-blur-md">
                <div className="text-white font-bold border-b border-slate-800 pb-1 flex items-center justify-between gap-4">
                  <span>Tenor: {maturities[hoveredMaturity]}</span>
                  {tenorAlertAnalysis[hoveredMaturity]?.isBreached && (
                    <span className="text-[11px] text-rose-300 bg-rose-950 px-2 py-0.5 rounded border border-rose-700 font-bold">
                      EXCEEDS THRESHOLD
                    </span>
                  )}
                </div>
                <div className="flex justify-between gap-4 text-rose-400">
                  <span className="font-medium text-slate-300">Sovereign Yield:</span>
                  <span className="font-bold">{sovereignYields[hoveredMaturity].toFixed(2)}%</span>
                </div>
                <div className="flex justify-between gap-4 text-slate-300">
                  <span>{baselineMode === 'benchmark' ? 'Benchmark Yield:' : 'Pre-Shock Base:'}</span>
                  <span className="font-medium text-white">{tenorAlertAnalysis[hoveredMaturity]?.baselineYield.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between gap-4 text-amber-300 border-t border-slate-800 pt-1">
                  <span>Credit Spread:</span>
                  <span className="font-bold">+{spreadsBps[hoveredMaturity]} bps</span>
                </div>
                <div className={`flex justify-between gap-4 pt-1 border-t border-slate-800 ${
                  tenorAlertAnalysis[hoveredMaturity]?.isBreached ? 'text-rose-400 font-bold' : 'text-slate-300'
                }`}>
                  <span>vs Baseline (+{thresholdPct}% Limit):</span>
                  <span>
                    {tenorAlertAnalysis[hoveredMaturity]?.isBreached
                      ? `🚨 +${tenorAlertAnalysis[hoveredMaturity]?.divergencePct}% (BREACH)`
                      : `+${tenorAlertAnalysis[hoveredMaturity]?.divergencePct}% (OK)`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Tenor Spreads Table Strip */}
          <div className="overflow-x-auto rounded-lg border border-slate-800/80">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-950 text-slate-300 border-b border-slate-800">
                  <th className="py-2 px-3 font-semibold">Tenor</th>
                  {maturities.map(m => (
                    <th key={m} className="py-2 px-2 text-right font-mono font-bold text-white">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                <tr className="bg-slate-900/60">
                  <td className="py-2 px-3 text-slate-200 font-medium">Sovereign</td>
                  {tenorAlertAnalysis.map((item, i) => (
                    <td key={i} className="py-2 px-2 text-right font-bold text-rose-400">
                      {item.sovereignYield.toFixed(2)}%
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-300">
                    {baselineMode === 'benchmark' ? 'Benchmark' : 'Pre-Shock Base'}
                  </td>
                  {tenorAlertAnalysis.map((item, i) => (
                    <td key={i} className="py-2 px-2 text-right text-slate-300">
                      {item.baselineYield.toFixed(2)}%
                    </td>
                  ))}
                </tr>
                <tr className="bg-slate-900/40">
                  <td className="py-2 px-3 text-slate-300">Credit Spread</td>
                  {spreadsBps.map((s, i) => (
                    <td key={i} className="py-2 px-2 text-right text-amber-300 font-bold">+{s} bp</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-300 font-medium">
                    Divergence %
                  </td>
                  {tenorAlertAnalysis.map((item, i) => (
                    <td key={i} className="py-2 px-2 text-right">
                      <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                        item.isBreached
                          ? 'bg-rose-950 text-rose-200 border border-rose-600 animate-pulse'
                          : 'text-slate-300'
                      }`}>
                        {item.divergencePct > 0 ? `+${item.divergencePct}%` : `${item.divergencePct}%`}
                      </span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* CDS Spread Monitor */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white">
              5Y Sovereign Credit Default Swap (CDS) Timeline
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              30-day market-implied default risk spread trajectory (Basis Points)
            </p>
          </div>

          <div className="w-full overflow-hidden bg-slate-950/80 rounded-lg p-2 border border-slate-800">
            <svg viewBox={`0 0 ${cdsWidth} ${cdsHeight}`} className="w-full h-auto select-none">
              {/* CDS Grid */}
              {[minCds, (minCds + maxCds) / 2, maxCds].map((val, idx) => (
                <g key={idx}>
                  <line
                    x1={cdsPadL}
                    y1={getCdsY(val)}
                    x2={cdsWidth - cdsPadR}
                    y2={getCdsY(val)}
                    stroke="#1e293b"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={cdsPadL - 6}
                    y={getCdsY(val) + 4}
                    textAnchor="end"
                    fill="#94a3b8"
                    fontSize="11"
                    fontWeight="500"
                    fontFamily="monospace"
                  >
                    {Math.round(val)}
                  </text>
                </g>
              ))}

              <path
                d={cdsPath}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
              />

              {/* Start & End Dots */}
              <circle cx={getCdsX(0)} cy={getCdsY(cdsHistory[0].spread)} r="4" fill="#f59e0b" />
              <circle cx={getCdsX(cdsHistory.length - 1)} cy={getCdsY(latestCds)} r="5" fill="#f59e0b" stroke="#0f172a" strokeWidth="2" />
            </svg>
          </div>

          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg space-y-2.5 text-xs shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-medium">Implied 5Y Cumulative Default Probability</span>
              <span className="font-mono font-bold text-rose-400 text-sm">
                {((1 - Math.exp(-latestCds * 0.0001 * 5 / (1 - 0.4))) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Standard ISDA Recovery Rate Assumption</span>
              <span className="font-mono font-semibold text-white">40.0% (EM Sovereign Standard)</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>FRED API Data Series Mapping</span>
              <span className="font-mono font-bold text-indigo-300">{liveGs10 !== undefined ? `GS10 ${liveGs10.toFixed(2)}% · DGS2 ${liveDgs2?.toFixed(2) ?? '—'}%` : fredError ? 'FRED unavailable' : 'Loading FRED…'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* IMF SDMX-JSON Debt-to-GDP Integration Card */}
      <IMFDebtMetricsCard countryIso3={sovereign.country_iso_alpha3} />

      {/* Global Sovereign Debt Risk Heatmap (Recharts) */}
      <SovereignRiskHeatmap
        currentCountryIso={sovereign.country_iso_alpha3}
        onSelectCountry={onSelectCountry}
      />
    </div>
  );
};
