-- =============================================================================
-- PostgreSQL 16 & TimescaleDB Core Initialization Script
-- Sovereign Fiscal, Debt Dynamics & Derivatives Dashboard
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Sovereign Entity Registry
CREATE TABLE IF NOT EXISTS sovereign_entities (
    country_iso_alpha3 CHAR(3) PRIMARY KEY,
    country_name VARCHAR(100) NOT NULL,
    reporting_currency CHAR(3) NOT NULL,
    credit_rating VARCHAR(10) NOT NULL,
    gdp_usd_billion NUMERIC(12, 2) NOT NULL,
    initial_debt_to_gdp NUMERIC(6, 2) NOT NULL,
    baseline_inflation NUMERIC(5, 2) NOT NULL,
    effective_tax_rate NUMERIC(5, 2) NOT NULL,
    fx_reserve_months NUMERIC(5, 2) NOT NULL,
    imf_member_status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Time-Series Hypertable: Macroeconomic & Market Ingestions
CREATE TABLE IF NOT EXISTS sovereign_macro_metrics (
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    country_iso CHAR(3) REFERENCES sovereign_entities(country_iso_alpha3),
    metric_code VARCHAR(50) NOT NULL, -- 'GDP_NOMINAL', 'CPI_YOY', 'YIELD_10Y', 'SOFR_FORWARD', 'CDS_5Y'
    metric_value NUMERIC(20, 6) NOT NULL,
    confidence_interval_low NUMERIC(20, 6),
    confidence_interval_high NUMERIC(20, 6),
    source_identifier VARCHAR(30) NOT NULL -- 'FRED', 'IMF_GFS', 'WORLD_BANK', 'DBNOMICS'
);

-- Partition into TimescaleDB 1-month chunks
SELECT create_hypertable('sovereign_macro_metrics', 'timestamp', chunk_time_interval => INTERVAL '1 month', if_not_exists => TRUE);

-- 3. Debt Instrument Registry (Refunding & Restructuring Ledger)
CREATE TABLE IF NOT EXISTS sovereign_debt_instruments (
    instrument_isin CHAR(12) PRIMARY KEY,
    issuing_country CHAR(3) REFERENCES sovereign_entities(country_iso_alpha3),
    description VARCHAR(150) NOT NULL,
    issue_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    coupon_rate NUMERIC(6, 4) NOT NULL,
    compounding_frequency INT DEFAULT 2,
    par_value_amount NUMERIC(24, 2) NOT NULL, -- Millions USD equivalent
    currency_code CHAR(3) NOT NULL,
    restructuring_covenant_type VARCHAR(50) NOT NULL, -- 'CAC_SINGLE_LIMB', 'CAC_TWO_LIMB', 'PARI_PASSU'
    current_price NUMERIC(10, 4) DEFAULT 100.00,
    yield_to_maturity NUMERIC(6, 4) NOT NULL
);

-- 4. Sovereign Derivatives Registry (Swap Portfolio Matrix)
CREATE TABLE IF NOT EXISTS sovereign_swaps_registry (
    swap_id VARCHAR(50) PRIMARY KEY,
    sovereign_country CHAR(3) REFERENCES sovereign_entities(country_iso_alpha3),
    counterparty_name VARCHAR(150) NOT NULL,
    trade_date DATE NOT NULL,
    effective_date DATE NOT NULL,
    termination_date DATE NOT NULL,
    swap_type VARCHAR(30) NOT NULL, -- 'INTEREST_RATE_SWAP' or 'CROSS_CURRENCY_SWAP'
    notional_amount NUMERIC(24, 2) NOT NULL,
    base_currency CHAR(3) NOT NULL,
    target_currency CHAR(3),
    receive_leg_type VARCHAR(15) NOT NULL,
    receive_rate_or_index VARCHAR(50) NOT NULL,
    receive_rate_val NUMERIC(8, 4) NOT NULL,
    receive_day_count_convention VARCHAR(20) DEFAULT 'ACT_360',
    pay_leg_type VARCHAR(15) NOT NULL,
    pay_rate_or_index VARCHAR(50) NOT NULL,
    pay_rate_val NUMERIC(8, 4) NOT NULL,
    pay_day_count_convention VARCHAR(20) DEFAULT '30_360',
    csa_collateral_threshold NUMERIC(20, 2) DEFAULT 0.00,
    current_mtm_valuation NUMERIC(20, 2) DEFAULT 0.00
);

-- 5. Multi-Agent Memory & Checkpoint Store
CREATE TABLE IF NOT EXISTS agent_execution_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    agent_name VARCHAR(50) NOT NULL,
    thought_process TEXT NOT NULL,
    actions_taken JSONB NOT NULL,
    tokens_consumed INT DEFAULT 0
);

