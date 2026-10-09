import React, { useState } from 'react';
import { SovereignEntity } from '../types/sovereign';
import { YIELD_CURVE_DATA, generateCDSTimeSeries } from '../data/mockDatabase';
import { TrendingUp, Activity, BarChart2, ArrowUpRight, ArrowDownRight, Layers, Sliders } from 'lucide-react';

interface YieldCurvesTabProps {
  sovereign: SovereignEntity;
}

export const YieldCurvesTab: React.FC<YieldCurvesTabProps> = ({ sovereign }) => {
  const [curveShiftBps, setCurveShiftBps] = useState<number>(0);
  const [hoveredMaturity, setHoveredMaturity] = useState<number | null>(null);

  const rawData = YIELD_CURVE_DATA[sovereign.country_iso_alpha3] || YIELD_CURVE_DATA['ALP'];
  const maturities = rawData.maturities;
  
  // Shifted sovereign yields
  const sovereignYields = rawData.sovereign_yields.map(y => Number((y + curveShiftBps / 100.0).toFixed(2)));
  const benchmarkYields = rawData.benchmark_yields;
  const spreadsBps = sovereignYields.map((sy, i) => Math.round((sy - benchmarkYields[i]) * 100));

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
  const padT = 25;
  const padB = 40;

  const minY = Math.min(...benchmarkYields, ...sovereignYields) - 0.5;
  const maxY = Math.max(...benchmarkYields, ...sovereignYields) + 1.0;

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
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">10Y Sovereign Benchmark Yield</div>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {yield10Y.toFixed(2)}%
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-mono">
            <span>Spread to US/Bund:</span>
            <span className="text-amber-400 font-semibold">+{spreadsBps[5]} bps</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">2s10s Curve Slope (Term Spread)</div>
          <div className={`text-2xl font-bold font-mono mt-1 ${isInverted ? 'text-rose-400' : 'text-emerald-400'}`}>
            {slope2s10s > 0 ? `+${slope2s10s}` : slope2s10s} bps
          </div>
          <div className="text-xs text-slate-400 mt-1 font-mono">
            {isInverted ? 'Inverted Curve (Recession/Distress signal)' : 'Normal Upward Sloping Curve'}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">5Y Sovereign CDS Spread</div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
            {latestCds} bps
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-mono">
            {cdsChange >= 0 ? (
              <span className="text-rose-400 flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5" /> +{cdsChange} bps (30d)
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center">
                <ArrowDownRight className="w-3.5 h-3.5" /> {cdsChange} bps (30d)
              </span>
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">Yield Curve Shift Stress Test</div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs font-mono text-indigo-400 font-semibold">
              {curveShiftBps > 0 ? `+${curveShiftBps}` : curveShiftBps} bps
            </span>
            <button
              onClick={() => setCurveShiftBps(0)}
              className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800 cursor-pointer"
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
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-3 h-0.5 bg-rose-500 inline-block" /> {sovereign.country_iso_alpha3} (Domestic)
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-3 h-0.5 bg-slate-500 border-b border-dashed inline-block" /> Benchmark
              </span>
            </div>
          </div>

          <div className="relative w-full overflow-hidden bg-slate-950/60 rounded-lg p-2 border border-slate-800/80">
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
                    fill="#64748b"
                    fontSize="10"
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
                stroke="#64748b"
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

                return (
                  <g key={mat} onMouseEnter={() => setHoveredMaturity(i)} onMouseLeave={() => setHoveredMaturity(null)} className="cursor-pointer">
                    <line
                      x1={x}
                      y1={padT}
                      x2={x}
                      y2={height - padB}
                      stroke={isHovered ? '#475569' : '#1e293b'}
                      strokeWidth={isHovered ? 1.5 : 1}
                      strokeDasharray={isHovered ? undefined : '2 2'}
                    />
                    <text
                      x={x}
                      y={height - padB + 16}
                      textAnchor="middle"
                      fill={isHovered ? '#f8fafc' : '#94a3b8'}
                      fontSize="11"
                      fontWeight={isHovered ? '600' : '400'}
                      fontFamily="monospace"
                    >
                      {mat}
                    </text>

                    {/* Benchmark Dot */}
                    <circle cx={x} cy={bY} r="3.5" fill="#64748b" />

                    {/* Sovereign Dot */}
                    <circle
                      cx={x}
                      cy={sY}
                      r={isHovered ? '6' : '4.5'}
                      fill="#f43f5e"
                      stroke="#0f172a"
                      strokeWidth="2"
                    />
                  </g>
                );
              })}
            </svg>

            {hoveredMaturity !== null && (
              <div className="absolute top-3 right-3 bg-slate-900/95 border border-slate-700/80 rounded-lg p-2.5 shadow-xl text-xs font-mono space-y-1">
                <div className="text-slate-300 font-semibold border-b border-slate-800 pb-1">
                  Tenor: {maturities[hoveredMaturity]}
                </div>
                <div className="flex justify-between gap-4 text-rose-400">
                  <span>Sovereign Yield:</span>
                  <span className="font-bold">{sovereignYields[hoveredMaturity].toFixed(2)}%</span>
                </div>
                <div className="flex justify-between gap-4 text-slate-400">
                  <span>Benchmark:</span>
                  <span>{benchmarkYields[hoveredMaturity].toFixed(2)}%</span>
                </div>
                <div className="flex justify-between gap-4 text-amber-300 border-t border-slate-800 pt-1">
                  <span>Credit Spread:</span>
                  <span className="font-bold">+{spreadsBps[hoveredMaturity]} bps</span>
                </div>
              </div>
            )}
          </div>

          {/* Tenor Spreads Table Strip */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="py-1.5 font-medium">Tenor</th>
                  {maturities.map(m => (
                    <th key={m} className="py-1.5 text-right font-mono font-medium">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                <tr>
                  <td className="py-2 text-slate-300 font-medium">Sovereign</td>
                  {sovereignYields.map((y, i) => (
                    <td key={i} className="py-2 text-right text-rose-400 font-semibold">{y.toFixed(2)}%</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 text-slate-400">Benchmark</td>
                  {benchmarkYields.map((y, i) => (
                    <td key={i} className="py-2 text-right text-slate-400">{y.toFixed(2)}%</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 text-slate-400">Spread</td>
                  {spreadsBps.map((s, i) => (
                    <td key={i} className="py-2 text-right text-amber-300 font-semibold">+{s} bp</td>
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

          <div className="w-full overflow-hidden bg-slate-950/60 rounded-lg p-2 border border-slate-800/80">
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
                    fill="#64748b"
                    fontSize="10"
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

          <div className="p-3 bg-slate-950/50 border border-slate-800/80 rounded-lg space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Implied 5Y Cumulative Default Probability</span>
              <span className="font-mono font-bold text-rose-400">
                {((1 - Math.exp(-latestCds * 0.0001 * 5 / (1 - 0.4))) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Standard ISDA Recovery Rate Assumption</span>
              <span className="font-mono text-slate-200">40.0% (EM Sovereign Standard)</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>FRED API Data Series Mapping</span>
              <span className="font-mono text-indigo-400">GS10 / SOFR / BAMLH0A0HYM2</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
