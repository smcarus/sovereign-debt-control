import React from 'react';
import { SovereignEntity } from '../types/sovereign';
import { Shield, Database, Landmark, Percent, DollarSign, Globe, Lock } from 'lucide-react';

interface SidebarProps {
  sovereigns: SovereignEntity[];
  selectedIso: string;
  onSelectIso: (iso: string) => void;
  baseInflation: number;
  setBaseInflation: (val: number) => void;
  baseTaxRate: number;
  setBaseTaxRate: (val: number) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  totalBondDebtUsdM: number;
  totalSwapNotionalUsdM: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sovereigns,
  selectedIso,
  onSelectIso,
  baseInflation,
  setBaseInflation,
  baseTaxRate,
  setBaseTaxRate,
  activeTab,
  setActiveTab,
  totalBondDebtUsdM,
  totalSwapNotionalUsdM,
}) => {
  const currentSovereign = sovereigns.find(s => s.country_iso_alpha3 === selectedIso) || sovereigns[0];

  const navItems = [
    { id: 'yield-curves', label: 'Yield Curves & Spreads', icon: '📈' },
    { id: 'dsa-sandbox', label: 'Debt Sustainability (DSA)', icon: '📊' },
    { id: 'refunding-swaps', label: 'Bond Refunding & Swaps', icon: '⛓️' },
    { id: 'agent-console', label: 'Agentic AI Strategy Console', icon: '🤖' },
    { id: 'sql-studio', label: 'Hypertable & SQL Studio', icon: '🗄️' },
    { id: 'legal-covenants', label: 'Legal Covenants & ISDA', icon: '📜' },
    { id: 'docker-api', label: 'Docker & API Gateway', icon: '🐳' },
  ];

  return (
    <aside className="w-72 shrink-0 bg-slate-900/90 border-r border-slate-800 flex flex-col justify-between overflow-y-auto min-h-[calc(100vh-61px)] p-4 space-y-6">
      <div className="space-y-5">
        {/* Sovereign Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Target Sovereign Entity
          </label>
          <select
            value={selectedIso}
            onChange={(e) => onSelectIso(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
          >
            {sovereigns.map((s) => (
              <option key={s.country_iso_alpha3} value={s.country_iso_alpha3}>
                {s.country_iso_alpha3} - {s.country_name}
              </option>
            ))}
          </select>
        </div>

        {/* Sovereign Key Profile Card */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80">
            <span className="text-slate-400">Credit Rating</span>
            <span className="font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-amber-300 text-[11px]">
              {currentSovereign.credit_rating}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Nominal GDP</span>
            <span className="font-mono font-medium text-slate-200">
              ${currentSovereign.gdp_usd_billion}B USD
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Debt-to-GDP Ratio</span>
            <span className="font-mono font-bold text-rose-400">
              {currentSovereign.initial_debt_to_gdp.toFixed(1)}%
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">FX Reserves</span>
            <span className="font-mono font-medium text-slate-300">
              {currentSovereign.fx_reserve_months} Mo. Imports
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
            <span className="text-slate-400">Market Debt Stock</span>
            <span className="font-mono font-semibold text-slate-200">
              ${(totalBondDebtUsdM / 1000).toFixed(2)}B
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Swap Notional Overlays</span>
            <span className="font-mono font-semibold text-indigo-300">
              ${totalSwapNotionalUsdM}M
            </span>
          </div>
        </div>

        {/* Global Macro Baselines Slider Inputs */}
        <div className="space-y-3.5 pt-2">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Macroeconomic Baselines
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Target Inflation Rate</span>
              <span className="font-mono font-semibold text-slate-200">{baseInflation.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="20.0"
              step="0.1"
              value={baseInflation}
              onChange={(e) => setBaseInflation(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Effective Tax Rate</span>
              <span className="font-mono font-semibold text-slate-200">{baseTaxRate.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="10.0"
              max="50.0"
              step="0.5"
              value={baseTaxRate}
              onChange={(e) => setBaseTaxRate(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Navigation list on smaller viewports */}
        <div className="xl:hidden pt-2 border-t border-slate-800 space-y-1">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Modules
          </div>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                activeTab === item.id
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Local-first Isolation Compliance Footer */}
      <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-2.5">
        <button
          onClick={() => setActiveTab('docker-api')}
          className="w-full py-2 px-3 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/60 border border-indigo-800/80 text-indigo-300 font-medium text-xs flex items-center justify-between transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <span>🐳</span> Docker & Live APIs
          </span>
          <span className="text-[10px] font-mono text-indigo-400">Configure</span>
        </button>

        <div className="flex items-center gap-2 text-emerald-400 font-medium">
          <Lock className="w-3.5 h-3.5" />
          <span>Local-First Isolation</span>
        </div>
        <p className="text-slate-500 leading-relaxed text-[11px]">
          TimescaleDB & Deterministic Math engines running locally. Zero external telemetry egress.
        </p>
      </div>
    </aside>
  );
};
