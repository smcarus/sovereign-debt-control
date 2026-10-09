import React, { useState, useEffect } from 'react';
import {
  fetchIMFSovereignDebtSDMX,
  IMFSovereignDebtRecord,
  IMFSDMXObservation,
  GROUNDED_IMF_WEO_RECORDS,
} from '../services/imfSdmxService';
import {
  Globe,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Code2,
  ExternalLink,
  ChevronRight,
  Database,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';

interface IMFDebtMetricsCardProps {
  countryIso3: string;
}

export const IMFDebtMetricsCard: React.FC<IMFDebtMetricsCardProps> = ({ countryIso3 }) => {
  const [imfRecord, setImfRecord] = useState<IMFSovereignDebtRecord>(
    GROUNDED_IMF_WEO_RECORDS[countryIso3] || GROUNDED_IMF_WEO_RECORDS['ALP']
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showRawJson, setShowRawJson] = useState<boolean>(false);
  const [rawPayload, setRawPayload] = useState<any>(null);

  const loadIMFData = async (iso: string) => {
    setIsLoading(true);
    const result = await fetchIMFSovereignDebtSDMX(iso);
    if (result.success && result.data) {
      setImfRecord(result.data);
      if (result.rawSdmx) setRawPayload(result.rawSdmx);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadIMFData(countryIso3);
  }, [countryIso3]);

  // Color mapping based on IMF DSF grade
  const getGradeBadge = (grade: IMFSovereignDebtRecord['imfDsfRiskGrade']) => {
    switch (grade) {
      case 'Low Risk':
        return { text: 'text-emerald-400', bg: 'bg-emerald-950/80 border-emerald-800' };
      case 'Moderate Risk':
        return { text: 'text-blue-400', bg: 'bg-blue-950/80 border-blue-800' };
      case 'High Risk':
        return { text: 'text-amber-400', bg: 'bg-amber-950/80 border-amber-800' };
      case 'Severe Distress':
        return { text: 'text-rose-400', bg: 'bg-rose-950/80 border-rose-800' };
    }
  };

  const badgeStyle = getGradeBadge(imfRecord.imfDsfRiskGrade);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-950/80 border border-indigo-800 text-indigo-400">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">
                IMF SDMX-JSON Debt-to-GDP Integration
              </h3>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                WEO: GGXWDG_NGDP
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live IMF World Economic Outlook SDMX-JSON multidimensional time-series feed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRawJson(!showRawJson)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Code2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>SDMX Payload</span>
          </button>

          <button
            onClick={() => loadIMFData(countryIso3)}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 shadow-sm shadow-indigo-900/30"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync IMF Feed</span>
          </button>
        </div>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Latest Debt-to-GDP */}
        <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
            <span>IMF Latest Debt / GDP</span>
            <span className="text-xs font-mono font-semibold text-indigo-300 bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-800">
              {imfRecord.latestObservation.isForecast ? 'WEO Forecast' : 'Observed'}
            </span>
          </div>
          <div className="text-3xl font-bold font-mono text-white mt-1.5 tracking-tight">
            {imfRecord.latestObservation.value.toFixed(1)}%
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono mt-1.5 text-slate-300">
            <span>Period: {imfRecord.latestObservation.timePeriod}</span>
            <span>·</span>
            {imfRecord.yoyChangePct >= 0 ? (
              <span className="text-rose-400 font-bold flex items-center">
                <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +{imfRecord.yoyChangePct}% YoY
              </span>
            ) : (
              <span className="text-emerald-400 font-bold flex items-center">
                <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> {imfRecord.yoyChangePct}% YoY
              </span>
            )}
          </div>
        </div>

        {/* IMF DSF Framework Risk Grade */}
        <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl shadow-xs">
          <span className="text-xs text-slate-300 font-medium block">IMF DSF Vulnerability Grade</span>
          <div className={`text-base font-bold font-mono mt-2 px-3 py-1 rounded-md inline-block border ${badgeStyle.bg} ${badgeStyle.text}`}>
            {imfRecord.imfDsfRiskGrade}
          </div>
          <div className="text-xs text-slate-400 font-mono mt-2">
            IMF Debt Sustainability Framework
          </div>
        </div>

        {/* 5-Year Average Debt Ratio */}
        <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl shadow-xs">
          <span className="text-xs text-slate-300 font-medium block">5-Year Historical Average</span>
          <div className="text-3xl font-bold font-mono text-white mt-1.5 tracking-tight">
            {imfRecord.fiveYearAverage.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-300 font-mono mt-1.5">
            Delta: <span className="text-amber-400 font-bold">{((imfRecord.latestObservation.value - imfRecord.fiveYearAverage) > 0 ? `+${(imfRecord.latestObservation.value - imfRecord.fiveYearAverage).toFixed(1)}%` : `${(imfRecord.latestObservation.value - imfRecord.fiveYearAverage).toFixed(1)}%`)}</span>
          </div>
        </div>

        {/* Trajectory Trend */}
        <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl shadow-xs">
          <span className="text-xs text-slate-300 font-medium block">3-Year Trajectory Trend</span>
          <div className="flex items-center gap-1.5 mt-2">
            <span className={`text-xl font-bold font-mono ${
              imfRecord.threeYearTrend === 'Expanding' ? 'text-rose-400' : imfRecord.threeYearTrend === 'Stabilizing' ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {imfRecord.threeYearTrend}
            </span>
          </div>
          <div className="text-xs text-slate-400 font-mono mt-1.5">
            {imfRecord.threeYearTrend === 'Expanding' ? 'Autonomous accumulation drift' : 'Fiscal trajectory stabilizing'}
          </div>
        </div>
      </div>

      {/* Recharts Bar Chart of IMF Trajectory */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-white font-semibold">
            IMF World Economic Outlook Multi-Year Debt Path (2021 – 2026)
          </span>
          <span className="text-slate-300 text-xs">
            Source: IMF SDMX API · Unit: % of GDP
          </span>
        </div>

        <div className="h-44 w-full bg-slate-950/80 rounded-lg p-2.5 border border-slate-800">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={imfRecord.observations} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
              <XAxis
                dataKey="timePeriod"
                stroke="#94a3b8"
                tick={{ fontSize: 11, fill: '#cbd5e1', fontFamily: 'monospace', fontWeight: 600 }}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fontSize: 11, fill: '#cbd5e1', fontFamily: 'monospace' }}
                unit="%"
                domain={['auto', 'auto']}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as IMFSDMXObservation;
                    return (
                      <div className="p-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl text-xs font-mono">
                        <div className="font-bold text-white mb-0.5">Year {data.timePeriod}</div>
                        <div className="text-indigo-400 font-bold">Debt-to-GDP: {data.value}%</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {data.isForecast ? 'IMF Staff Projection (WEO)' : 'Official GFS Reported Value'}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {imfRecord.observations.map((entry, index) => {
                  const isHigh = entry.value > 80;
                  const isMedium = entry.value > 60;
                  const color = entry.isForecast
                    ? '#6366f1' // Indigo for forecast
                    : isHigh
                    ? '#f43f5e' // Crimson
                    : isMedium
                    ? '#f59e0b' // Amber
                    : '#10b981'; // Emerald
                  return <Cell key={`imf-cell-${index}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Raw SDMX-JSON Viewer Drawer (Collapsible) */}
      {showRawJson && (
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800 pb-1.5">
            <span className="text-indigo-400 font-semibold">Raw IMF SDMX-JSON Payload Structure</span>
            <span>REST Protocol: CompactData/WEO</span>
          </div>
          <pre className="text-[11px] font-mono text-slate-300 max-h-48 overflow-y-auto leading-relaxed bg-slate-900/80 p-2.5 rounded">
            {JSON.stringify(rawPayload || imfRecord, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
