import React, { useState } from 'react';
import { SovereignEntity, SovereignDebtInstrument, SovereignSwapPosition } from '../types/sovereign';
import { computeDSATrajectory } from '../engine/dsaEngine';
import { aggregateSwapPortfolio } from '../engine/swapEngine';
import { X, Download, Copy, Check, FileText } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sovereign: SovereignEntity;
  debtInstruments: SovereignDebtInstrument[];
  swapPositions: SovereignSwapPosition[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  sovereign,
  debtInstruments,
  swapPositions,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const countryInstruments = debtInstruments.filter(d => d.issuing_country === sovereign.country_iso_alpha3);
  const countrySwaps = swapPositions.filter(s => s.sovereign_country === sovereign.country_iso_alpha3);
  const swapAgg = aggregateSwapPortfolio(countrySwaps);
  const dsa = computeDSATrajectory({
    d_initial: sovereign.initial_debt_to_gdp,
    r_nominal: 5.5,
    g_nominal_growth: 2.8,
    p_primary_balance: 1.2,
    stock_flow_adjustment: 0,
    horizon_years: 10,
  });

  const totalDebtUSD = countryInstruments.reduce((sum, b) => sum + b.par_value_amount, 0);

  const markdownContent = `# SOVEREIGN FISCAL, DEBT DYNAMICS & DERIVATIVES STRATEGY DOSSIER
**Issuer Classification:** ${sovereign.country_name} (${sovereign.country_iso_alpha3})
**Date of Generation:** ${new Date().toISOString().split('T')[0]}
**System Architecture:** Air-Gapped Local Control Tower (Zero Cloud Egress)

---

## 1. Executive Summary & Macroeconomic Indicators
- **Nominal GDP:** $${sovereign.gdp_usd_billion} Billion USD
- **Current Debt-to-GDP Ratio:** ${sovereign.initial_debt_to_gdp.toFixed(1)}%
- **Credit Rating:** ${sovereign.credit_rating}
- **Baseline Inflation:** ${sovereign.baseline_inflation}%
- **Effective Tax Rate:** ${sovereign.effective_tax_rate}%
- **Foreign Exchange Reserves:** ${sovereign.fx_reserve_months} Months of Import Cover

---

## 2. Debt Law of Motion & Sustainability Assessment
Model Formulation: $d_t = \\frac{1 + r_t}{1 + g_t} d_{t-1} - p_t + \\epsilon_t$
- **10-Year Terminal Debt Ratio:** ${dsa.terminal_debt_ratio}% of GDP
- **Debt-Stabilizing Primary Surplus Requirement (p*):** ${dsa.stabilizing_primary_balance}% of GDP
- **Cumulative Snowball Drift:** ${dsa.snowball_cumulative > 0 ? `+${dsa.snowball_cumulative}%` : `${dsa.snowball_cumulative}%`}
- **Solvency Status:** ${dsa.is_sustainable ? 'Sustainable under base fiscal trajectory' : 'Vulnerable to snowball divergence'}

---

## 3. Market Debt Portfolio & Refunding Schedule
- **Total Outstanding Par Value:** $${totalDebtUSD} Million USD Equivalent
- **Active Bond Tranches:** ${countryInstruments.length}
${countryInstruments.map(b => `  - **${b.instrument_isin}** | ${b.description} | Coupon: ${(b.coupon_rate * 100).toFixed(2)}% | Maturity: ${b.maturity_date} | Par: $${b.par_value_amount}M | CAC: ${b.restructuring_covenant_type}`).join('\n')}

---

## 4. Derivatives Hedging & ISDA Mark-to-Market Valuation
- **Total Swap Notional Volume:** $${swapAgg.total_notional_usd_m} Million USD
- **Net Portfolio MtM Valuation:** ${swapAgg.total_mtm_usd_m >= 0 ? `+$${swapAgg.total_mtm_usd_m}M` : `-$${Math.abs(swapAgg.total_mtm_usd_m)}M`} USD
- **Collateral Threshold Breach (CSA Margin Call):** ${swapAgg.margin_call_risk_count > 0 ? `Alert: $${swapAgg.total_margin_call_usd_m}M Required` : 'Compliant'}
${countrySwaps.map(s => `  - **${s.swap_id}** (${s.swap_type}) | Notional: $${s.notional_amount}M | Rec: ${s.receive_rate_or_index} | Pay: ${s.pay_rate_or_index} | MtM: $${s.current_mtm_valuation}M | Threshold: $${s.csa_collateral_threshold}M`).join('\n')}

---

## 5. Policy Directive & Restructuring Guidance
1. **Bond Reprofiling Strategy:** Leverage Single-Limb Collective Action Clauses (75% aggregate voting threshold) to execute voluntary debt conversion into longer-tenor amortizing notes.
2. **Swap Hedging Harmonization:** Seek multilateral credit enhancement (World Bank / IDB) for active cross-currency swaps to eliminate collateral call liquidity drains on FX reserves.
3. **Fiscal Consolidation Anchor:** Maintain structural primary surplus within 0.5% of p* (${dsa.stabilizing_primary_balance}%) to arrest autonomous snowball expansion.
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sovereign.country_iso_alpha3}_Sovereign_Fiscal_Dossier_${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">
              Institutional Sovereign Strategy Dossier Export
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Viewer */}
        <div className="p-5 overflow-y-auto flex-1 font-mono text-xs bg-slate-950 text-slate-300 whitespace-pre-wrap leading-relaxed border-b border-slate-800">
          {markdownContent}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 bg-slate-900">
          <span className="text-xs text-slate-400 font-mono">
            Format: Markdown (GFM) · Local Generation
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="px-3.5 py-2 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Markdown</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-indigo-900/30"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .MD Dossier</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
