export interface SovereignEntity {
  country_iso_alpha3: string;
  country_name: string;
  reporting_currency: string;
  imf_member_status: boolean;
  credit_rating: string;
  gdp_usd_billion: number;
  initial_debt_to_gdp: number; // in %
  baseline_inflation: number; // in %
  effective_tax_rate: number; // in %
  fx_reserve_months: number;
  exchange_rate_to_usd: number;
}

export interface MacroMetric {
  timestamp: string;
  country_iso: string;
  metric_code: 'GDP_NOMINAL' | 'CPI_YOY' | 'YIELD_10Y' | 'YIELD_2Y' | 'SOFR_FORWARD' | 'CDS_5Y' | 'PRIMARY_BALANCE_RATIO';
  metric_value: number;
  confidence_interval_low?: number;
  confidence_interval_high?: number;
  source_identifier: 'FRED' | 'IMF_GFS' | 'WORLD_BANK' | 'DBNOMICS';
}

export interface SovereignDebtInstrument {
  instrument_isin: string;
  issuing_country: string;
  description: string;
  issue_date: string;
  maturity_date: string;
  coupon_rate: number; // e.g. 0.0525 for 5.25%
  compounding_frequency: number; // 1, 2, or 4
  par_value_amount: number; // in Millions USD equivalent
  currency_code: string;
  restructuring_covenant_type: 'CAC_SINGLE_LIMB' | 'CAC_TWO_LIMB' | 'PARI_PASSU' | 'TRADITIONAL_UNANIMOUS';
  current_price: number; // per 100 par
  yield_to_maturity: number; // in %
  macaulay_duration?: number;
  modified_duration?: number;
  convexity?: number;
}

export interface SovereignSwapPosition {
  swap_id: string;
  sovereign_country: string;
  counterparty_name: string;
  trade_date: string;
  effective_date: string;
  termination_date: string;
  swap_type: 'INTEREST_RATE_SWAP' | 'CROSS_CURRENCY_SWAP';
  notional_amount: number; // in millions
  base_currency: string;
  target_currency?: string;
  
  // Receive Leg
  receive_leg_type: 'FIXED' | 'FLOATING';
  receive_rate_or_index: string;
  receive_rate_val: number; // e.g. 5.15% or forward index
  receive_day_count_convention: 'ACT_360' | '30_360' | 'ACT_ACT';
  
  // Pay Leg
  pay_leg_type: 'FIXED' | 'FLOATING';
  pay_rate_or_index: string;
  pay_rate_val: number; // e.g. 4.85% or EURIBOR
  pay_day_count_convention: 'ACT_360' | '30_360' | 'ACT_ACT';
  
  csa_collateral_threshold: number; // in millions USD
  current_mtm_valuation: number; // in millions USD
  basis_spread_bps?: number; // for CCS
  fx_rate_contract?: number;
}

export interface DSAParams {
  d_initial: number; // %
  r_nominal: number; // % effective interest rate
  g_nominal_growth: number; // % nominal GDP growth
  p_primary_balance: number; // % of GDP (+ surplus, - deficit)
  stock_flow_adjustment: number; // % eps shock (fx deval / contingent liabilities)
  horizon_years: number;
}

export interface DSAYearPoint {
  year: number;
  calendar_year: number;
  debt_ratio: number;
  interest_bill_ratio: number;
  snowball_effect: number; // (r - g)/(1 + g) * d_{t-1}
  primary_contribution: number;
  stock_flow: number;
  p_stabilizing: number;
}

export interface FanChartScenario {
  scenario_name: string;
  color: string;
  points: number[];
  description: string;
}

export interface AgentActionLog {
  agent_name: 'Fiscal Supervisor' | 'Quantitative Analytics' | 'Legal & Compliance' | 'Restructuring Strategy';
  thought_process: string;
  action_type: 'TOOL_CALL' | 'REASONING' | 'SYNTHESIS' | 'VALIDATION';
  tool_name?: string;
  tool_input?: Record<string, any>;
  tool_output?: any;
  timestamp: string;
}

export interface LegalCovenantDocument {
  id: string;
  country_iso: string;
  title: string;
  document_type: 'BOND_PROSPECTUS' | 'ISDA_SCHEDULE' | 'IMF_MEMORANDUM' | 'STATUTE';
  effective_date: string;
  governing_law: 'English Law' | 'New York Law' | 'Domestic Law';
  clauses: {
    section: string;
    clause_title: string;
    text: string;
    restructuring_implication: string;
    cac_threshold?: string;
  }[];
}

export interface RestructuringPackage {
  title: string;
  target_entity: string;
  target_debt_relief_pct: number;
  nominal_haircut_pct: number;
  maturity_extension_years: number;
  coupon_stepdown_bps: number;
  post_restructuring_debt_ratio: number;
  annual_cash_flow_savings_usd_m: number;
  isda_csa_unwind_value_usd_m: number;
  cac_threshold_approval_likely: boolean;
  mechanics_summary: string;
}
