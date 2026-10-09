import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';
import { Activity, ShieldAlert, ArrowUpDown, Filter, Info } from 'lucide-react';

export interface SovereignRiskRow {
  iso: string;
  name: string;
  region: 'Americas' | 'Europe' | 'Asia-Pacific' | 'Africa' | 'G7 Core';
  rating: string;
  yield10Y: number;        // %
  spreadBps: number;       // bps over US Treasury
  cds5Y: number;           // bps
  debtToGdp: number;       // %
  gfnToGdp: number;        // Gross Financing Needs % GDP
  externalDebtCover: number;// External Debt / FX Reserves ratio
  compositeScore: number;  // 0-100 normalized risk score
}

export const GLOBAL_SOVEREIGN_RISK_DATA: SovereignRiskRow[] = [
  {
    iso: 'ALP',
    name: 'Sovereign Alpha',
    region: 'Americas',
    rating: 'BB-',
    yield10Y: 7.35,
    spreadBps: 330,
    cds5Y: 245,
    debtToGdp: 76.5,
    gfnToGdp: 14.2,
    externalDebtCover: 3.2,
    compositeScore: 68,
  },
  {
    iso: 'BET',
    name: 'Sovereign Beta',
    region: 'Europe',
    rating: 'BBB',
    yield10Y: 4.25,
    spreadBps: 130,
    cds5Y: 112,
    debtToGdp: 112.4,
    gfnToGdp: 18.5,
    externalDebtCover: 1.8,
    compositeScore: 54,
  },
  {
    iso: 'GAM',
    name: 'Sovereign Gamma',
    region: 'Africa',
    rating: 'CCC+',
    yield10Y: 26.80,
    spreadBps: 2275,
    cds5Y: 1850,
    debtToGdp: 89.2,
    gfnToGdp: 24.0,
    externalDebtCover: 7.4,
    compositeScore: 92,
  },
  {
    iso: 'DEL',
    name: 'Sovereign Delta',
    region: 'Asia-Pacific',
    rating: 'AA-',
    yield10Y: 4.45,
    spreadBps: 40,
    cds5Y: 45,
    debtToGdp: 48.0,
    gfnToGdp: 7.5,
    externalDebtCover: 0.8,
    compositeScore: 22,
  },
  {
    iso: 'USA',
    name: 'United States',
    region: 'G7 Core',
    rating: 'AA+',
    yield10Y: 4.05,
    spreadBps: 0,
    cds5Y: 38,
    debtToGdp: 124.0,
    gfnToGdp: 26.0,
    externalDebtCover: 0.9,
    compositeScore: 35,
  },
  {
    iso: 'DEU',
    name: 'Germany (Bund)',
    region: 'G7 Core',
    rating: 'AAA',
    yield10Y: 2.95,
    spreadBps: -110,
    cds5Y: 16,
    debtToGdp: 63.8,
    gfnToGdp: 9.1,
    externalDebtCover: 0.5,
    compositeScore: 12,
  },
  {
    iso: 'BRA',
    name: 'Brazil (Benchmark)',
    region: 'Americas',
    rating: 'BB',
    yield10Y: 11.85,
    spreadBps: 780,
    cds5Y: 198,
    debtToGdp: 77.2,
    gfnToGdp: 15.6,
    externalDebtCover: 2.1,
    compositeScore: 61,
  },
  {
    iso: 'ZAF',
    name: 'South Africa',
    region: 'Africa',
    rating: 'BB-',
    yield10Y: 10.40,
    spreadBps: 635,
    cds5Y: 265,
    debtToGdp: 74.8,
    gfnToGdp: 13.9,
    externalDebtCover: 3.5,
    compositeScore: 66,
  },
  {
    iso: 'JPN',
    name: 'Japan (JGB)',
    region: 'G7 Core',
    rating: 'A+',
    yield10Y: 1.55,
    spreadBps: -250,
    cds5Y: 28,
    debtToGdp: 255.0,
    gfnToGdp: 38.0,
    externalDebtCover: 0.4,
    compositeScore: 48,
  },
  {
    iso: 'GBR',
    name: 'United Kingdom',
    region: 'G7 Core',
    rating: 'AA',
    yield10Y: 4.35,
    spreadBps: 30,
    cds5Y: 26,
    debtToGdp: 99.5,
    gfnToGdp: 17.2,
    externalDebtCover: 1.2,
    compositeScore: 40,
  },
];

