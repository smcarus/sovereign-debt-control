import React, { useState } from 'react';
import { SovereignEntity } from '../types/sovereign';
import {
  Globe,
  Sliders,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Lock,
  Layers,
  ArrowRight,
  TrendingUp,
  Network,
  BarChart3,
  ArrowRightLeft,
  Bot,
  Database,
  FileText,
  Server,
} from 'lucide-react';
import { GlobalRiskWatchlist } from './GlobalRiskWatchlist';

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
  onOpenAlerts?: () => void;
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
  onOpenAlerts,
}) => {
  const [showMacroControls, setShowMacroControls] = useState<boolean>(true);
  const [showModuleNav, setShowModuleNav] = useState<boolean>(false);

  const currentSovereign = sovereigns.find(s => s.country_iso_alpha3 === selectedIso) || sovereigns[0];

  const navItems = [
    { id: 'yield-curves', label: 'Yield Curves & Spreads', icon: TrendingUp },
    { id: 'correlation-matrix', label: 'Correlation Matrix', icon: Network },
    { id: 'dsa-sandbox', label: 'Debt Sustainability (DSA)', icon: BarChart3 },
    { id: 'refunding-swaps', label: 'Bond Refunding & Swaps', icon: ArrowRightLeft },
    { id: 'agent-console', label: 'Agentic AI Strategy Console', icon: Bot },
    { id: 'sql-studio', label: 'Hypertable & SQL Studio', icon: Database },
    { id: 'legal-covenants', label: 'Legal Covenants & ISDA', icon: FileText },
    { id: 'docker-api', label: 'Docker & API Gateway', icon: Server },
  ];

  const handleResetMacro = () => {
    setBaseInflation(currentSovereign.baseline_inflation);
    setBaseTaxRate(currentSovereign.effective_tax_rate);
  };

  // Color mapping for credit rating
  const getRatingBadgeColor = (rating: string) => {
    if (rating.startsWith('AAA') || rating.startsWith('AA')) return 'bg-emerald-950 text-emerald-300 border-emerald-700';
    if (rating.startsWith('A') || rating.startsWith('BBB')) return 'bg-blue-950 text-blue-300 border-blue-700';
    if (rating.startsWith('BB') || rating.startsWith('B')) return 'bg-amber-950 text-amber-300 border-amber-700';
    return 'bg-rose-950 text-rose-300 border-rose-700';
  };

  return (
    <aside className="w-72 xl:w-80 shrink-0 bg-slate-900/95 border-r border-slate-800 flex flex-col justify-between overflow-y-auto min-h-[calc(100vh-57px)] p-4 space-y-5">
      <div className="space-y-4">
        {/* Sovereign Selector */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 shadow-xs">
          <label className="flex items-center justify-between text-xs font-bold text-slate-200 uppercase tracking-wider mb-2">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span>Target Sovereign</span>
            </span>
            <span className="text-[11px] font-mono text-indigo-400 font-semibold">{selectedIso}</span>
          </label>
          <select
            value={selectedIso}
            onChange={(e) => onSelectIso(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer transition-colors"
          >
            {sovereigns.map((s) => (
              <option key={s.country_iso_alpha3} value={s.country_iso_alpha3}>
                {s.country_iso_alpha3} · {s.country_name}
              </option>
            ))}
          </select>
        </div>

        {/* Sovereign Key Profile Card */}
        <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
            <span className="text-slate-300 font-medium">Credit Rating</span>
            <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs border ${getRatingBadgeColor(currentSovereign.credit_rating)}`}>
              {currentSovereign.credit_rating}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">Nominal GDP</span>
            <span className="font-mono font-semibold text-white">
              ${currentSovereign.gdp_usd_billion}B USD
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">Debt-to-GDP Ratio</span>
            <div className="flex items-center gap-1.5">
              <span
                className={`font-mono font-bold text-sm ${
                  currentSovereign.initial_debt_to_gdp >= 80
                    ? 'text-rose-400'
                    : currentSovereign.initial_debt_to_gdp >= 60
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {currentSovereign.initial_debt_to_gdp.toFixed(1)}%
              </span>
              {onOpenAlerts && (
                <button
                  onClick={onOpenAlerts}
                  title="Configure alert limits & breach rules"
                  className={`text-[10px] font-mono px-1 py-0.2 rounded border transition-colors cursor-pointer ${
                    currentSovereign.initial_debt_to_gdp >= 80
                      ? 'bg-rose-950/80 text-rose-300 border-rose-800 hover:bg-rose-900'
                      : currentSovereign.initial_debt_to_gdp >= 60
                      ? 'bg-amber-950/80 text-amber-300 border-amber-800 hover:bg-amber-900'
                      : 'bg-emerald-950/80 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
                  }`}
                >
                  {currentSovereign.initial_debt_to_gdp >= 80 ? 'BREACH' : currentSovereign.initial_debt_to_gdp >= 60 ? 'WARN' : 'OK'}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">FX Reserves</span>
            <span className="font-mono font-semibold text-slate-100">
              {currentSovereign.fx_reserve_months} Mo. Imports
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
            <span className="text-slate-300 font-medium">Market Debt Stock</span>
            <span className="font-mono font-semibold text-slate-100">
              ${(totalBondDebtUsdM / 1000).toFixed(2)}B USD
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">Swap Overlays</span>
            <span className="font-mono font-semibold text-indigo-300">
              ${totalSwapNotionalUsdM}M Notional
            </span>
          </div>
        </div>

        {/* Global Risk Watchlist Widget */}
        <GlobalRiskWatchlist
          sovereigns={sovereigns}
          selectedIso={selectedIso}
          onSelectIso={onSelectIso}
        />

        {/* Macroeconomic Baselines Accordion / Controls */}
        <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl overflow-hidden shadow-xs">
          <div
            onClick={() => setShowMacroControls(!showMacroControls)}
            className="p-3 bg-slate-900/80 flex items-center justify-between cursor-pointer select-none hover:bg-slate-900 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs font-bold text-white tracking-wide">Macro Baselines</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleResetMacro();
                }}
                title="Reset to sovereign baseline"
                className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset</span>
              </button>
              {showMacroControls ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </div>
          </div>

          {showMacroControls && (
            <div className="p-3 space-y-3 border-t border-slate-800">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-300 font-medium">Target Inflation Rate</span>
                  <span className="font-mono font-bold text-white bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                    {baseInflation.toFixed(1)}%
                  </span>
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
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-300 font-medium">Effective Tax Rate</span>
                  <span className="font-mono font-bold text-white bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                    {baseTaxRate.toFixed(1)}%
                  </span>
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
          )}
        </div>

        {/* Quick Module Switcher (Accessible in Sidebar on all screen sizes) */}
        <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl overflow-hidden shadow-xs">
          <div
            onClick={() => setShowModuleNav(!showModuleNav)}
            className="p-3 bg-slate-900/80 flex items-center justify-between cursor-pointer select-none hover:bg-slate-900 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs font-bold text-white tracking-wide">Platform Modules</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950 px-1.5 py-0.5 rounded">
                8 Tabs
              </span>
              {showModuleNav ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </div>
          </div>

          {showModuleNav && (
            <div className="p-2 space-y-1 border-t border-slate-800">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Local-first Isolation Compliance Footer */}
      <div className="pt-3 border-t border-slate-800/90 text-xs text-slate-300 space-y-2.5">
        <button
          onClick={() => setActiveTab('docker-api')}
          className="w-full py-2 px-3 rounded-lg bg-indigo-950/80 hover:bg-indigo-900/70 border border-indigo-800/90 text-indigo-200 font-medium text-xs flex items-center justify-between transition-colors cursor-pointer shadow-xs"
        >
          <span className="flex items-center gap-1.5 font-medium">
            <span>🐳</span> Docker & Live APIs
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-indigo-300" />
        </button>

        <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
          <Lock className="w-3.5 h-3.5" />
          <span>Local-First Isolation</span>
        </div>
        <p className="text-slate-400 leading-relaxed text-[11px]">
          TimescaleDB & Deterministic Math engines running locally. Zero external telemetry egress.
        </p>
      </div>
    </aside>
  );
};
