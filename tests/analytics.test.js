const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  calculatePercentageChange,
  calculateDeclinePercentage,
  calculateSMA,
  calculateSMADeviation,
  calculateCampaignStatistics,
} = require('../server/utils/mathUtils');

const {
  getRiskCategory,
  evaluateRisk,
  DEFAULT_RULES,
} = require('../server/services/riskScoringService');

describe('BankRetain: Mathematical & Analytics Engine Tests', () => {

  test('Percentage change calculation: ((current - prev) / prev) * 100', () => {
    // 1000 -> 1250 is +25%
    const change = calculatePercentageChange(1250, 1000);
    assert.equal(change, 25.0);

    // 1000 -> 750 is -25%
    const drop = calculatePercentageChange(750, 1000);
    assert.equal(drop, -25.0);
  });

  test('Decline percentage calculation: ((prev - current) / prev) * 100', () => {
    // 1000 -> 600 is 40% decline
    const decline = calculateDeclinePercentage(600, 1000);
    assert.equal(decline, 40.0);

    // Growth (1000 -> 1200) gives negative decline (-20%)
    const growth = calculateDeclinePercentage(1200, 1000);
    assert.equal(growth, -20.0);
  });

  test('Zero-denominator handling prevents division by zero and returns null', () => {
    const zeroPrev = calculatePercentageChange(500, 0);
    assert.equal(zeroPrev, null, 'Previous value of 0 must return null to allow low-activity rule evaluation');

    const zeroDecline = calculateDeclinePercentage(500, 0);
    assert.equal(zeroDecline, null, 'Decline percentage with 0 previous must safely return null');

    const nullValue = calculateDeclinePercentage(null, 100);
    assert.equal(nullValue, null);
  });

  test('Simple Moving Average (SMA) calculation and window constraints', () => {
    const series = [100, 200, 300, 400, 500];

    // SMA(3) on series = (300 + 400 + 500) / 3 = 400
    const sma3 = calculateSMA(series, 3);
    assert.equal(sma3, 400.0);

    // SMA(5) = (100 + 200 + 300 + 400 + 500) / 5 = 300
    const sma5 = calculateSMA(series, 5);
    assert.equal(sma5, 300.0);

    // Insufficient historical data: series has 5 elements, requesting SMA(6) returns null
    const sma6 = calculateSMA(series, 6);
    assert.equal(sma6, null, 'Must not calculate moving average when insufficient historical data exists');
  });

  test('SMA Deviation: ((SMA - current) / SMA) * 100', () => {
    // SMA = 1000, Current = 600 -> ((1000 - 600) / 1000) * 100 = 40%
    const dev = calculateSMADeviation(600, 1000);
    assert.equal(dev, 40.0);

    // SMA = 1000, Current = 1000 -> 0%
    const zeroDev = calculateSMADeviation(1000, 1000);
    assert.equal(zeroDev, 0.0);
  });

});

describe('BankRetain: Rule-Based Risk Scoring Tests', () => {

  test('Risk category classification boundaries', () => {
    assert.equal(getRiskCategory(0), 'Low');
    assert.equal(getRiskCategory(29), 'Low');
    assert.equal(getRiskCategory(30), 'Medium');
    assert.equal(getRiskCategory(59), 'Medium');
    assert.equal(getRiskCategory(60), 'High');
    assert.equal(getRiskCategory(79), 'High');
    assert.equal(getRiskCategory(80), 'Critical');
    assert.equal(getRiskCategory(100), 'Critical');
  });

  test('Risk score capping at 100', () => {
    // Over-threshold metrics triggering all rules: 30 + 25 + 20 + 15 + 10 = 100
    const highRiskMetrics = {
      txVolumeDeclinePct: 35.0,
      balanceDeclinePct: 28.0,
      unresolvedComplaintsCount: 3,
      hasCriticalComplaint: true,
      productUtilizationDeclinePct: 25.0,
      sustainedDeclineMonths: 3,
      txSma3DeviationPct: 35.0,
      currentTxCount: 500,
      baselineTxCount: 1000,
      currentBalance: 500000,
      baselineBalance: 1000000,
    };

    const evaluation = evaluateRisk(highRiskMetrics, DEFAULT_RULES);
    assert.equal(evaluation.riskScore, 100);
    assert.equal(evaluation.riskCategory, 'Critical');
    assert.equal(evaluation.triggeredRuleCount, 5);
  });

  test('Stable customer receives score of 0 and Low category', () => {
    const stableMetrics = {
      txVolumeDeclinePct: 0.0,
      balanceDeclinePct: 2.0,
      unresolvedComplaintsCount: 0,
      hasCriticalComplaint: false,
      productUtilizationDeclinePct: 0.0,
      sustainedDeclineMonths: 0,
      txSma3DeviationPct: 0.0,
    };

    const evaluation = evaluateRisk(stableMetrics, DEFAULT_RULES);
    assert.equal(evaluation.riskScore, 0);
    assert.equal(evaluation.riskCategory, 'Low');
    assert.equal(evaluation.triggeredRuleCount, 0);
  });

  test('Explainability: Triggered rules provide observed value, baseline, and points', () => {
    const partialMetrics = {
      txVolumeDeclinePct: 30.0, // Trigger Rule 1 (30 pts)
      balanceDeclinePct: 5.0,  // Under threshold (20)
      unresolvedComplaintsCount: 0,
      productUtilizationDeclinePct: 0,
      sustainedDeclineMonths: 0,
      currentTxCount: 700,
      baselineTxCount: 1000,
    };

    const evaluation = evaluateRisk(partialMetrics, DEFAULT_RULES);
    assert.equal(evaluation.riskScore, 30);
    assert.equal(evaluation.riskCategory, 'Medium');
    assert.equal(evaluation.details.length, 1);
    assert.equal(evaluation.details[0].ruleCode, 'RULE_TX_VOL_DECLINE');
    assert.equal(evaluation.details[0].pointsContributed, 30);
  });

});

describe('BankRetain: Campaign RCT Statistics Tests', () => {

  test('Two-proportion Z-test and absolute retention lift calculation', () => {
    // Treatment: 100 assigned, 85 retained (85%)
    // Control: 100 assigned, 65 retained (65%)
    // Absolute lift = 85% - 65% = +20%
    // Budget: $50,000
    const stats = calculateCampaignStatistics(85, 100, 65, 100, 50000);

    assert.equal(stats.isValid, true);
    assert.equal(stats.treatmentRetentionRate, 85.0);
    assert.equal(stats.controlRetentionRate, 65.0);
    assert.equal(stats.absoluteLiftPercentage, 20.0);
    assert.equal(stats.incrementalRetainedCustomers, 20.0);
    assert.equal(stats.costPerRetainedCustomer, 2500.0); // $50,000 / 20 = $2,500
    assert.equal(stats.isStatisticallySignificant, true, 'p-value should be < 0.05 for this sample and lift');
    assert.ok(stats.pValue < 0.01, 'p-value is highly significant');
    assert.ok(stats.confidenceInterval95.lowerPercentage > 0, '95% CI lower bound is positive');
  });

  test('Invalid campaign sample sizes return error safely', () => {
    const invalid = calculateCampaignStatistics(50, 0, 50, 100);
    assert.equal(invalid.isValid, false);
    assert.ok(invalid.error);
  });

});