export const METRIC_COLUMNS = [
  { id: 'yield10Y', label: '10Y Yield', unit: '%', min: 1.0, max: 28.0, desc: '10-Year Benchmark Yield to Maturity' },
  { id: 'spreadBps', label: '10Y Spread', unit: 'bp', min: -250, max: 2300, desc: 'Credit spread over US Treasury benchmark' },
  { id: 'cds5Y', label: '5Y CDS', unit: 'bp', min: 10, max: 2000, desc: '5Y Credit Default Swap senior spread' },
  { id: 'debtToGdp', label: 'Debt / GDP', unit: '%', min: 40, max: 260, desc: 'Gross General Government Debt to GDP' },
  { id: 'gfnToGdp', label: 'Gross Financing', unit: '%', min: 5, max: 40, desc: 'Gross Financing Needs % of GDP' },
  { id: 'externalDebtCover', label: 'Ext. Debt / FX', unit: 'x', min: 0.3, max: 8.0, desc: 'External Debt to FX Reserve ratio' },
  { id: 'compositeScore', label: 'Vulnerability Index', unit: 'pts', min: 0, max: 100, desc: 'Composite Sovereign Fiscal Distress Score (0-100)' },
] as const;

type MetricKey = typeof METRIC_COLUMNS[number]['id'];

// Heatmap color generator based on normalized risk ratio (0.0 to 1.0)
function getHeatmapColor(normalized: number): { bg: string; text: string; hex: string } {
  const clamped = Math.max(0, Math.min(1, normalized));

  if (clamped < 0.25) {
    // Low risk: Emerald
    return { bg: 'bg-emerald-950/60 border-emerald-800/60', text: 'text-emerald-300', hex: '#059669' };
  } else if (clamped < 0.50) {
    // Moderate risk: Slate / Blue-gray
    return { bg: 'bg-blue-950/50 border-blue-800/50', text: 'text-blue-300', hex: '#2563eb' };
  } else if (clamped < 0.75) {
    // Elevated risk: Amber
    return { bg: 'bg-amber-950/60 border-amber-800/60', text: 'text-amber-300', hex: '#d97706' };
  } else {
    // Critical distress: Crimson / Red
    return { bg: 'bg-rose-950/80 border-rose-800/80', text: 'text-rose-300', hex: '#e11d48' };
  }
}

interface SovereignRiskHeatmapProps {
  currentCountryIso?: string;
  onSelectCountry?: (iso: string) => void;
}

