import { DSAParams, DSAYearPoint, FanChartScenario } from '../types/sovereign';

/**
 * Deterministic Sovereign Debt Sustainability Analysis (DSA) Engine
 * Implements the standard structural law of motion:
 * d_t = ((1 + r_t) / (1 + g_t)) * d_{t-1} - p_t + eps_t
 */
export function computeDSATrajectory(params: DSAParams, baseYear = 2026): {
  trajectory: DSAYearPoint[];
  terminal_debt_ratio: number;
  stabilizing_primary_balance: number;
  is_sustainable: boolean;
  snowball_cumulative: number;
} {
  const { d_initial, r_nominal, g_nominal_growth, p_primary_balance, stock_flow_adjustment, horizon_years } = params;

  const r = r_nominal / 100.0;
  const g = g_nominal_growth / 100.0;
  const p = p_primary_balance / 100.0;
  const eps = stock_flow_adjustment / 100.0;

  const trajectory: DSAYearPoint[] = [];
  let current_d = d_initial;
  let snowball_cumulative = 0;

  // Initial base point (t = 0)
  const initial_p_star = ((r - g) / (1 + g)) * d_initial + (eps * 100);
  trajectory.push({
    year: 0,
    calendar_year: baseYear,
    debt_ratio: Number(current_d.toFixed(2)),
    interest_bill_ratio: Number((current_d * r).toFixed(2)),
    snowball_effect: 0,
    primary_contribution: 0,
    stock_flow: 0,
    p_stabilizing: Number(initial_p_star.toFixed(2)),
  });

  for (let t = 1; t <= horizon_years; t++) {
    const prior_d = current_d;
    const snowball_pct = ((r - g) / (1 + g)) * prior_d;
    snowball_cumulative += snowball_pct;
    
    // Law of motion step
    // d_t = ((1+r)/(1+g)) * d_{t-1} - p_t + eps_t
    // Notice that p and eps are in percentage of GDP terms
    const next_d_unbounded = ((1 + r) / (1 + g)) * prior_d - (p * 100) + (eps * 100);
    current_d = Math.max(0, next_d_unbounded);

    const p_stabilizing = ((r - g) / (1 + g)) * current_d + (eps * 100);

    trajectory.push({
      year: t,
      calendar_year: baseYear + t,
      debt_ratio: Number(current_d.toFixed(2)),
      interest_bill_ratio: Number((current_d * r).toFixed(2)),
      snowball_effect: Number(snowball_pct.toFixed(2)),
      primary_contribution: Number((-p * 100).toFixed(2)),
      stock_flow: Number((eps * 100).toFixed(2)),
      p_stabilizing: Number(p_stabilizing.toFixed(2)),
    });
  }

  const terminal_debt_ratio = trajectory[trajectory.length - 1].debt_ratio;
  const stabilizing_primary_balance = ((r - g) / (1 + g)) * d_initial + (eps * 100);
  const is_sustainable = terminal_debt_ratio <= d_initial;

  return {
    trajectory,
    terminal_debt_ratio,
    stabilizing_primary_balance: Number(stabilizing_primary_balance.toFixed(2)),
    is_sustainable,
    snowball_cumulative: Number(snowball_cumulative.toFixed(2)),
  };
}

/**
 * Computes a standardized stress testing fan of scenarios
 */
export function generateStressFanScenarios(params: DSAParams, baseYear = 2026): FanChartScenario[] {
  const years = params.horizon_years;
  
  // Baseline
  const baseline = computeDSATrajectory(params, baseYear).trajectory.map(pt => pt.debt_ratio);

  // Scenario 1: Real Interest Rate Shock (+250 bps interest rate)
  const rateShock = computeDSATrajectory({
    ...params,
    r_nominal: params.r_nominal + 2.5,
  }, baseYear).trajectory.map(pt => pt.debt_ratio);

  // Scenario 2: Growth Slump Shock (-2.5% GDP growth)
  const growthShock = computeDSATrajectory({
    ...params,
    g_nominal_growth: params.g_nominal_growth - 2.5,
  }, baseYear).trajectory.map(pt => pt.debt_ratio);

  // Scenario 3: Fiscal Slippage Shock (-2.0% Primary Balance)
  const fiscalShock = computeDSATrajectory({
    ...params,
    p_primary_balance: params.p_primary_balance - 2.0,
  }, baseYear).trajectory.map(pt => pt.debt_ratio);

  // Scenario 4: Combined Sovereign Shock (Rates +200 bps, Growth -200 bps, Primary -150 bps, Stock-Flow +3%)
  const combinedShock = computeDSATrajectory({
    ...params,
    r_nominal: params.r_nominal + 2.0,
    g_nominal_growth: params.g_nominal_growth - 2.0,
    p_primary_balance: params.p_primary_balance - 1.5,
    stock_flow_adjustment: params.stock_flow_adjustment + 3.0,
  }, baseYear).trajectory.map(pt => pt.debt_ratio);

  // Scenario 5: Fiscal Consolidation Reform (+2.0% Primary Surplus)
  const reformScenario = computeDSATrajectory({
    ...params,
    p_primary_balance: params.p_primary_balance + 2.0,
    g_nominal_growth: params.g_nominal_growth + 0.5,
  }, baseYear).trajectory.map(pt => pt.debt_ratio);

  return [
    {
      scenario_name: 'Baseline Projections',
      color: '#3b82f6', // blue
      points: baseline,
      description: 'Current macroeconomic consensus and fiscal path.',
    },
    {
      scenario_name: 'Interest Rate Spike (+250 bps)',
      color: '#f59e0b', // amber
      points: rateShock,
      description: 'Global monetary tightening with high rollover coupons.',
    },
    {
      scenario_name: 'Growth Recession (-2.5% GDP)',
      color: '#ec4899', // pink
      points: growthShock,
      description: 'External terms-of-trade deterioration and slump.',
    },
    {
      scenario_name: 'Fiscal Slippage (-2.0% Primary)',
      color: '#8b5cf6', // purple
      points: fiscalShock,
      description: 'Pre-election spending and expenditure overruns.',
    },
    {
      scenario_name: 'Combined Macro Stress Shock',
      color: '#ef4444', // red
      points: combinedShock,
      description: 'Simultaneous currency depreciation, stagflation & deficit widening.',
    },
    {
      scenario_name: 'Fiscal Consolidation Reform',
      color: '#10b981', // emerald
      points: reformScenario,
      description: 'Structural reforms achieving sustained primary surplus.',
    },
  ];
}
