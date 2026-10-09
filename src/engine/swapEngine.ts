import { SovereignSwapPosition } from '../types/sovereign';

export interface SwapValuationResult {
  swap_id: string;
  receive_leg_pv: number; // Millions USD
  pay_leg_pv: number;     // Millions USD
  net_present_value: number; // Millions USD
  dv01_sensitivity: number; // USD exposure per 1 bps curve shift
  csa_status: 'Compliant' | 'Margin Call Imminent' | 'Margin Call Required';
  margin_call_amount: number; // Millions USD
  hedging_effectiveness: string;
}

/**
 * Deterministic multi-curve discounting model for Interest Rate Swaps & Cross-Currency Swaps
 */
export function valueSovereignSwap(
  swap: SovereignSwapPosition,
  yieldShiftBps = 0,
  spotFx = 1.0
): SwapValuationResult {
  const notional = swap.notional_amount; // in Millions
  
  // Calculate remaining years
  const today = new Date('2026-10-09').getTime();
  const termDate = new Date(swap.termination_date).getTime();
  const yearsRemaining = Math.max(0.25, (termDate - today) / (1000 * 60 * 60 * 24 * 365.25));

  // Base discounting curve with optional parallel shift
  const rBase = (4.25 + yieldShiftBps / 100.0) / 100.0;
  
  // Frequency assumption (semi-annual = 2 periods per year)
  const periodsPerYear = 2;
  const totalPeriods = Math.max(1, Math.round(yearsRemaining * periodsPerYear));
  const dt = 1 / periodsPerYear; // day count fraction approx (Act/360 or 30/360)

  let receivePV = 0;
  let payPV = 0;

  // Receive Leg Calculation
  for (let i = 1; i <= totalPeriods; i++) {
    const t = i * dt;
    const discountFactor = Math.exp(-rBase * t);
    
    let legCashflowRate = 0;
    if (swap.receive_leg_type === 'FIXED') {
      legCashflowRate = swap.receive_rate_val / 100.0;
    } else {
      // Floating rate index + shift
      const forwardSpread = (swap.basis_spread_bps || 0) / 10000.0;
      legCashflowRate = (rBase + 0.0035 + forwardSpread);
    }

    const cashflow = notional * legCashflowRate * dt;
    receivePV += cashflow * discountFactor;
  }

  // Pay Leg Calculation
  for (let i = 1; i <= totalPeriods; i++) {
    const t = i * dt;
    const discountFactor = Math.exp(-rBase * t);

    let legCashflowRate = 0;
    if (swap.pay_leg_type === 'FIXED') {
      legCashflowRate = swap.pay_rate_val / 100.0;
    } else {
      legCashflowRate = rBase + 0.0025; // Floating reference index
    }

    let cashflow = notional * legCashflowRate * dt;
    
    // Cross-Currency adjustment
    if (swap.swap_type === 'CROSS_CURRENCY_SWAP' && swap.target_currency) {
      // Adjusted by spot fx relative to base contract
      const fxAdj = swap.fx_rate_contract ? (spotFx / swap.fx_rate_contract) : 1.0;
      cashflow = cashflow * fxAdj;
    }

    payPV += cashflow * discountFactor;
  }

  // Net Present Value = PV(Receive) - PV(Pay)
  const netPresentValue = receivePV - payPV;

  // DV01 calculation (numerical perturbation +1 bp)
  const perturbedR = rBase + 0.0001;
  let perturbedRecPV = 0;
  let perturbedPayPV = 0;
  for (let i = 1; i <= totalPeriods; i++) {
    const t = i * dt;
    const df = Math.exp(-perturbedR * t);
    const recRate = swap.receive_leg_type === 'FIXED' ? swap.receive_rate_val / 100.0 : perturbedR + 0.0035;
    const payRate = swap.pay_leg_type === 'FIXED' ? swap.pay_rate_val / 100.0 : perturbedR + 0.0025;
    perturbedRecPV += notional * recRate * dt * df;
    perturbedPayPV += notional * payRate * dt * df;
  }
  const perturbedNPV = perturbedRecPV - perturbedPayPV;
  const dv01 = (perturbedNPV - netPresentValue) * 1000000; // in USD per bp

  // CSA Collateral Margin Assessment
  let csaStatus: 'Compliant' | 'Margin Call Imminent' | 'Margin Call Required' = 'Compliant';
  let marginCallAmount = 0;
  const threshold = swap.csa_collateral_threshold;

  if (netPresentValue < 0) {
    const exposure = Math.abs(netPresentValue);
    if (exposure > threshold) {
      csaStatus = 'Margin Call Required';
      marginCallAmount = exposure - threshold;
    } else if (exposure > threshold * 0.85) {
      csaStatus = 'Margin Call Imminent';
    }
  }

  const hedgingEffectiveness = swap.swap_type === 'CROSS_CURRENCY_SWAP'
    ? 'Hedges FX coupon obligations into domestic revenue profile'
    : swap.pay_leg_type === 'FIXED'
    ? 'Synthetic fixed liability (immunized against SOFR/EURIBOR rate hikes)'
    : 'Floating liability asset-swap yield enhancement';

  return {
    swap_id: swap.swap_id,
    receive_leg_pv: Number(receivePV.toFixed(2)),
    pay_leg_pv: Number(payPV.toFixed(2)),
    net_present_value: Number(netPresentValue.toFixed(2)),
    dv01_sensitivity: Math.round(dv01),
    csa_status: csaStatus,
    margin_call_amount: Number(marginCallAmount.toFixed(2)),
    hedging_effectiveness: hedgingEffectiveness,
  };
}

/**
 * Portfolio level aggregation of swaps
 */
export function aggregateSwapPortfolio(
  swaps: SovereignSwapPosition[],
  yieldShiftBps = 0
): {
  total_notional_usd_m: number;
  total_mtm_usd_m: number;
  total_dv01_usd: number;
  margin_call_risk_count: number;
  total_margin_call_usd_m: number;
  results: SwapValuationResult[];
} {
  const results = swaps.map(s => valueSovereignSwap(s, yieldShiftBps));
  
  let totalNotional = 0;
  let totalMtM = 0;
  let totalDv01 = 0;
  let marginCallCount = 0;
  let totalMarginCall = 0;

  swaps.forEach((s, idx) => {
    totalNotional += s.notional_amount;
    const res = results[idx];
    totalMtM += res.net_present_value;
    totalDv01 += res.dv01_sensitivity;
    if (res.csa_status === 'Margin Call Required') {
      marginCallCount += 1;
      totalMarginCall += res.margin_call_amount;
    } else if (res.csa_status === 'Margin Call Imminent') {
      marginCallCount += 0.5;
    }
  });

  return {
    total_notional_usd_m: Math.round(totalNotional),
    total_mtm_usd_m: Number(totalMtM.toFixed(2)),
    total_dv01_usd: Math.round(totalDv01),
    margin_call_risk_count: Math.ceil(marginCallCount),
    total_margin_call_usd_m: Number(totalMarginCall.toFixed(2)),
    results,
  };
}