-- Optimized Performance Indexes
CREATE INDEX IF NOT EXISTS idx_macro_lookup ON sovereign_macro_metrics (country_iso, metric_code, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_bond_maturity ON sovereign_debt_instruments (issuing_country, maturity_date ASC);
CREATE INDEX IF NOT EXISTS idx_swaps_active ON sovereign_swaps_registry (sovereign_country, termination_date ASC);
CREATE INDEX IF NOT EXISTS idx_agent_session ON agent_execution_logs (session_id, timestamp ASC);

-- =============================================================================
-- Seed Sovereign Base Profiles
-- =============================================================================

INSERT INTO sovereign_entities (country_iso_alpha3, country_name, reporting_currency, credit_rating, gdp_usd_billion, initial_debt_to_gdp, baseline_inflation, effective_tax_rate, fx_reserve_months)
VALUES 
('ALP', 'Sovereign Alpha (Latin America / High Beta)', 'USD', 'BB-', 340.00, 76.50, 4.80, 22.50, 4.20),
('BET', 'Sovereign Beta (Southern Europe / IG Periphery)', 'EUR', 'BBB', 1250.00, 112.40, 2.30, 31.00, 8.50),
('GAM', 'Sovereign Gamma (Frontier / Vulnerable External)', 'USD', 'CCC+', 68.00, 89.20, 9.40, 16.50, 2.10),
('DEL', 'Sovereign Delta (East Asia / Export Surplus)', 'USD', 'AA-', 610.00, 48.00, 1.90, 20.00, 11.20)
ON CONFLICT (country_iso_alpha3) DO NOTHING;

-- Seed Sample Bond Instruments
INSERT INTO sovereign_debt_instruments (instrument_isin, issuing_country, description, issue_date, maturity_date, coupon_rate, par_value_amount, currency_code, restructuring_covenant_type, current_price, yield_to_maturity)
VALUES
('US05968RAA12', 'ALP', 'Sovereign Alpha 5.250% 2027 Global Bond', '2017-04-15', '2027-04-15', 0.0525, 1250.00, 'USD', 'CAC_SINGLE_LIMB', 97.40, 0.0685),
('US05968RAB94', 'ALP', 'Sovereign Alpha 6.125% 2029 Amortizing Note', '2019-09-20', '2029-09-20', 0.06125, 1800.00, 'USD', 'CAC_SINGLE_LIMB', 94.20, 0.0742),
('XS2193849102', 'ALP', 'Sovereign Alpha 4.500% 2028 Eurobond', '2018-06-11', '2028-06-11', 0.0450, 950.00, 'EUR', 'CAC_TWO_LIMB', 92.80, 0.0695),
('US05968RAC77', 'ALP', 'Sovereign Alpha 7.375% 2035 Long-Tenor Debenture', '2020-03-01', '2035-03-01', 0.07375, 2100.00, 'USD', 'CAC_SINGLE_LIMB', 89.50, 0.0835),
('IT0005432198', 'BET', 'Beta BTP Benchmark 3.850% 2028', '2021-09-01', '2028-09-01', 0.0385, 8500.00, 'EUR', 'CAC_TWO_LIMB', 100.20, 0.0375),
('IT0005510294', 'BET', 'Beta BTP 4.350% 2033 10Y Benchmark', '2023-03-01', '2033-03-01', 0.0435, 14200.00, 'EUR', 'CAC_TWO_LIMB', 101.40, 0.0415)
ON CONFLICT (instrument_isin) DO NOTHING;

-- Seed Sample Derivatives Swaps
INSERT INTO sovereign_swaps_registry (swap_id, sovereign_country, counterparty_name, trade_date, effective_date, termination_date, swap_type, notional_amount, base_currency, target_currency, receive_leg_type, receive_rate_or_index, receive_rate_val, pay_leg_type, pay_rate_or_index, pay_rate_val, csa_collateral_threshold, current_mtm_valuation)
VALUES
('SW-890A2', 'ALP', 'BNP Paribas S.A.', '2021-04-12', '2021-04-15', '2028-04-15', 'CROSS_CURRENCY_SWAP', 500.00, 'USD', 'EUR', 'FIXED', 'Fixed USD 5.25%', 5.2500, 'FLOATING', 'EURIBOR 6M + 45bps', 3.8500, 25.00, 12.40),
('SW-112B9', 'ALP', 'JPMorgan Chase Bank, N.A.', '2022-08-10', '2022-08-15', '2029-08-15', 'INTEREST_RATE_SWAP', 350.00, 'USD', NULL, 'FLOATING', 'SOFR Overnight Index', 4.9000, 'FIXED', 'Fixed USD 4.10%', 4.1000, 15.00, -3.80),
('SW-441F3', 'ALP', 'Citigroup Global Markets', '2023-01-20', '2023-01-25', '2030-01-25', 'INTEREST_RATE_SWAP', 200.00, 'USD', NULL, 'FIXED', 'Fixed USD 4.85%', 4.8500, 'FLOATING', 'SOFR 3M Forward', 4.6500, 10.00, 0.90)
ON CONFLICT (swap_id) DO NOTHING;
