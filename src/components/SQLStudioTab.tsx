import React, { useState } from 'react';
import {
  INITIAL_SOVEREIGNS,
  INITIAL_DEBT_INSTRUMENTS,
  INITIAL_SWAPS,
} from '../data/mockDatabase';
import { Database, Play, Download, Table, Shield, Terminal } from 'lucide-react';

export const SQLStudioTab: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState<string>('sovereign_debt_instruments');
  const [queryInput, setQueryInput] = useState<string>(
    `SELECT instrument_isin, issuing_country, coupon_rate * 100 as coupon_pct, maturity_date, par_value_amount, restructuring_covenant_type\nFROM sovereign_debt_instruments\nORDER BY maturity_date ASC;`
  );
  const [queryResults, setQueryResults] = useState<{ columns: string[]; rows: any[] } | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  const sampleQueries = [
    {
      label: 'All Debt Instruments by Maturity',
      sql: `SELECT instrument_isin, issuing_country, coupon_rate * 100 as coupon_pct, maturity_date, par_value_amount, restructuring_covenant_type\nFROM sovereign_debt_instruments\nORDER BY maturity_date ASC;`,
    },
    {
      label: 'Swaps with MtM Deficits (CSA Risk)',
      sql: `SELECT swap_id, sovereign_country, swap_type, notional_amount, receive_rate_or_index, pay_rate_or_index, csa_collateral_threshold, current_mtm_valuation\nFROM sovereign_swaps_registry\nWHERE current_mtm_valuation < 0\nORDER BY current_mtm_valuation ASC;`,
    },
    {
      label: 'Aggregate Debt & Avg Coupon by Sovereign',
      sql: `SELECT issuing_country, COUNT(*) as tranche_count, SUM(par_value_amount) as total_par_usd_m, AVG(coupon_rate * 100) as avg_coupon_pct\nFROM sovereign_debt_instruments\nGROUP BY issuing_country;`,
    },
    {
      label: 'Sovereign Macro Entity Profiles',
      sql: `SELECT country_iso_alpha3, country_name, credit_rating, gdp_usd_billion, initial_debt_to_gdp, fx_reserve_months\nFROM sovereign_entities;`,
    },
  ];

  const handleRunQuery = () => {
    setQueryError(null);
    const clean = queryInput.trim().toUpperCase();

    if (!clean.startsWith('SELECT')) {
      setQueryError('ACCESS_DENIED: Modifying or DDL statements (INSERT, UPDATE, DELETE, DROP) are strictly prevented by the air-gapped read-only firewall.');
      return;
    }

    try {
      if (clean.includes('SOVEREIGN_SWAPS_REGISTRY')) {
        const rows = INITIAL_SWAPS.map(s => ({
          swap_id: s.swap_id,
          sovereign_country: s.sovereign_country,
          counterparty: s.counterparty_name,
          swap_type: s.swap_type,
          notional_amount: s.notional_amount,
          receive_rate_or_index: s.receive_rate_or_index,
          pay_rate_or_index: s.pay_rate_or_index,
          csa_collateral_threshold: s.csa_collateral_threshold,
          current_mtm_valuation: s.current_mtm_valuation,
        }));
        setQueryResults({
          columns: Object.keys(rows[0]),
          rows,
        });
      } else if (clean.includes('SOVEREIGN_ENTITIES')) {
        const rows = INITIAL_SOVEREIGNS.map(s => ({
          country_iso_alpha3: s.country_iso_alpha3,
          country_name: s.country_name,
          credit_rating: s.credit_rating,
          gdp_usd_billion: s.gdp_usd_billion,
          initial_debt_to_gdp: s.initial_debt_to_gdp,
          fx_reserve_months: s.fx_reserve_months,
          reporting_currency: s.reporting_currency,
        }));
        setQueryResults({
          columns: Object.keys(rows[0]),
          rows,
        });
      } else {
        // Default to debt instruments
        const rows = INITIAL_DEBT_INSTRUMENTS.map(b => ({
          instrument_isin: b.instrument_isin,
          issuing_country: b.issuing_country,
          description: b.description,
          maturity_date: b.maturity_date,
          coupon_pct: Number((b.coupon_rate * 100).toFixed(2)),
          par_value_amount: b.par_value_amount,
          currency_code: b.currency_code,
          covenant_type: b.restructuring_covenant_type,
          current_price: b.current_price,
        }));
        setQueryResults({
          columns: Object.keys(rows[0]),
          rows,
        });
      }
    } catch (err: any) {
      setQueryError(`Execution Error: ${err.message}`);
    }
  };

  // Run on mount
  React.useEffect(() => {
    handleRunQuery();
  }, []);

  const handleDownloadCSV = () => {
    if (!queryResults) return;
    const header = queryResults.columns.join(',');
    const rows = queryResults.rows.map(r => queryResults.columns.map(c => JSON.stringify(r[c] ?? '')).join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [header, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `timescaledb_query_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-sm font-semibold text-white">
                PostgreSQL 16 & TimescaleDB Hypertable Studio
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Direct read-only SQL querying interface with schema-validated TimescaleDB engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 flex items-center gap-1">
              <Shield className="w-3 h-3" /> SELECT-Only Enforced
            </span>
            <span className="text-slate-400">PostgreSQL 16.3-timescaledb</span>
          </div>
        </div>

        {/* Preset Query Chips */}
        <div className="pt-3">
          <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">Quick Query Templates:</span>
          <div className="flex flex-wrap gap-2">
            {sampleQueries.map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQueryInput(q.sql);
                }}
                className="px-2.5 py-1 text-xs rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SQL Editor & Console */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>SQL Query Editor</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunQuery}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-900/30"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Execute SQL</span>
            </button>
          </div>
        </div>

        <textarea
          rows={5}
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-emerald-400 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
          spellCheck={false}
        />

        {queryError && (
          <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-lg text-xs text-rose-300 font-mono">
            {queryError}
          </div>
        )}
      </div>

      {/* Query Results Data Grid */}
      {queryResults && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Table className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-white">
                Query Result Set ({queryResults.rows.length} rows returned)
              </span>
            </div>

            <button
              onClick={handleDownloadCSV}
              className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-xs text-left">
              <thead className="sticky top-0 bg-slate-950">
                <tr className="text-slate-400 border-b border-slate-800 font-mono">
                  {queryResults.columns.map((col) => (
                    <th key={col} className="py-2.5 px-3 uppercase tracking-wider text-[11px]">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {queryResults.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-800/40">
                    {queryResults.columns.map((col) => {
                      const val = row[col];
                      const isNumber = typeof val === 'number';
                      return (
                        <td key={col} className={`py-2 px-3 text-slate-200 ${isNumber ? 'text-right' : ''}`}>
                          {val !== null && val !== undefined ? String(val) : 'NULL'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
