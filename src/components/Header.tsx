import React from 'react';
import { ShieldCheck, Download, Activity, RefreshCw } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  targetCountryName: string;
  onExportReport: () => void;
  onRefreshData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  targetCountryName,
  onExportReport,
  onRefreshData,
}) => {
  const navTabs = [
    { id: 'yield-curves', label: 'Yield Curves & Spreads' },
    { id: 'dsa-sandbox', label: 'Debt Sustainability (DSA)' },
    { id: 'refunding-swaps', label: 'Bond Refunding & Swaps' },
    { id: 'agent-console', label: 'Agentic AI Console' },
    { id: 'sql-studio', label: 'Hypertable & SQL Studio' },
    { id: 'legal-covenants', label: 'Legal Covenants & ISDA' },
    { id: 'docker-api', label: 'Docker & API Gateway' },
  ];

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-900/95 backdrop-blur border-b border-slate-800">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
          <Activity className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
            Sovereign Fiscal & Debt Control Tower
          </span>
          <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Air-Gapped Local Infrastructure · {targetCountryName.split(' ')[0]}
          </span>
        </div>
      </div>

      {/* Zone 2: Clean single-line text navigation links */}
      <nav className="hidden xl:flex items-center gap-1 p-1 bg-slate-950/70 border border-slate-800/80 rounded-lg">
        {navTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Primary action button & actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onRefreshData}
          title="Resynchronize local TimescaleDB state"
          className="p-2 text-xs font-medium text-slate-400 bg-slate-800/70 hover:bg-slate-800 hover:text-white border border-slate-700/60 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-xs">Sync DB</span>
        </button>

        <button
          onClick={onExportReport}
          className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm shadow-indigo-900/30 cursor-pointer flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Dossier</span>
        </button>
      </div>
    </header>
  );
};
