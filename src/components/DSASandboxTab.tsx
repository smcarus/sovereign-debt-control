import React, { useState, useMemo } from 'react';
import { SovereignEntity, DSAParams } from '../types/sovereign';
import { computeDSATrajectory, generateStressFanScenarios } from '../engine/dsaEngine';
import { AlertTriangle, CheckCircle2, TrendingUp, Sliders, ShieldAlert, Sparkles } from 'lucide-react';

interface DSASandboxTabProps {
  sovereign: SovereignEntity;
}

export const DSASandboxTab: React.FC<DSASandboxTabProps> = ({ sovereign }) => {
  const [dInitial, setDInitial] = useState<number>(sovereign.initial_debt_to_gdp);
  const [rShock, setRShock] = useState<number>(5.5);
  const [gShock, setGShock] = useState<number>(2.8);
  const [pShock, setPShock] = useState<number>(1.2);
  const [stockFlow, setStockFlow] = useState<number>(0.0);
  const [horizon, setHorizon] = useState<number>(10);
  const [guidanceCeiling, setGuidanceCeiling] = useState<number>(60.0);
  const [activeView, setActiveView] = useState<'deterministic' | 'stress-fan'>('deterministic');

  // Sync initial debt if sovereign changes
  React.useEffect(() => {
    setDInitial(sovereign.initial_debt_to_gdp);
  }, [sovereign]);

  const params: DSAParams = useMemo(() => ({
    d_initial: dInitial,
    r_nominal: rShock,
    g_nominal_growth: gShock,
    p_primary_balance: pShock,
    stock_flow_adjustment: stockFlow,
    horizon_years: horizon,
  }), [dInitial, rShock, gShock, pShock, stockFlow, horizon]);

  const { trajectory, terminal_debt_ratio, stabilizing_primary_balance, is_sustainable, snowball_cumulative } = useMemo(() => {
    return computeDSATrajectory(params);
  }, [params]);

  const fanScenarios = useMemo(() => {
    return generateStressFanScenarios(params);
  }, [params]);

  // SVG Chart Dimensions
  const width = 640;
  const height = 300;
  const padL = 50;
  const padR = 30;
  const padT = 30;
  const padB = 40;

  const allPoints = activeView === 'deterministic' 
    ? trajectory.map(t => t.debt_ratio) 
    : fanScenarios.flatMap(s => s.points);
  
  const minVal = Math.max(0, Math.min(...allPoints, guidanceCeiling) - 5);
  const maxVal = Math.max(...allPoints, guidanceCeiling) + 10;

  const getX = (yearIdx: number) => padL + (yearIdx / horizon) * (width - padL - padR);
  const getY = (val: number) => height - padB - ((val - minVal) / (maxVal - minVal)) * (height - padT - padB);

  // Trajectory Path
  const trajPath = trajectory
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(pt.debt_ratio)}`)
    .join(' ');

  // Ceiling line
  const ceilingY = getY(guidanceCeiling);

  // Interest-growth differential (snowball rate)
  const rMinusG = Number((rShock - gShock).toFixed(2));
  const fiscalGap = Number((stabilizing_primary_balance - pShock).toFixed(2));

  return (
    <div className="space-y-6">
      {/* Formula & Explanation Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>Debt-to-GDP Structural Law-of-Motion Engine</span>
              <span className="text-slate-400 font-normal">| DSA Standard Model</span>
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-1">
              d_t = [ (1 + r_t) / (1 + g_t) ] · d_{'{t-1}'} - p_t + ε_t
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('deterministic')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                activeView === 'deterministic'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Deterministic Path
            </button>
            <button
              onClick={() => setActiveView('stress-fan')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                activeView === 'stress-fan'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Multi-Scenario Stress Fan
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Control Column (Sliders & Parameters) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Shock Parameter Array Inputs
            </span>
            <button
              onClick={() => {
                setDInitial(sovereign.initial_debt_to_gdp);
                setRShock(5.5);
                setGShock(2.8);
                setPShock(1.2);
                setStockFlow(0.0);
                setHorizon(10);
              }}
              className="text-[11px] text-slate-400 hover:text-white"
            >
              Reset Shocks
            </button>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Initial Debt-to-GDP (d₀ %)</span>
              <span className="font-mono font-semibold text-white">{dInitial.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="20.0"
              max="160.0"
              step="0.5"
              value={dInitial}
              onChange={(e) => setDInitial(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Effective Nominal Rate (r %)</span>
              <span className="font-mono font-semibold text-rose-400">{rShock.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="16.0"
              step="0.1"
              value={rShock}
              onChange={(e) => setRShock(parseFloat(e.target.value))}
              className="w-full accent-rose-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Nominal GDP Growth (g %)</span>
              <span className="font-mono font-semibold text-emerald-400">{gShock.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="-4.0"
              max="12.0"
              step="0.1"
              value={gShock}
              onChange={(e) => setGShock(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Primary Balance / GDP (p %)</span>
              <span className="font-mono font-semibold text-indigo-400">
                {pShock >= 0 ? `+${pShock.toFixed(1)}%` : `${pShock.toFixed(1)}%`}
              </span>
            </div>
            <input
              type="range"
              min="-6.0"
              max="6.0"
              step="0.1"
              value={pShock}
              onChange={(e) => setPShock(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
            <div className="text-[10px] text-slate-500 mt-0.5">
              Positive values indicate primary surplus; negative indicate deficit
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Stock-Flow Adjustment (ε %)</span>
              <span className="font-mono font-semibold text-amber-400">
                {stockFlow >= 0 ? `+${stockFlow.toFixed(1)}%` : `${stockFlow.toFixed(1)}%`}
              </span>
            </div>
            <input
              type="range"
              min="-3.0"
              max="8.0"
              step="0.5"
              value={stockFlow}
              onChange={(e) => setStockFlow(parseFloat(e.target.value))}
              className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
            <div className="text-[10px] text-slate-500 mt-0.5">
              FX depreciation valuation shocks & contingent bank liabilities
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Horizon (Years)</label>
              <select
                value={horizon}
                onChange={(e) => setHorizon(parseInt(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              >
                <option value={5}>5 Years</option>
                <option value={10}>10 Years</option>
                <option value={15}>15 Years</option>
                <option value={20}>20 Years</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Risk Ceiling (%)</label>
              <select
                value={guidanceCeiling}
                onChange={(e) => setGuidanceCeiling(parseFloat(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              >
                <option value={60.0}>60.0% (Maastricht)</option>
                <option value={70.0}>70.0% (IMF EM)</option>
                <option value={85.0}>85.0% (Stress Mark)</option>
              </select>
            </div>
          </div>

          {/* Quick Mathematical Summary */}
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg text-xs space-y-1.5 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">(r - g) Differential:</span>
              <span className={rMinusG > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                {rMinusG > 0 ? `+${rMinusG}%` : `${rMinusG}%`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Stabilizing Surplus (p*):</span>
              <span className="text-amber-300 font-bold">{stabilizing_primary_balance}% GDP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Primary Fiscal Gap (p* - p):</span>
              <span className={fiscalGap > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                {fiscalGap > 0 ? `-${fiscalGap}% (Deficit)` : `+${Math.abs(fiscalGap)}% (Surplus)`}
              </span>
            </div>
          </div>
        </div>

        {/* Right Graph & Analysis Column */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {activeView === 'deterministic'
                    ? 'Projected Sovereign Debt-to-GDP Trajectory'
                    : 'Macro Stress Testing Scenarios Fan'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Forward horizon simulation from 2026 to {2026 + horizon}
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-blue-400">
                  <span className="w-3 h-0.5 bg-blue-500 inline-block" /> Projected Path
                </span>
                <span className="flex items-center gap-1.5 text-rose-400">
                  <span className="w-3 h-0.5 bg-rose-500 border-b border-dotted inline-block" /> Risk Guidance ({guidanceCeiling}%)
                </span>
              </div>
            </div>

            {/* SVG Visualizer */}
            <div className="relative w-full overflow-hidden bg-slate-950/60 rounded-lg p-3 border border-slate-800/80">
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
                {/* Horizontal reference grid */}
                {[minVal, (minVal + maxVal) / 2, maxVal].map((val, idx) => (
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
                      x={padL - 8}
                      y={getY(val) + 4}
                      textAnchor="end"
                      fill="#64748b"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {Math.round(val)}%
                    </text>
                  </g>
                ))}

                {/* Risk Guidance Ceiling Line */}
                <line
                  x1={padL}
                  y1={ceilingY}
                  x2={width - padR}
                  y2={ceilingY}
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <text
                  x={width - padR}
                  y={ceilingY - 6}
                  textAnchor="end"
                  fill="#ef4444"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  Ceiling {guidanceCeiling}%
                </text>

                {activeView === 'deterministic' ? (
                  <>
                    {/* Primary Trajectory */}
                    <path
                      d={trajPath}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="3.5"
                    />

                    {/* Points on Trajectory */}
                    {trajectory.map((pt, i) => (
                      <g key={i}>
                        <circle
                          cx={getX(i)}
                          cy={getY(pt.debt_ratio)}
                          r="4"
                          fill="#3b82f6"
                          stroke="#0f172a"
                          strokeWidth="2"
                        />
                        {i % 2 === 0 && (
                          <text
                            x={getX(i)}
                            y={getY(pt.debt_ratio) - 10}
                            textAnchor="middle"
                            fill="#93c5fd"
                            fontSize="10"
                            fontFamily="monospace"
                          >
                            {pt.debt_ratio.toFixed(1)}%
                          </text>
                        )}
                      </g>
                    ))}
                  </>
                ) : (
                  <>
                    {/* Stress Fan Scenarios */}
                    {fanScenarios.map((scen, sIdx) => {
                      const pathStr = scen.points
                        .map((val, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(val)}`)
                        .join(' ');

                      return (
                        <path
                          key={sIdx}
                          d={pathStr}
                          fill="none"
                          stroke={scen.color}
                          strokeWidth="2.5"
                          opacity={sIdx === 0 ? 1 : 0.85}
                        />
                      );
                    })}
                  </>
                )}

                {/* X Axis years */}
                {Array.from({ length: horizon + 1 }).map((_, i) => (
                  <text
                    key={i}
                    x={getX(i)}
                    y={height - padB + 18}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    t+{i}
                  </text>
                ))}
              </svg>
            </div>

            {/* Bottom Trajectory Diagnostic Alert */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                <span className="text-xs text-slate-400">Terminal Debt-to-GDP (Year {horizon})</span>
                <div className={`text-xl font-bold font-mono mt-1 ${terminal_debt_ratio > guidanceCeiling ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {terminal_debt_ratio.toFixed(1)}%
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {terminal_debt_ratio > dInitial ? `+${(terminal_debt_ratio - dInitial).toFixed(1)}% net expansion` : `-${(dInitial - terminal_debt_ratio).toFixed(1)}% reduction`}
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                <span className="text-xs text-slate-400">Cumulative Snowball Impact</span>
                <div className={`text-xl font-bold font-mono mt-1 ${snowball_cumulative > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {snowball_cumulative > 0 ? `+${snowball_cumulative.toFixed(1)}%` : `${snowball_cumulative.toFixed(1)}%`}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Autonomous debt drift from (r - g)
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                <span className="text-xs text-slate-400">Solvency Condition</span>
                <div className="flex items-center gap-1.5 mt-1">
                  {is_sustainable ? (
                    <span className="text-emerald-400 font-semibold text-sm flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Sustainable Path
                    </span>
                  ) : (
                    <span className="text-rose-400 font-semibold text-sm flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> Explosive Dynamics
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Requires {stabilizing_primary_balance}% surplus to anchor
                </div>
              </div>
            </div>
          </div>

          {/* Scenario Table / Breakdown */}
          {activeView === 'stress-fan' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                Stress Scenario Comparison Matrix (Horizon Year {2026 + horizon})
              </h4>
              <div className="space-y-2">
                {fanScenarios.map((scen, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: scen.color }} />
                      <div>
                        <span className="font-semibold text-white">{scen.scenario_name}</span>
                        <p className="text-[11px] text-slate-400">{scen.description}</p>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-sm font-bold text-slate-200">
                        {scen.points[scen.points.length - 1].toFixed(1)}%
                      </span>
                      <div className="text-[10px] text-slate-500">
                        Δ { (scen.points[scen.points.length - 1] - dInitial).toFixed(1) }%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
