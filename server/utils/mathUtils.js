/**
 * BankRetain: Conventional Mathematical & Statistical Utilities
 * No machine learning, external AI, or black-box models.
 * Transparent, deterministic algorithms with safe zero-denominator handling.
 */

/**
 * Calculate percentage change: ((current - previous) / previous) * 100
 * Handles zero and null denominators safely.
 * @param {number|null} current 
 * @param {number|null} previous 
 * @returns {number|null}
 */
function calculatePercentageChange(current, previous) {
  if (previous === null || previous === undefined || current === null || current === undefined) {
    return null;
  }
  const curr = Number(current);
  const prev = Number(previous);
  if (isNaN(curr) || isNaN(prev)) return null;
  if (prev === 0) {
    // Zero-denominator: decline is unavailable; caller handles low-activity rule
    return null;
  }
  const pct = ((curr - prev) / prev) * 100;
  return Number(pct.toFixed(2));
}

/**
 * Calculate decline percentage: ((previous - current) / previous) * 100
 * Positive value represents a decline (loss).
 * Negative value represents growth.
 * @param {number|null} current 
 * @param {number|null} previous 
 * @returns {number|null}
 */
function calculateDeclinePercentage(current, previous) {
  if (previous === null || previous === undefined || current === null || current === undefined) {
    return null;
  }
  const curr = Number(current);
  const prev = Number(previous);
  if (isNaN(curr) || isNaN(prev)) return null;
  if (prev === 0) {
    return null; // Division by zero handled safely
  }
  const decline = ((prev - curr) / prev) * 100;
  return Number(decline.toFixed(2));
}

/**
 * Calculate Simple Moving Average: SMA(n) = Sum of latest n observations / n
 * Returns null if insufficient historical data exists (< n observations)
 * @param {number[]} values - Array of values ordered chronologically (oldest to newest)
 * @param {number} n - Window size
 * @returns {number|null}
 */
function calculateSMA(values, n) {
  if (!Array.isArray(values) || values.length < n || n <= 0) {
    return null;
  }
  // Take the last n observations
  const slice = values.slice(-n).map(Number);
  if (slice.some(v => isNaN(v) || v === null)) return null;
  const sum = slice.reduce((acc, val) => acc + val, 0);
  return Number((sum / n).toFixed(2));
}

/**
 * Calculate deviation of current value from moving average:
 * Deviation = ((SMA - Current) / SMA) * 100
 * Positive deviation indicates current value has fallen below the moving average.
 * @param {number|null} current 
 * @param {number|null} sma 
 * @returns {number|null}
 */
function calculateSMADeviation(current, sma) {
  if (sma === null || sma === undefined || current === null || current === undefined) {
    return null;
  }
  const s = Number(sma);
  const c = Number(current);
  if (isNaN(s) || isNaN(c) || s === 0) return null;
  const dev = ((s - c) / s) * 100;
  return Number(dev.toFixed(2));
}

/**
 * Normal Distribution Cumulative Distribution Function approximation (Abramowitz & Stegun)
 * @param {number} z 
 * @returns {number} probability between 0 and 1
 */
function standardNormalCDF(z) {
  if (z === 0) return 0.5;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  // Error function approximation
  const t = 1.0 / (1.0 + 0.3275911 * x);
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const erf = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * erf);
}

/**
 * Calculate two-proportion randomized controlled trial (A/B) campaign analytics
 * @param {number} treatRetained - Number of retained customers in treatment group
 * @param {number} treatTotal - Total customers assigned to treatment
 * @param {number} ctrlRetained - Number of retained customers in control group
 * @param {number} ctrlTotal - Total customers assigned to control
 * @param {number} campaignCost - Total financial cost of campaign
 * @returns {Object} statistical analysis
 */
function calculateCampaignStatistics(treatRetained, treatTotal, ctrlRetained, ctrlTotal, campaignCost = 0) {
  const n1 = Number(treatTotal);
  const r1 = Number(treatRetained);
  const n0 = Number(ctrlTotal);
  const r0 = Number(ctrlRetained);
  const cost = Number(campaignCost) || 0;

  if (n1 <= 0 || n0 <= 0 || r1 < 0 || r0 < 0 || r1 > n1 || r0 > n0) {
    return {
      isValid: false,
      error: 'Invalid sample sizes or retention counts for statistical evaluation.',
    };
  }

  // Treatment and Control Retention Rates
  const p1 = r1 / n1;
  const p0 = r0 / n0;

  // Absolute Retention Lift: Treatment Rate - Control Rate
  const absoluteLift = p1 - p0;
  const absoluteLiftPct = Number((absoluteLift * 100).toFixed(2));

  // Relative Retention Lift: ((Treatment Rate - Control Rate) / Control Rate) * 100
  let relativeLiftPct = null;
  if (p0 > 0) {
    relativeLiftPct = Number(((absoluteLift / p0) * 100).toFixed(2));
  }

  // Pooled Two-Proportion Z-Test
  const pooledP = (r1 + r0) / (n1 + n0);
  const sePool = Math.sqrt(pooledP * (1 - pooledP) * ((1 / n1) + (1 / n0)));
  
  let zScore = 0;
  let pValue = 1.0;
  if (sePool > 0) {
    zScore = Number((absoluteLift / sePool).toFixed(3));
    // Two-tailed p-value
    const cdf = standardNormalCDF(Math.abs(zScore));
    pValue = Number((2 * (1 - cdf)).toFixed(4));
  }

  // 95% Confidence Interval for Absolute Lift (using unpooled standard error)
  const seUnpooled = Math.sqrt((p1 * (1 - p1) / n1) + (p0 * (1 - p0) / n0));
  const zCritical95 = 1.95996;
  const marginOfError = zCritical95 * seUnpooled;
  const ciLower = Number(((absoluteLift - marginOfError) * 100).toFixed(2));
  const ciUpper = Number(((absoluteLift + marginOfError) * 100).toFixed(2));

  // Incremental retained customers in treatment group
  const incrementalRetainedCustomers = Number((absoluteLift * n1).toFixed(1));
  let costPerRetainedCustomer = null;
  if (incrementalRetainedCustomers > 0 && cost > 0) {
    costPerRetainedCustomer = Number((cost / incrementalRetainedCustomers).toFixed(2));
  }

  // Statistical Significance indicator at alpha = 0.05
  const isStatisticallySignificant = pValue < 0.05;

  return {
    isValid: true,
    treatmentTotal: n1,
    treatmentRetained: r1,
    treatmentRetentionRate: Number((p1 * 100).toFixed(2)),
    controlTotal: n0,
    controlRetained: r0,
    controlRetentionRate: Number((p0 * 100).toFixed(2)),
    absoluteLiftPercentage: absoluteLiftPct,
    relativeLiftPercentage: relativeLiftPct,
    zScore,
    pValue,
    standardError: Number(seUnpooled.toFixed(4)),
    confidenceInterval95: {
      lowerPercentage: ciLower,
      upperPercentage: ciUpper,
    },
    isStatisticallySignificant,
    campaignCost: cost,
    incrementalRetainedCustomers,
    costPerRetainedCustomer,
    methodology: 'Two-proportion Z-test with intention-to-treat (ITT) baseline',
  };
}

module.exports = {
  calculatePercentageChange,
  calculateDeclinePercentage,
  calculateSMA,
  calculateSMADeviation,
  standardNormalCDF,
  calculateCampaignStatistics,
};
