import React, { useState, useEffect } from 'react';
import { SovereignEntity } from '../types/sovereign';
import {
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  Bell,
  X,
  Sliders,
  ExternalLink,
  BarChart3,
  CheckCircle2,
  Volume2,
  VolumeX,
  RotateCcw,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export interface AlertThresholdConfig {
  warningThreshold: number; // e.g. 60%
  criticalThreshold: number; // e.g. 80%
  activePreset: 'maastricht' | 'imf_em' | 'sp_vulnerable' | 'custom';
  bannerEnabled: boolean;
  soundEnabled: boolean;
}

export interface BreachLogItem {
  id: string;
  timestamp: string;
  iso: string;
  countryName: string;
  debtRatio: number;
  breachType: 'WARNING' | 'CRITICAL';
  thresholdValue: number;
  delta: number;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
}

interface AlertManagerProps {
  sovereigns: SovereignEntity[];
  selectedSovereign: SovereignEntity;
  onSelectSovereign: (iso: string) => void;
  onNavigateTab: (tabId: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  // External simulated stress modifier (if any)
  stressDelta?: number;
  setStressDelta?: (val: number) => void;
}

export const AlertManager: React.FC<AlertManagerProps> = ({
  sovereigns,
  selectedSovereign,
  onSelectSovereign,
  onNavigateTab,
  isOpen,
  onClose,
  onOpen,
  stressDelta = 0,
  setStressDelta,
}) => {
  // Alert Threshold configuration state
  const [config, setConfig] = useState<AlertThresholdConfig>({
    warningThreshold: 60.0,
    criticalThreshold: 80.0,
    activePreset: 'maastricht',
    bannerEnabled: true,
    soundEnabled: false,
  });

  // Local simulated shock state if setStressDelta is not provided
  const [localStress, setLocalStress] = useState<number>(0);
  const activeStress = setStressDelta ? stressDelta : localStress;
  const updateStress = (val: number) => {
    if (setStressDelta) {
      setStressDelta(val);
    } else {
      setLocalStress(val);
    }
  };

  // State to track acknowledged breach for the current sovereign session
  const [acknowledgedSovereigns, setAcknowledgedSovereigns] = useState<Record<string, boolean>>({});
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(false);
  const [showDetailsDropdown, setShowDetailsDropdown] = useState<boolean>(false);

  // Breach historical audit log
  const [breachLogs, setBreachLogs] = useState<BreachLogItem[]>([
    {
      id: 'log-1',
      timestamp: new Date(Date.now() - 1000 * 60 * 35).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      iso: 'BET',
      countryName: 'Sovereign Beta',
      debtRatio: 112.4,
      breachType: 'CRITICAL',
      thresholdValue: 80.0,
      delta: 32.4,
      status: 'ACTIVE',
    },
    {
      id: 'log-2',
      timestamp: new Date(Date.now() - 1000 * 60 * 95).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      iso: 'GAM',
      countryName: 'Sovereign Gamma',
      debtRatio: 89.2,
      breachType: 'CRITICAL',
      thresholdValue: 80.0,
      delta: 9.2,
      status: 'ACTIVE',
    },
  ]);

  // Current effective debt-to-GDP for selected sovereign
  const effectiveDebtToGdp = Number((selectedSovereign.initial_debt_to_gdp + activeStress).toFixed(1));

  // Determine current breach tier for selected sovereign
  const isCritical = effectiveDebtToGdp >= config.criticalThreshold;
  const isWarning = !isCritical && effectiveDebtToGdp >= config.warningThreshold;
  const isSafe = !isCritical && !isWarning;

  // Calculate breach magnitude
  const thresholdExceeded = isCritical ? config.criticalThreshold : config.warningThreshold;
  const breachDelta = Number((effectiveDebtToGdp - thresholdExceeded).toFixed(1));
  const excessPct = ((breachDelta / thresholdExceeded) * 100).toFixed(1);

  // When selected sovereign changes or stress changes, reset dismissed status if a breach exists
  useEffect(() => {
    setIsBannerDismissed(false);
  }, [selectedSovereign.country_iso_alpha3, activeStress]);

  // Log breach when state shifts to warning or critical
  useEffect(() => {
    if (isCritical || isWarning) {
      const type = isCritical ? 'CRITICAL' : 'WARNING';
      const thresh = isCritical ? config.criticalThreshold : config.warningThreshold;
      const deltaVal = Number((effectiveDebtToGdp - thresh).toFixed(1));
      
      setBreachLogs(prev => {
        // avoid duplicate entries in quick succession
        const last = prev[0];
        if (last && last.iso === selectedSovereign.country_iso_alpha3 && last.breachType === type && Math.abs(last.debtRatio - effectiveDebtToGdp) < 0.2) {
          return prev;
        }
        const newLog: BreachLogItem = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          iso: selectedSovereign.country_iso_alpha3,
          countryName: selectedSovereign.country_name.split(' (')[0],
          debtRatio: effectiveDebtToGdp,
          breachType: type,
          thresholdValue: thresh,
          delta: deltaVal,
          status: 'ACTIVE',
        };
        return [newLog, ...prev.slice(0, 19)];
      });
    }
  }, [effectiveDebtToGdp, isCritical, isWarning, selectedSovereign.country_iso_alpha3, config.criticalThreshold, config.warningThreshold]);

  // Apply preset thresholds
  const handleApplyPreset = (preset: 'maastricht' | 'imf_em' | 'sp_vulnerable' | 'custom') => {
    if (preset === 'maastricht') {
      setConfig(prev => ({
        ...prev,
        activePreset: 'maastricht',
        warningThreshold: 60.0,
        criticalThreshold: 75.0,
      }));
    } else if (preset === 'imf_em') {
      setConfig(prev => ({
        ...prev,
        activePreset: 'imf_em',
        warningThreshold: 60.0,
        criticalThreshold: 70.0,
      }));
    } else if (preset === 'sp_vulnerable') {
      setConfig(prev => ({
        ...prev,
        activePreset: 'sp_vulnerable',
        warningThreshold: 70.0,
        criticalThreshold: 85.0,
      }));
    } else {
      setConfig(prev => ({ ...prev, activePreset: 'custom' }));
    }
  };

  // Count breaches across portfolio
  const portfolioBreaches = sovereigns.map(s => {
    const ratio = s.country_iso_alpha3 === selectedSovereign.country_iso_alpha3
      ? effectiveDebtToGdp
      : s.initial_debt_to_gdp;
    const crit = ratio >= config.criticalThreshold;
    const warn = !crit && ratio >= config.warningThreshold;
    return {
      sovereign: s,
      ratio,
      status: crit ? 'CRITICAL' : warn ? 'WARNING' : 'SAFE',
      delta: crit ? ratio - config.criticalThreshold : warn ? ratio - config.warningThreshold : 0,
    };
  });

  const totalCriticalCount = portfolioBreaches.filter(b => b.status === 'CRITICAL').length;
  const totalWarningCount = portfolioBreaches.filter(b => b.status === 'WARNING').length;

  const isAcknowledged = acknowledgedSovereigns[selectedSovereign.country_iso_alpha3] || false;
  const showBanner = config.bannerEnabled && !isSafe && !isBannerDismissed && !isAcknowledged;

  const handleAcknowledge = () => {
    setAcknowledgedSovereigns(prev => ({
      ...prev,
      [selectedSovereign.country_iso_alpha3]: true,
    }));
  };

  const handleClearAcknowledgement = () => {
    setAcknowledgedSovereigns(prev => ({
      ...prev,
      [selectedSovereign.country_iso_alpha3]: false,
    }));
  };

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          1. SYSTEM-WIDE NOTIFICATION BANNER (Always rendered at top)
          ───────────────────────────────────────────────────────────── */}
      {showBanner && (
        <aside
          role="region"
          aria-label="Debt Limit Breach Alert Banner"
          className={`w-full z-25 transition-all duration-300 border-b shadow-lg animate-in fade-in slide-in-from-top-1 ${
            isCritical
              ? 'bg-rose-950/95 border-rose-600/80 text-rose-50'
              : 'bg-amber-950/95 border-amber-600/80 text-amber-50'
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {/* Left Zone: Pulsing indicator, Badge, and Message */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border shadow-xs ${
                    isCritical
                      ? 'bg-rose-600/30 border-rose-500 text-rose-300'
                      : 'bg-amber-600/30 border-amber-500 text-amber-300'
                  }`}
                >
                  {isCritical ? (
                    <AlertOctagon className="w-4 h-4 animate-pulse" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 animate-bounce" />
                  )}
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                        isCritical
                          ? 'bg-rose-900/90 text-rose-200 border-rose-700'
                          : 'bg-amber-900/90 text-amber-200 border-amber-700'
                      }`}
                    >
                      {isCritical ? 'Critical Debt Limit Breach' : 'Debt Ceiling Warning'}
                    </span>

                    <span className="text-xs font-semibold text-white tracking-tight">
                      {selectedSovereign.country_iso_alpha3} • {selectedSovereign.country_name.split(' (')[0]}
                    </span>

                    <span
                      className={`text-xs font-mono font-bold px-1.5 py-0.2 rounded ${
                        isCritical ? 'bg-rose-500/20 text-rose-200' : 'bg-amber-500/20 text-amber-200'
                      }`}
                    >
                      {effectiveDebtToGdp}% of GDP
                    </span>

                    <span className="text-xs font-medium text-slate-200">
                      (exceeds {thresholdExceeded}% threshold by{' '}
                      <strong className="text-white font-mono">+{breachDelta}%</strong> / +{excessPct}% margin)
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 truncate mt-0.5">
                    Sovereign fiscal sustainability perimeter violated under current macro policy parameters.
                    {activeStress !== 0 && (
                      <span className="ml-1 text-amber-300 font-mono font-medium">
                        (Active stress adjustment: {activeStress > 0 ? `+${activeStress}%` : `${activeStress}%`})
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Right Zone: Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {/* DSA Sandbox shortcut */}
                <button
                  onClick={() => onNavigateTab('dsa-sandbox')}
                  className="px-2.5 py-1 text-xs font-semibold text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-700 rounded-md transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Open Debt Sustainability Analysis Sandbox"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Inspect DSA Sandbox</span>
                </button>

                {/* Configure Limits Button */}
                <button
                  onClick={onOpen}
                  className="px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-700/80 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Configure alert limits & view log"
                >
                  <Sliders className="w-3.5 h-3.5 text-slate-300" />
                  <span>Configure</span>
                </button>

                {/* Details toggle */}
                <button
                  onClick={() => setShowDetailsDropdown(!showDetailsDropdown)}
                  className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-800/60 transition-colors"
                  title="Toggle details"
                >
                  {showDetailsDropdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {/* Acknowledge Button */}
                <button
                  onClick={handleAcknowledge}
                  className="px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 rounded transition-colors"
                  title="Acknowledge for this session"
                >
                  Ack
                </button>

                {/* Dismiss Button */}
                <button
                  onClick={() => setIsBannerDismissed(true)}
                  className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-800/80 transition-colors cursor-pointer"
                  title="Dismiss banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Expandable Mini Details */}
            {showDetailsDropdown && (
              <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 text-[11px] block">Baseline Debt/GDP</span>
                  <span className="font-mono font-bold text-white text-sm">{selectedSovereign.initial_debt_to_gdp}%</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 text-[11px] block">Threshold Metric</span>
                  <span className="font-mono font-bold text-amber-300 text-sm">
                    {config.activePreset === 'maastricht' ? 'Maastricht 60.0%' : `${thresholdExceeded}% Cap`}
                  </span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 text-[11px] block">Excess Debt Value</span>
                  <span className="font-mono font-bold text-rose-300 text-sm">
                    ${((selectedSovereign.gdp_usd_billion * (breachDelta / 100))).toFixed(1)}B USD
                  </span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Credit Rating Impact</span>
                    <span className="font-mono font-bold text-white text-sm">{selectedSovereign.credit_rating} (Downgrade Risk)</span>
                  </div>
                  <ExternalLink
                    className="w-4 h-4 text-indigo-400 cursor-pointer"
                    onClick={() => onNavigateTab('legal-covenants')}
                  />
                </div>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. ALERT MANAGER SLIDE-OVER DRAWER / MODAL
          ───────────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Sovereign Fiscal Alert Manager"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Sovereign Fiscal Alert Manager</span>
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800 text-indigo-300">
                      Debt-to-GDP Engine
                    </span>
                  </h2>
                  <p className="text-xs text-slate-300">
                    Real-time threshold tracking, automatic breach detection, and system-wide notification dispatch.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Selected Sovereign Live Status Gauge Card */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                  <div>
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                      Target Sovereign Entity
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-lg font-bold text-white">
                        {selectedSovereign.country_name}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-mono font-bold bg-slate-800 text-indigo-300 rounded border border-slate-700">
                        {selectedSovereign.country_iso_alpha3}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-slate-800 text-amber-300 rounded border border-slate-700">
                        Rating: {selectedSovereign.credit_rating}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    {isCritical ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-950 text-rose-300 border border-rose-700 animate-pulse">
                        <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                        CRITICAL BREACH ACTIVE
                      </span>
                    ) : isWarning ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-700">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        WARNING THRESHOLD EXCEEDED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        WITHIN PRUDENT LIMITS
                      </span>
                    )}

                    {isAcknowledged && (
                      <button
                        onClick={handleClearAcknowledgement}
                        className="text-xs text-indigo-400 hover:underline ml-2"
                      >
                        Reset Ack
                      </button>
                    )}
                  </div>
                </div>

                {/* Key Numbers Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800">
                    <span className="text-xs text-slate-400 block font-medium">Effective Debt / GDP</span>
                    <span
                      className={`text-2xl font-bold font-mono tracking-tight ${
                        isCritical ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {effectiveDebtToGdp}%
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Baseline: {selectedSovereign.initial_debt_to_gdp}%
                    </span>
                  </div>

                  <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800">
                    <span className="text-xs text-slate-400 block font-medium">Warning Threshold</span>
                    <span className="text-2xl font-bold font-mono text-amber-300 tracking-tight">
                      {config.warningThreshold}%
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Delta: {(effectiveDebtToGdp - config.warningThreshold).toFixed(1)}%
                    </span>
                  </div>

                  <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800">
                    <span className="text-xs text-slate-400 block font-medium">Critical Ceiling</span>
                    <span className="text-2xl font-bold font-mono text-rose-300 tracking-tight">
                      {config.criticalThreshold}%
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Delta: {(effectiveDebtToGdp - config.criticalThreshold).toFixed(1)}%
                    </span>
                  </div>

                  <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800">
                    <span className="text-xs text-slate-400 block font-medium">Excess Debt Burden</span>
                    <span className="text-2xl font-bold font-mono text-white tracking-tight">
                      {breachDelta > 0
                        ? `$${((selectedSovereign.gdp_usd_billion * breachDelta) / 100).toFixed(1)}B`
                        : '$0.0B'}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      GDP: ${selectedSovereign.gdp_usd_billion}B
                    </span>
                  </div>
                </div>

                {/* Visual Linear Gauge Bar */}
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-mono">
                    <span>0%</span>
                    <span className="text-emerald-400">Prudent Zone (&lt;{config.warningThreshold}%)</span>
                    <span className="text-amber-400">Caution ({config.warningThreshold}-{config.criticalThreshold}%)</span>
                    <span className="text-rose-400">Critical (&gt;{config.criticalThreshold}%)</span>
                    <span>150%</span>
                  </div>

                  {/* Gradient Multi-zone bar with marker */}
                  <div className="relative h-6 rounded-full bg-slate-900 border border-slate-800 p-0.5 overflow-hidden flex">
                    {/* Safe zone */}
                    <div
                      style={{ width: `${(config.warningThreshold / 150) * 100}%` }}
                      className="h-full bg-emerald-500/20 border-r border-emerald-500/40 relative"
                    />
                    {/* Warning zone */}
                    <div
                      style={{
                        width: `${((config.criticalThreshold - config.warningThreshold) / 150) * 100}%`,
                      }}
                      className="h-full bg-amber-500/25 border-r border-amber-500/40 relative"
                    />
                    {/* Critical zone */}
                    <div className="flex-1 h-full bg-rose-500/25 relative" />

                    {/* Sovereign Indicator Pin */}
                    <div
                      style={{ left: `${Math.min(Math.max((effectiveDebtToGdp / 150) * 100, 2), 98)}%` }}
                      className="absolute top-0 bottom-0 w-1.5 bg-white shadow-lg -translate-x-1/2 z-10 transition-all duration-300"
                    >
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-xs" />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2">
                    <span>
                      Pointer shows selected sovereign debt ratio: <strong className="text-white font-mono">{effectiveDebtToGdp}%</strong>
                    </span>
                    <span>Max Scale: 150% of GDP</span>
                  </div>
                </div>
              </div>

              {/* Threshold Rule Configuration */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-bold text-white">Threshold Rule Configuration</h3>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    Active Policy: {config.activePreset.toUpperCase()}
                  </span>
                </div>

                {/* Preset Frameworks selector */}
                <div className="mb-4">
                  <label className="text-xs font-semibold text-slate-300 block mb-2">
                    Select Regulatory / Institutional Framework:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      onClick={() => handleApplyPreset('maastricht')}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        config.activePreset === 'maastricht'
                          ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-xs'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-white'
                      }`}
                    >
                      <span className="text-xs font-bold block">Maastricht 60%</span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">EU Stability & Growth Pact</span>
                      <span className="text-[10px] font-mono text-indigo-400 block mt-1">Warn: 60% • Crit: 75%</span>
                    </button>

                    <button
                      onClick={() => handleApplyPreset('imf_em')}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        config.activePreset === 'imf_em'
                          ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-xs'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-white'
                      }`}
                    >
                      <span className="text-xs font-bold block">IMF Emerging 70%</span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">High-Debt Vulnerability</span>
                      <span className="text-[10px] font-mono text-indigo-400 block mt-1">Warn: 60% • Crit: 70%</span>
                    </button>

                    <button
                      onClick={() => handleApplyPreset('sp_vulnerable')}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        config.activePreset === 'sp_vulnerable'
                          ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-xs'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-white'
                      }`}
                    >
                      <span className="text-xs font-bold block">S&amp;P Downgrade 85%</span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">Credit Rating Pressure</span>
                      <span className="text-[10px] font-mono text-indigo-400 block mt-1">Warn: 70% • Crit: 85%</span>
                    </button>

                    <button
                      onClick={() => handleApplyPreset('custom')}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        config.activePreset === 'custom'
                          ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-xs'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-white'
                      }`}
                    >
                      <span className="text-xs font-bold block">Custom Threshold</span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">User-defined limits</span>
                      <span className="text-[10px] font-mono text-indigo-400 block mt-1">Interactive sliders</span>
                    </button>
                  </div>
                </div>

                {/* Sliders */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                  {/* Warning Slider */}
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Warning Limit Threshold
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={config.warningThreshold}
                          min={30}
                          max={120}
                          step={1}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setConfig(prev => ({
                              ...prev,
                              warningThreshold: val,
                              activePreset: 'custom',
                            }));
                          }}
                          className="w-16 bg-slate-950 border border-slate-700 text-amber-300 font-mono text-xs px-2 py-0.5 rounded text-right"
                        />
                        <span className="text-xs text-slate-400 font-mono">%</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="120"
                      step="1"
                      value={config.warningThreshold}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setConfig(prev => ({
                          ...prev,
                          warningThreshold: val,
                          activePreset: 'custom',
                        }));
                      }}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <span className="text-[11px] text-slate-400 block mt-1">
                      Triggers amber system warning and alert log entry.
                    </span>
                  </div>

                  {/* Critical Slider */}
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                        <AlertOctagon className="w-3.5 h-3.5" />
                        Critical Breach Ceiling
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={config.criticalThreshold}
                          min={40}
                          max={150}
                          step={1}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setConfig(prev => ({
                              ...prev,
                              criticalThreshold: val,
                              activePreset: 'custom',
                            }));
                          }}
                          className="w-16 bg-slate-950 border border-slate-700 text-rose-300 font-mono text-xs px-2 py-0.5 rounded text-right"
                        />
                        <span className="text-xs text-slate-400 font-mono">%</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="150"
                      step="1"
                      value={config.criticalThreshold}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setConfig(prev => ({
                          ...prev,
                          criticalThreshold: val,
                          activePreset: 'custom',
                        }));
                      }}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                    />
                    <span className="text-[11px] text-slate-400 block mt-1">
                      Triggers high-priority crimson system banner and DSA escalation.
                    </span>
                  </div>
                </div>

                {/* Banner & Sound Controls */}
                <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-800/80 flex-wrap gap-3">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={config.bannerEnabled}
                        onChange={(e) => setConfig(prev => ({ ...prev, bannerEnabled: e.target.checked }))}
                        className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                      <span>System-wide UI Banner Broadcast</span>
                    </label>

                    <button
                      onClick={() => setConfig(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      {config.soundEnabled ? (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300">Audio Ping On</span>
                        </>
                      ) : (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                          <span>Audio Muted</span>
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setConfig({
                        warningThreshold: 60.0,
                        criticalThreshold: 80.0,
                        activePreset: 'maastricht',
                        bannerEnabled: true,
                        soundEnabled: false,
                      });
                      updateStress(0);
                      setAcknowledgedSovereigns({});
                    }}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Defaults</span>
                  </button>
                </div>
              </div>

              {/* Stress Testing & Simulation Trigger */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-white">Interactive Stress & Trigger Test</h3>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    Current Shock: {activeStress > 0 ? `+${activeStress}%` : `${activeStress}%`}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Instantly simulate macro debt shocks (e.g., currency devaluation, contingent liabilities, or primary deficit blowout) to test threshold breach detection and notification banners in real time.
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => updateStress(0)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      activeStress === 0
                        ? 'bg-indigo-600 text-white border-indigo-500 font-semibold'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white'
                    }`}
                  >
                    Baseline (0%)
                  </button>

                  <button
                    onClick={() => updateStress(5)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      activeStress === 5
                        ? 'bg-amber-600 text-white border-amber-500 font-semibold'
                        : 'bg-slate-900 text-amber-300 border-slate-700 hover:text-white'
                    }`}
                  >
                    +5% Mild Shock
                  </button>

                  <button
                    onClick={() => updateStress(10)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      activeStress === 10
                        ? 'bg-rose-600 text-white border-rose-500 font-semibold'
                        : 'bg-slate-900 text-rose-300 border-slate-700 hover:text-white'
                    }`}
                  >
                    +10% Severe Shock
                  </button>

                  <button
                    onClick={() => updateStress(20)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      activeStress === 20
                        ? 'bg-red-700 text-white border-red-600 font-semibold'
                        : 'bg-slate-900 text-red-300 border-slate-700 hover:text-white'
                    }`}
                  >
                    +20% Crisis Scenario
                  </button>

                  <button
                    onClick={() => updateStress(-10)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      activeStress === -10
                        ? 'bg-emerald-600 text-white border-emerald-500 font-semibold'
                        : 'bg-slate-900 text-emerald-300 border-slate-700 hover:text-white'
                    }`}
                  >
                    -10% Debt Relief
                  </button>
                </div>
              </div>

              {/* Portfolio Sovereign Breach Roster */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-bold text-white">Cross-Sovereign Portfolio Status</h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300 font-mono">
                      {totalCriticalCount} Critical
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300 font-mono">
                      {totalWarningCount} Warning
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 font-mono text-slate-400">
                        <th className="py-2 px-3">Sovereign Entity</th>
                        <th className="py-2 px-2">ISO</th>
                        <th className="py-2 px-2 text-right">Debt / GDP</th>
                        <th className="py-2 px-2 text-right">Limit Margin</th>
                        <th className="py-2 px-2 text-center">Breach Status</th>
                        <th className="py-2 px-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {portfolioBreaches.map(({ sovereign, ratio, status, delta }) => {
                        const isSelected = sovereign.country_iso_alpha3 === selectedSovereign.country_iso_alpha3;
                        return (
                          <tr
                            key={sovereign.country_iso_alpha3}
                            className={`hover:bg-slate-800/40 transition-colors ${
                              isSelected ? 'bg-indigo-950/30' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 font-sans font-medium text-white flex items-center gap-2">
                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                              <span>{sovereign.country_name}</span>
                            </td>
                            <td className="py-2.5 px-2 text-indigo-300">{sovereign.country_iso_alpha3}</td>
                            <td className="py-2.5 px-2 text-right font-bold text-white">{ratio}%</td>
                            <td className="py-2.5 px-2 text-right">
                              {delta > 0 ? (
                                <span className="text-rose-400 font-semibold">+{delta.toFixed(1)}%</span>
                              ) : (
                                <span className="text-emerald-400 font-semibold">{delta.toFixed(1)}%</span>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              {status === 'CRITICAL' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                                  CRITICAL
                                </span>
                              ) : status === 'WARNING' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                                  WARNING
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                  NORMAL
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              {isSelected ? (
                                <span className="text-[11px] text-indigo-400 font-sans font-medium">Active</span>
                              ) : (
                                <button
                                  onClick={() => {
                                    onSelectSovereign(sovereign.country_iso_alpha3);
                                  }}
                                  className="text-[11px] font-sans font-medium text-slate-300 hover:text-white bg-slate-850 hover:bg-slate-700 px-2 py-1 rounded transition-colors cursor-pointer"
                                >
                                  Switch
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Historical Breach Audit Log */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-slate-400" />
                    <h3 className="text-sm font-bold text-white">Breach Trigger Audit Trail</h3>
                  </div>
                  <button
                    onClick={() => setBreachLogs([])}
                    className="text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    Clear History
                  </button>
                </div>

                <div className="space-y-2">
                  {breachLogs.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3 text-center">No breach events recorded.</p>
                  ) : (
                    breachLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="font-mono text-[11px] text-slate-400 shrink-0">{log.timestamp}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold shrink-0 ${
                              log.breachType === 'CRITICAL'
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {log.breachType}
                          </span>
                          <span className="font-medium text-white truncate">
                            {log.iso} ({log.countryName}) crossed threshold: {log.debtRatio}% (limit: {log.thresholdValue}%)
                          </span>
                        </div>
                        <span className="font-mono font-bold text-rose-400 shrink-0">+{log.delta}%</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Threshold alerts update automatically upon sovereign switch and macro shock adjustments.
              </span>
              <button
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