export const SovereignRiskHeatmap: React.FC<SovereignRiskHeatmapProps> = ({
  currentCountryIso = 'ALP',
  onSelectCountry,
}) => {
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [sortField, setSortField] = useState<MetricKey>('compositeScore');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [hoveredCell, setHoveredCell] = useState<{
    country: string;
    metric: string;
    value: number;
    unit: string;
    desc: string;
  } | null>(null);

  // Filter and sort rows
  const filteredData = useMemo(() => {
    let result = [...GLOBAL_SOVEREIGN_RISK_DATA];
    if (selectedRegion !== 'All') {
      result = result.filter(r => r.region === selectedRegion);
    }

    result.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      return sortAsc ? valA - valB : valB - valA;
    });

    return result;
  }, [selectedRegion, sortField, sortAsc]);

  // Recharts Bar Data for the selected sortField cross-section
  const chartData = useMemo(() => {
    return filteredData.map(item => ({
      name: item.iso,
      fullName: item.name,
      value: item[sortField],
      compositeScore: item.compositeScore,
      rating: item.rating,
    }));
  }, [filteredData, sortField]);

  const activeMetricObj = METRIC_COLUMNS.find(m => m.id === sortField) || METRIC_COLUMNS[6];

  const handleSort = (field: MetricKey) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default descending
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            <span>Global Sovereign Debt Risk & Yield Matrix (Heatmap)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Cross-border surveillance comparing yields, credit spreads, debt-to-GDP, and composite distress scores
          </p>
        </div>

        {/* Region & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs font-medium">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            {(['All', 'Americas', 'Europe', 'Asia-Pacific', 'Africa', 'G7 Core'] as const).map(reg => (
              <button
                key={reg}
                onClick={() => setSelectedRegion(reg)}
                className={`px-2.5 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                  selectedRegion === reg
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {reg}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Heatmap Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-950 border-b border-slate-800 font-mono text-slate-300">
              <th className="py-2.5 px-3 font-semibold">Sovereign Entity</th>
              <th className="py-2.5 px-2 text-center font-semibold">Rating</th>
              {METRIC_COLUMNS.map(col => {
                const isActive = sortField === col.id;
                return (
                  <th
                    key={col.id}
                    onClick={() => handleSort(col.id)}
                    className={`py-2.5 px-2.5 text-right cursor-pointer select-none transition-colors hover:text-white ${
                      isActive ? 'text-indigo-300 font-bold' : ''
                    }`}
                    title={`Sort by ${col.label}`}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>{col.label}</span>
                      <ArrowUpDown className={`w-3 h-3 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filteredData.map(row => {
              const isCurrent = row.iso === currentCountryIso;

              return (
                <tr
                  key={row.iso}
                  onClick={() => onSelectCountry && onSelectCountry(row.iso)}
                  className={`transition-colors cursor-pointer ${
                    isCurrent ? 'bg-indigo-950/70 border-l-4 border-l-indigo-500' : 'hover:bg-slate-800/50'
                  }`}
                >
                  {/* Country Name */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{row.iso}</span>
                      <span className="text-slate-300 text-xs truncate max-w-[140px]">{row.name}</span>
                      {isCurrent && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-900 text-indigo-200 border border-indigo-600 font-bold">
                          Active
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Rating */}
                  <td className="py-2.5 px-2 text-center">
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 font-bold text-white border border-slate-700">
                      {row.rating}
                    </span>
                  </td>

                  {/* Metrics with heat coloring */}
                  {METRIC_COLUMNS.map(col => {
                    const rawVal = row[col.id];
                    const normalized = (rawVal - col.min) / (col.max - col.min);
                    const color = getHeatmapColor(normalized);

                    return (
                      <td
                        key={col.id}
                        onMouseEnter={() =>
                          setHoveredCell({
                            country: row.name,
                            metric: col.label,
                            value: rawVal,
                            unit: col.unit,
                            desc: col.desc,
                          })
                        }
                        onMouseLeave={() => setHoveredCell(null)}
                        className="py-1 px-1.5 text-right"
                      >
                        <div
                          className={`py-1.5 px-2.5 rounded-md border transition-transform hover:scale-105 font-bold text-xs ${color.bg} ${color.text}`}
                        >
                          {col.id === 'compositeScore' ? (
                            <span>{rawVal}</span>
                          ) : col.id === 'externalDebtCover' ? (
                            <span>{rawVal.toFixed(1)}x</span>
                          ) : col.id === 'spreadBps' ? (
                            <span>{rawVal > 0 ? `+${rawVal}` : rawVal}</span>
                          ) : (
                            <span>{rawVal.toFixed(1)}{col.unit}</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Hover Information Callout */}
      {hoveredCell && (
        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-400" />
            <span className="text-white font-semibold">{hoveredCell.country}:</span>
            <span className="text-slate-300">{hoveredCell.desc}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 mr-2">{hoveredCell.metric}:</span>
            <span className="font-bold text-indigo-300">
              {hoveredCell.value} {hoveredCell.unit}
            </span>
          </div>
        </div>
      )}

      {/* Recharts Cross-Section Bar Chart of Currently Selected Metric */}
      <div className="pt-2 border-t border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Metric Dispersion Across Sovereigns: {activeMetricObj.label} ({activeMetricObj.unit})
            </h4>
            <p className="text-[11px] text-slate-400">
              Rendered dynamically via Recharts · Click any column in the heatmap above to rank and rechart
            </p>
          </div>
          <span className="text-xs font-mono text-indigo-400">
            Active Rank: {activeMetricObj.label} ({sortAsc ? 'Ascending' : 'Descending'})
          </span>
        </div>

        <div className="h-56 w-full bg-slate-950/60 rounded-lg p-3 border border-slate-800">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="name"
                stroke="#64748b"
                tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'monospace' }}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }}
                unit={activeMetricObj.unit === '%' ? '%' : ''}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="p-2.5 bg-slate-900 border border-slate-700 rounded-lg shadow-xl text-xs font-mono">
                        <div className="font-bold text-white mb-1">
                          {data.fullName} ({data.name})
                        </div>
                        <div className="text-slate-400">Rating: <span className="text-amber-300">{data.rating}</span></div>
                        <div className="text-indigo-400 font-bold mt-1">
                          {activeMetricObj.label}: {data.value} {activeMetricObj.unit}
                        </div>
                        <div className="text-slate-400 mt-0.5 text-[10px]">
                          Vulnerability Score: {data.compositeScore}/100
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => {
                  const norm = (entry.value - activeMetricObj.min) / (activeMetricObj.max - activeMetricObj.min);
                  const color = getHeatmapColor(norm);
                  return <Cell key={`cell-${index}`} fill={color.hex} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Heatmap Legend */}
      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-slate-400">
        <span className="font-medium text-slate-300">Risk Threshold Scale:</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-600 inline-block" /> Low Risk (&lt;25%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-600 inline-block" /> Moderate Risk (25-50%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-600 inline-block" /> Elevated Vulnerability (50-75%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-600 inline-block" /> High Distress (&gt;75%)
          </span>
        </div>
      </div>
    </div>
  );
};
