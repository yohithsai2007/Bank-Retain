const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('http');

const {
  calculatePercentageChange,
  calculateDeclinePercentage,
  calculateSMA,
  calculateSMADeviation,
  calculateCampaignStatistics,
} = require('../server/utils/mathUtils');

const {
  evaluateRisk,
  getRiskCategory,
  DEFAULT_RULES,
} = require('../server/services/riskScoringService');

const app = require('../server/app');

describe('BankRetain: Comprehensive Edge Cases & Rule Verification', () => {

  test('Decline percentage handles zero denominator safely', () => {
    // Current is 100, previous is 0
    const res = calculateDeclinePercentage(100, 0);
    assert.equal(res, null, 'Must return null when previous value is zero');
  });

  test('Decline percentage handles zero current value (100% decline)', () => {
    // Previous is 500, current is 0
    const res = calculateDeclinePercentage(0, 500);
    assert.equal(res, 100.0, 'Zero current value must represent 100% decline');
  });

  test('SMA calculation ignores invalid non-numeric inputs', () => {
    const res = calculateSMA(['abc', null, 50], 3);
    assert.equal(res, null, 'SMA should return null on non-numeric entries');
  });

  test('SMA handles exact window length', () => {
    const res = calculateSMA([100, 200, 300], 3);
    assert.equal(res, 200.0);
  });

  test('Risk score correctly accumulates points across multiple indicators', () => {
    // High Tx volume decline (+30 pts) and High balance decline (+25 pts)
    const metrics = {
      txVolumeDeclinePct: 30.0,
      balanceDeclinePct: 22.0,
      unresolvedComplaintsCount: 0,
      productUtilizationDeclinePct: 0,
      sustainedDeclineMonths: 0,
      currentTxCount: 700,
      baselineTxCount: 1000,
      currentBalance: 78000,
      baselineBalance: 100000,
    };
    const evalRes = evaluateRisk(metrics, DEFAULT_RULES);
    assert.equal(evalRes.riskScore, 55);
    assert.equal(evalRes.riskCategory, 'Medium');
    assert.equal(evalRes.details.length, 2);
  });

  test('Risk score with all indicators capped at 100 points', () => {
    const extremeMetrics = {
      txVolumeDeclinePct: 90.0, // 30
      balanceDeclinePct: 80.0, // 25
      unresolvedComplaintsCount: 5, // 20
      hasCriticalComplaint: true,
      productUtilizationDeclinePct: 50.0, // 15
      sustainedDeclineMonths: 6, // 10
      txSma3DeviationPct: 60.0,
      currentTxCount: 100,
      baselineTxCount: 1000,
      currentBalance: 10000,
      baselineBalance: 100000,
    };
    const evalRes = evaluateRisk(extremeMetrics, DEFAULT_RULES);
    assert.ok(evalRes.riskScore <= 100, 'Score must never exceed 100');
    assert.equal(evalRes.riskScore, 100);
    assert.equal(evalRes.riskCategory, 'Critical');
  });

  test('Two-proportion campaign statistics handles equal retention rates (zero lift)', () => {
    const stats = calculateCampaignStatistics(70, 100, 70, 100, 10000);
    assert.equal(stats.isValid, true);
    assert.equal(stats.absoluteLiftPercentage, 0.0);
    assert.equal(stats.relativeLiftPercentage, 0.0);
    assert.equal(stats.incrementalRetainedCustomers, 0.0);
    assert.equal(stats.isStatisticallySignificant, false);
  });

  test('Two-proportion campaign statistics handles negative lift (control outperformed treatment)', () => {
    const stats = calculateCampaignStatistics(60, 100, 80, 100, 10000);
    assert.equal(stats.isValid, true);
    assert.equal(stats.absoluteLiftPercentage, -20.0);
    assert.equal(stats.incrementalRetainedCustomers, -20.0);
    assert.equal(stats.costPerRetainedCustomer, null, 'Cost per retained client is undefined when incremental retained is not positive');
  });

});

describe('BankRetain: Express Server HTTP Endpoints', () => {

  test('GET /api/health returns operational status', async () => {
    const server = app.listen(0);
    const port = server.address().port;

    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.status, 'online');
    assert.equal(data.system, 'BankRetain Corporate Banking Analytics Engine');
    server.close();
  });

  test('POST /api/auth/login allows demo administrator login', async () => {
    const server = app.listen(0);
    const port = server.address().port;

    const res = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'Admin@123' }),
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(data.token, 'Must return JWT token');
    assert.equal(data.user.role, 'admin');
    server.close();
  });

});
