import React from 'react';
import {
  Activity,
  Download,
  RefreshCw,
  TrendingUp,
  Network,
  BarChart3,
  ArrowRightLeft,
  Bot,
  Database,
  FileText,
  Server,
  ChevronDown,
  Bell,
  AlertTriangle,
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  targetCountryName: string;
  onExportReport: () => void;
  onRefreshData: () => void;
  onOpenAlerts?: () => void;
  alertCount?: number;
  hasCriticalAlert?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  targetCountryName,
  onExportReport,
  onRefreshData,
  onOpenAlerts,
  alertCount = 0,
  hasCriticalAlert = false,
}) => {
  const navTabs = [
    { id: 'yield-curves', label: 'Yield Curves', icon: TrendingUp },
    { id: 'correlation-matrix', label: 'Correlation Matrix', icon: Network },
    { id: 'dsa-sandbox', label: 'DSA Sandbox', icon: BarChart3 },
    { id: 'refunding-swaps', label: 'Refunding & Swaps', icon: ArrowRightLeft },
    { id: 'agent-console', label: 'Agentic AI', icon: Bot },
    { id: 'sql-studio', label: 'SQL Studio', icon: Database },
    { id: 'legal-covenants', label: 'Covenants & CAC', icon: FileText },
    { id: 'docker-api', label: 'Docker & APIs', icon: Server },
  ];

  const currentTabObj = navTabs.find(t => t.id === activeTab) || navTabs[0];

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 sm:px-6 py-2.5 bg-slate-900/98 backdrop-blur-md border-b border-slate-800 shadow-md">
      {/* Zone 1: Wordmark & Active Sovereign Context */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-indigo-600/25 border border-indigo-500/50 flex items-center justify-center text-indigo-400 shadow-inner">
          <Activity className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-bold tracking-tight text-white whitespace-nowrap">
              Sovereign Control Tower
            </span>
            <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800/80">
              {targetCountryName.split(' ')[0]}
            </span>
          </div>
          <span className="text-[11px] text-slate-300 font-mono flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-xs shadow-emerald-400/50 animate-pulse" />
            <span className="text-slate-300">Air-Gapped Local Infrastructure</span>
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation Links (Responsive Scrollable Segmented Bar) */}
      <div className="flex-1 max-w-4xl mx-2 hidden md:block">
        <nav className="flex items-center gap-1 p-1 bg-slate-950/90 border border-slate-800 rounded-xl overflow-x-auto no-scrollbar">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-900/50'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
                title={tab.label}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile/Tablet dropdown for quick tab switching */}
      <div className="md:hidden">
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value)}
          className="bg-slate-950 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 font-medium focus:ring-1 focus:ring-indigo-500"
        >
          {navTabs.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
            </option>
          ))}
        </select>
      </div>

      {/* Zone 3: Primary Action Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Sovereign Debt Limit Alert Button */}
        {onOpenAlerts && (
          <button
            onClick={onOpenAlerts}
            title="Sovereign Fiscal Alert Manager: Debt-to-GDP limit breaches"
            className={`relative px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs ${
              hasCriticalAlert
                ? 'bg-rose-950/80 hover:bg-rose-900 border-rose-700/90 text-rose-200'
                : alertCount > 0
                ? 'bg-amber-950/80 hover:bg-amber-900 border-amber-700/90 text-amber-200'
                : 'bg-slate-800/80 hover:bg-slate-700/80 hover:text-white border-slate-700/80 text-slate-200'
            }`}
          >
            {hasCriticalAlert ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            ) : alertCount > 0 ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            ) : (
              <Bell className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span className="font-medium hidden sm:inline">Alerts</span>
            {alertCount > 0 && (
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                  hasCriticalAlert
                    ? 'bg-rose-600 text-white'
                    : 'bg-amber-600 text-slate-950'
                }`}
              >
                {alertCount}
              </span>
            )}
          </button>
        )}

        <button
          onClick={onRefreshData}
          title="Resynchronize local TimescaleDB state"
          className="px-2.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 hover:text-white border border-slate-700/80 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline font-medium">Sync DB</span>
        </button>

        <button
          onClick={onExportReport}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all whitespace-nowrap shrink-0 shadow-sm shadow-indigo-900/40 cursor-pointer flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="font-medium">Export Dossier</span>
        </button>
      </div>
    </header>
  );
};
