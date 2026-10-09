import { SovereignDebtInstrument } from '../types/sovereign';

/**
 * Calculates Macaulay Duration, Modified Duration, Convexity, and DV01 for a sovereign bond
 */
export function calculateBondMetrics(
  instrument: SovereignDebtInstrument,
  referenceDateStr = '2026-10-09'
): {
  price: number;
  macaulay_duration: number;
  modified_duration: number;
  convexity: number;
  dv01: number;
  years_to_maturity: number;
} {
  const refDate = new Date(referenceDateStr).getTime();
  const matDate = new Date(instrument.maturity_date).getTime();
  const yearsToMaturity = Math.max(0.1, (matDate - refDate) / (1000 * 60 * 60 * 24 * 365.25));
  
  const y = instrument.yield_to_maturity / 100.0;
  const k = instrument.compounding_frequency || 2;
  const c = instrument.coupon_rate;
  const par = 100; // normalized base

  const numPeriods = Math.max(1, Math.round(yearsToMaturity * k));
  const periodicCoupon = (c * par) / k;
  const periodicYield = y / k;

  let presentValueSum = 0;
  let weightedTimeSum = 0;
  let convexitySum = 0;

  for (let i = 1; i <= numPeriods; i++) {
    const t = i / k; // time in years
    const isMaturity = i === numPeriods;
    const cashFlow = isMaturity ? periodicCoupon + par : periodicCoupon;
    const discountFactor = Math.pow(1 + periodicYield, i);
    const pv = cashFlow / discountFactor;

    presentValueSum += pv;
    weightedTimeSum += t * pv;
    // Convexity term
    convexitySum += (pv * (t * t + t / k));
  }

  const price = presentValueSum;
  const macaulayDuration = weightedTimeSum / price;
  const modifiedDuration = macaulayDuration / (1 + periodicYield);
  const convexity = convexitySum / (price * Math.pow(1 + periodicYield, 2));
  const dv01 = (price * (instrument.par_value_amount * 10000) * modifiedDuration * 0.0001) / 100; // in USD per 1bp

  return {
    price: Number(price.toFixed(3)),
    macaulay_duration: Number(macaulayDuration.toFixed(2)),
    modified_duration: Number(modifiedDuration.toFixed(2)),
    convexity: Number(convexity.toFixed(2)),
    dv01: Number(dv01.toFixed(1)),
    years_to_maturity: Number(yearsToMaturity.toFixed(2)),
  };
}

export interface RefundingLadderItem {
  year: string;
  usd_tranche: number;
  eur_tranche: number;
  local_tranche: number;
  other_tranche: number;
  total_par: number;
  weighted_coupon: number;
  weighted_duration: number;
  bond_count: number;
}

export function buildRefundingLadder(
  instruments: SovereignDebtInstrument[],
  startYear = 2026,
  endYear = 2035
): RefundingLadderItem[] {
  const ladderMap: Record<string, {
    usd: number;
    eur: number;
    local: number;
    other: number;
    totalPar: number;
    couponWeightSum: number;
    durationWeightSum: number;
    count: number;
  }> = {};

  for (let yr = startYear; yr <= endYear; yr++) {
    ladderMap[yr.toString()] = {
      usd: 0,
      eur: 0,
      local: 0,
      other: 0,
      totalPar: 0,
      couponWeightSum: 0,
      durationWeightSum: 0,
      count: 0,
    };
  }

  instruments.forEach((inst) => {
    const matYear = new Date(inst.maturity_date).getFullYear().toString();
    if (!ladderMap[matYear]) {
      ladderMap[matYear] = {
        usd: 0,
        eur: 0,
        local: 0,
        other: 0,
        totalPar: 0,
        couponWeightSum: 0,
        durationWeightSum: 0,
        count: 0,
      };
    }

    const item = ladderMap[matYear];
    const metrics = calculateBondMetrics(inst);
    const par = inst.par_value_amount; // Millions USD eq

    if (inst.currency_code === 'USD') {
      item.usd += par;
    } else if (inst.currency_code === 'EUR') {
      item.eur += par;
    } else if (['BRL', 'MXN', 'ZAR', 'IDR', 'TRY', 'ARS'].includes(inst.currency_code)) {
      item.local += par;
    } else {
      item.other += par;
    }

    item.totalPar += par;
    item.couponWeightSum += inst.coupon_rate * 100 * par;
    item.durationWeightSum += metrics.modified_duration * par;
    item.count += 1;
  });

  return Object.keys(ladderMap)
    .sort()
    .filter(y => Number(y) >= startYear && Number(y) <= endYear)
    .map((year) => {
      const row = ladderMap[year];
      const avgCoupon = row.totalPar > 0 ? row.couponWeightSum / row.totalPar : 0;
      const avgDuration = row.totalPar > 0 ? row.durationWeightSum / row.totalPar : 0;

      return {
        year,
        usd_tranche: Math.round(row.usd),
        eur_tranche: Math.round(row.eur),
        local_tranche: Math.round(row.local),
        other_tranche: Math.round(row.other),
        total_par: Math.round(row.totalPar),
        weighted_coupon: Number(avgCoupon.toFixed(2)),
        weighted_duration: Number(avgDuration.toFixed(2)),
        bond_count: row.count,
      };
    });
}
