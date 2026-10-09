import React, { useState, useMemo } from 'react';
import { SovereignEntity, SovereignDebtInstrument, SovereignSwapPosition } from '../types/sovereign';
import { buildRefundingLadder, calculateBondMetrics } from '../engine/durationEngine';
import { aggregateSwapPortfolio } from '../engine/swapEngine';
import { AlertTriangle, ShieldCheck, DollarSign, ArrowRightLeft, Layers, Sliders } from 'lucide-react';

interface RefundingSwapsTabProps {
  sovereign: SovereignEntity;
  debtInstruments: SovereignDebtInstrument[];
  swapPositions: SovereignSwapPosition[];
}

export const RefundingSwapsTab: React.FC<RefundingSwapsTabProps> = ({
  sovereign,
  debtInstruments,
  swapPositions,
}) => {
  const [swapShiftBps, setSwapShiftBps] = useState<number>(0);

  // Filter instruments for current sovereign
  const countryInstruments = useMemo(() => {
    return debtInstruments.filter(d => d.issuing_country === sovereign.country_iso_alpha3);
  }, [debtInstruments, sovereign]);

  // Filter swaps for current sovereign
  const countrySwaps = useMemo(() => {
    return swapPositions.filter(s => s.sovereign_country === sovereign.country_iso_alpha3);
  }, [swapPositions, sovereign]);

  // Refunding Ladder
  const ladder = useMemo(() => {
    return buildRefundingLadder(countryInstruments, 2026, 2035);
  }, [countryInstruments]);

  // Swap Portfolio Aggregation
  const swapAgg = useMemo(() => {
    return aggregateSwapPortfolio(countrySwaps, swapShiftBps);
  }, [countrySwaps, swapShiftBps]);

  // Bond Metrics Table with Duration & Convexity
  const bondsWithMetrics = useMemo(() => {
    return countryInstruments.map(bond => ({
      ...bond,
      metrics: calculateBondMetrics(bond),
    }));
  }, [countryInstruments]);

  // Portfolio weighted duration
  const totalPar = countryInstruments.reduce((sum, b) => sum + b.par_value_amount, 0);
  const weightedModDuration = totalPar > 0
    ? bondsWithMetrics.reduce((sum, b) => sum + (b.metrics.modified_duration * b.par_value_amount), 0) / totalPar
    : 0;
  const totalDv01 = bondsWithMetrics.reduce((sum, b) => sum + b.metrics.dv01, 0);

  const maxLadderTotal = Math.max(...ladder.map(l => l.total_par), 1000);

  return (
    <div className="space-y-6">
      {/* Portfolio Risk Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">Total Outstanding Debt Stock</div>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            ${(totalPar / 1000).toFixed(2)}B USD
          </div>
          <div className="text-xs text-slate-400 mt-1 font-mono">
            {countryInstruments.length} active bond tranches
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">Weighted Modified Duration (D_mod)</div>
          <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">
            {weightedModDuration.toFixed(2)} Years
          </div>
          <div className="text-xs text-slate-400 mt-1 font-mono">
            Total DV01: ${(totalDv01 / 1000).toFixed(1)}k / bp
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">Derivatives Net MtM Portfolio Value</div>
          <div className={`text-2xl font-bold font-mono mt-1 ${swapAgg.total_mtm_usd_m >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {swapAgg.total_mtm_usd_m >= 0 ? `+$${swapAgg.total_mtm_usd_m}M` : `-$${Math.abs(swapAgg.total_mtm_usd_m)}M`}
          </div>
          <div className="text-xs text-slate-400 mt-1 font-mono">
            Notional: ${swapAgg.total_notional_usd_m}M USD
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">ISDA CSA Margin Call Status</div>
          <div className="flex items-center gap-2 mt-1">
            {swapAgg.margin_call_risk_count > 0 ? (
              <span className="text-rose-400 font-bold text-lg flex items-center gap-1.5 font-mono">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                ${swapAgg.total_margin_call_usd_m}M Alert
              </span>
            ) : (
              <span className="text-emerald-400 font-bold text-lg flex items-center gap-1.5 font-mono">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                Collateral Compliant
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 mt-1 font-mono">
            {swapAgg.margin_call_risk_count > 0 ? 'Exceeds threshold bands' : 'No variation margin calls'}
          </div>
        </div>
      </div>

      {/* Refunding Requirements Ladder Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Upcoming Refunding Requirements Ladder (2026 – 2035)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Annual principal redemption obligations segmented by currency tranche (USD Millions Equivalent)
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1 text-blue-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> USD Tranche
            </span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> EUR Tranche
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Domestic Currency
            </span>
          </div>
        </div>

        {/* CSS/SVG Stacked Bar Chart */}
        <div className="h-64 flex items-end gap-2 pt-6 pb-2 px-2 border-b border-slate-800">
          {ladder.map((item) => {
            const usdHeightPct = (item.usd_tranche / maxLadderTotal) * 100;
            const eurHeightPct = (item.eur_tranche / maxLadderTotal) * 100;
            const localHeightPct = (item.local_tranche / maxLadderTotal) * 100;
            const otherHeightPct = (item.other_tranche / maxLadderTotal) * 100;

            return (
              <div key={item.year} className="flex-1 flex flex-col items-center h-full justify-end group">
                <div className="text-[10px] font-mono text-slate-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  ${item.total_par}M
                </div>
                <div className="w-full max-w-[48px] flex flex-col justify-end rounded-t overflow-hidden bg-slate-950/60">
                  {otherHeightPct > 0 && (
                    <div style={{ height: `${otherHeightPct}%` }} className="w-full bg-purple-500" title={`Other: $${item.other_tranche}M`} />
                  )}
                  {localHeightPct > 0 && (
                    <div style={{ height: `${localHeightPct}%` }} className="w-full bg-amber-500" title={`Domestic: $${item.local_tranche}M`} />
                  )}
                  {eurHeightPct > 0 && (
                    <div style={{ height: `${eurHeightPct}%` }} className="w-full bg-emerald-500" title={`EUR: $${item.eur_tranche}M`} />
                  )}
                  {usdHeightPct > 0 && (
                    <div style={{ height: `${usdHeightPct}%` }} className="w-full bg-blue-500" title={`USD: $${item.usd_tranche}M`} />
                  )}
                </div>
                <span className="text-[11px] font-mono text-slate-300 mt-2 font-medium">
                  {item.year}
                </span>
              </div>
            );
          })}
        </div>

        {/* Ladder Summary Matrix */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800 font-mono">
                <th className="py-2">Year</th>
                <th className="py-2 text-right">USD Tranche</th>
                <th className="py-2 text-right">EUR Tranche</th>
                <th className="py-2 text-right">Domestic Tranche</th>
                <th className="py-2 text-right">Total Redemption</th>
                <th className="py-2 text-right">Avg. Coupon</th>
                <th className="py-2 text-right">Avg. Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {ladder.map((row) => (
                <tr key={row.year} className="hover:bg-slate-800/30">
                  <td className="py-2 font-medium text-slate-200">{row.year}</td>
                  <td className="py-2 text-right text-blue-400">${row.usd_tranche}M</td>
                  <td className="py-2 text-right text-emerald-400">${row.eur_tranche}M</td>
                  <td className="py-2 text-right text-amber-400">${row.local_tranche}M</td>
                  <td className="py-2 text-right font-bold text-white">${row.total_par}M</td>
                  <td className="py-2 text-right text-slate-300">{row.weighted_coupon.toFixed(2)}%</td>
                  <td className="py-2 text-right text-slate-400">{row.weighted_duration.toFixed(2)}y</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Hedging Derivatives & Swap Register */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Active Sovereign Hedging Derivatives Register (IRS / Cross-Currency Swaps)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Valuation using multi-curve discounting, SOFR/EURIBOR forward projections and CSA collateral tracking
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-mono">Discount Curve Shift:</span>
            <span className="text-xs font-mono font-bold text-indigo-400">{swapShiftBps > 0 ? `+${swapShiftBps}` : swapShiftBps} bps</span>
            <input
              type="range"
              min="-150"
              max="250"
              step="10"
              value={swapShiftBps}
              onChange={(e) => setSwapShiftBps(parseInt(e.target.value))}
              className="w-28 accent-indigo-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800 font-mono">
                <th className="py-2">Swap ID</th>
                <th className="py-2">Type</th>
                <th className="py-2">Counterparty</th>
                <th className="py-2 text-right">Notional</th>
                <th className="py-2">Receive Leg</th>
                <th className="py-2">Pay Leg</th>
                <th className="py-2 text-right">CSA Threshold</th>
                <th className="py-2 text-right">Current MtM</th>
                <th className="py-2 text-center">CSA Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {countrySwaps.map((s, idx) => {
                const val = swapAgg.results[idx] || { net_present_value: s.current_mtm_valuation, csa_status: 'Compliant' };
                const isPositive = val.net_present_value >= 0;

                return (
                  <tr key={s.swap_id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 font-semibold text-indigo-400">{s.swap_id}</td>
                    <td className="py-2.5 text-slate-300">
                      {s.swap_type === 'CROSS_CURRENCY_SWAP' ? 'Cross-Currency (CCS)' : 'Interest Rate (IRS)'}
                    </td>
                    <td className="py-2.5 text-slate-300">{s.counterparty_name}</td>
                    <td className="py-2.5 text-right font-medium text-white">
                      ${s.notional_amount}M {s.base_currency}
                    </td>
                    <td className="py-2.5 text-emerald-400">{s.receive_rate_or_index}</td>
                    <td className="py-2.5 text-rose-400">{s.pay_rate_or_index}</td>
                    <td className="py-2.5 text-right text-slate-400">${s.csa_collateral_threshold}M</td>
                    <td className={`py-2.5 text-right font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPositive ? `+$${val.net_present_value}M` : `-$${Math.abs(val.net_present_value)}M`}
                    </td>
                    <td className="py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        val.csa_status === 'Compliant'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                      }`}>
                        {val.csa_status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bond Instruments Duration & Convexity Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Bond Portfolio Duration, Convexity & Sensitivity Analytics
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Exact Macaulay & Modified duration computed via periodic coupon cash-flow discounting ($D_m, D_{'{mod}'}$)
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800 font-mono">
                <th className="py-2">ISIN</th>
                <th className="py-2">Instrument Description</th>
                <th className="py-2">Maturity</th>
                <th className="py-2 text-right">Coupon</th>
                <th className="py-2 text-right">YTM (%)</th>
                <th className="py-2 text-right">Par ($M)</th>
                <th className="py-2 text-right">Price</th>
                <th className="py-2 text-right">Macaulay D</th>
                <th className="py-2 text-right">Mod. Duration</th>
                <th className="py-2 text-right">Convexity</th>
                <th className="py-2 text-right">DV01 ($/bp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {bondsWithMetrics.map((b) => (
                <tr key={b.instrument_isin} className="hover:bg-slate-800/30">
                  <td className="py-2 font-medium text-slate-300">{b.instrument_isin}</td>
                  <td className="py-2 text-slate-200">{b.description}</td>
                  <td className="py-2 text-slate-400">{b.maturity_date}</td>
                  <td className="py-2 text-right text-indigo-400">{(b.coupon_rate * 100).toFixed(2)}%</td>
                  <td className="py-2 text-right text-amber-400">{b.yield_to_maturity.toFixed(2)}%</td>
                  <td className="py-2 text-right text-white font-semibold">${b.par_value_amount}M</td>
                  <td className="py-2 text-right text-slate-300">{b.metrics.price}</td>
                  <td className="py-2 text-right text-slate-300">{b.metrics.macaulay_duration}y</td>
                  <td className="py-2 text-right text-emerald-400 font-semibold">{b.metrics.modified_duration}y</td>
                  <td className="py-2 text-right text-slate-400">{b.metrics.convexity}</td>
                  <td className="py-2 text-right text-rose-300">${b.metrics.dv01}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
