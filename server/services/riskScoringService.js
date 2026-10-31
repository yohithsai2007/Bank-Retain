/**
 * BankRetain: Rule-Based Risk Scoring Service
 * 
 * NOTE: Risk scores are strictly transparent, rule-based indicators calculated
 * from configurable business rules. A risk score of 80/100 is NOT an 80% probability
 * of attrition. It reflects the cumulative weight of observed early-warning conditions.
 * No machine learning or black-box predictive models are used.
 */

const { calculateDeclinePercentage, calculateSMADeviation } = require('../utils/mathUtils');
const db = require('../config/db');

// Default initial scoring rules per bank specification
const DEFAULT_RULES = [
  {
    code: 'RULE_TX_VOL_DECLINE',
    name: 'High Transaction Volume Decline',
    category: 'Transactions',
    defaultPoints: 30,
    currentPoints: 30,
    thresholdOperator: '>=',
    thresholdValue: 25.0, // > 25% decline
    description: 'Triggered when month-over-month transaction volume declines by 25% or more.',
  },
  {
    code: 'RULE_BAL_DECLINE',
    name: 'High Operating Balance Decline',
    category: 'Operating Balances',
    defaultPoints: 25,
    currentPoints: 25,
    thresholdOperator: '>=',
    thresholdValue: 20.0, // > 20% decline
    description: 'Triggered when operating balance declines by 20% or more compared to previous period.',
  },
  {
    code: 'RULE_COMPLAINTS_SEV',
    name: 'Repeated or Unresolved Service Complaints',
    category: 'Service Quality',
    defaultPoints: 20,
    currentPoints: 20,
    thresholdOperator: '>=',
    thresholdValue: 2.0, // >= 2 unresolved complaints or any critical complaint
    description: 'Triggered when customer has unresolved critical complaints or multiple open service escalations.',
  },
  {
    code: 'RULE_PROD_UTIL_DECLINE',
    name: 'Significant Product Utilization Decline',
    category: 'Products',
    defaultPoints: 15,
    currentPoints: 15,
    thresholdOperator: '>=',
    thresholdValue: 20.0, // >= 20% reduction or product status Declining
    description: 'Triggered when credit/treasury facility utilization drops significantly or products become inactive.',
  },
  {
    code: 'RULE_SUSTAINED_PAYMENT_DECLINE',
    name: 'Sustained Payment Activity Decline',
    category: 'Activity Trends',
    defaultPoints: 10,
    currentPoints: 10,
    thresholdOperator: '>=',
    thresholdValue: 2.0, // >= 2 consecutive months of sustained decline or SMA-3 deviation >= 30%
    description: 'Triggered when payment activity has fallen below the 3-month moving average by 30% or sustained decline for 2+ months.',
  },
];

/**
 * Determine risk category according to standard thresholds
 * 0–29: Low, 30–59: Medium, 60–79: High, 80–100: Critical
 * @param {number} score 
 * @returns {'Low' | 'Medium' | 'High' | 'Critical'}
 */
function getRiskCategory(score) {
  const capped = Math.min(100, Math.max(0, score));
  if (capped >= 80) return 'Critical';
  if (capped >= 60) return 'High';
  if (capped >= 30) return 'Medium';
  return 'Low';
}

/**
 * Fetch active scoring rules from the database or fallback to defaults
 */
async function getActiveRules() {
  try {
    const [rows] = await db.query(
      `SELECT rule_code AS code, rule_name AS name, category, default_points AS defaultPoints,
              current_points AS currentPoints, threshold_operator AS thresholdOperator,
              threshold_value AS thresholdValue, secondary_threshold AS secondaryThreshold,
              description, scoring_version AS scoringVersion
       FROM scoring_rules
       WHERE is_active = TRUE`
    );
    if (rows && rows.length > 0) {
      return rows;
    }
  } catch (err) {
    // If DB is offline or table does not exist yet, fallback gracefully
  }
  return DEFAULT_RULES;
}

/**
 * Evaluate risk score for a customer given their metrics
 * 
 * @param {Object} metrics
 * @param {Object} [activeRules] - Optional custom rules
 * @returns {Object} Full explainable evaluation
 */
function evaluateRisk(metrics, activeRules = DEFAULT_RULES) {
  const {
    txVolumeDeclinePct = 0,
    txValueDeclinePct = 0,
    balanceDeclinePct = 0,
    unresolvedComplaintsCount = 0,
    hasCriticalComplaint = false,
    productUtilizationDeclinePct = 0,
    hasDecliningProducts = false,
    sustainedDeclineMonths = 0,
    txSma3DeviationPct = 0,
    baselineTxCount = 0,
    baselineBalance = 0,
    currentTxCount = 0,
    currentBalance = 0,
  } = metrics;

  let totalPoints = 0;
  const triggeredDetails = [];

  // Helper map for rule points
  const ruleMap = {};
  for (const r of activeRules) {
    ruleMap[r.code] = r;
  }

  // 1. Transaction volume decline rule
  const txRule = ruleMap['RULE_TX_VOL_DECLINE'] || DEFAULT_RULES[0];
  const txThreshold = Number(txRule.thresholdValue || 25);
  const effectiveTxDecline = Math.max(Number(txVolumeDeclinePct) || 0, 0);

  if (effectiveTxDecline >= txThreshold) {
    const pts = Number(txRule.currentPoints || 30);
    totalPoints += pts;
    triggeredDetails.push({
      ruleCode: txRule.code,
      indicatorName: txRule.name || 'High Transaction Volume Decline',
      observedValue: `${effectiveTxDecline.toFixed(1)}% decline (${currentTxCount} vs previous baseline)`,
      baselineValue: baselineTxCount > 0 ? `${baselineTxCount} txs/mo` : 'Historical Monthly Average',
      thresholdApplied: `>= ${txThreshold}% decline`,
      pointsContributed: pts,
      explanation: `Transaction volume dropped by ${effectiveTxDecline.toFixed(1)}%, exceeding the warning threshold of ${txThreshold}%.`,
      isTriggered: true,
    });
  }

  // 2. Operating balance decline rule
  const balRule = ruleMap['RULE_BAL_DECLINE'] || DEFAULT_RULES[1];
  const balThreshold = Number(balRule.thresholdValue || 20);
  const effectiveBalDecline = Math.max(Number(balanceDeclinePct) || 0, 0);

  if (effectiveBalDecline >= balThreshold) {
    const pts = Number(balRule.currentPoints || 25);
    totalPoints += pts;
    triggeredDetails.push({
      ruleCode: balRule.code,
      indicatorName: balRule.name || 'High Operating Balance Decline',
      observedValue: `${effectiveBalDecline.toFixed(1)}% decline ($${Number(currentBalance).toLocaleString()})`,
      baselineValue: baselineBalance > 0 ? `$${Number(baselineBalance).toLocaleString()}` : 'Previous Operating Balance',
      thresholdApplied: `>= ${balThreshold}% decline`,
      pointsContributed: pts,
      explanation: `Operating balance declined by ${effectiveBalDecline.toFixed(1)}%, surpassing the ${balThreshold}% threshold. Capital outflow detected.`,
      isTriggered: true,
    });
  }

  // 3. Repeated or unresolved complaints rule
  const compRule = ruleMap['RULE_COMPLAINTS_SEV'] || DEFAULT_RULES[2];
  const compThreshold = Number(compRule.thresholdValue || 2);
  const complaintTriggered = unresolvedComplaintsCount >= compThreshold || hasCriticalComplaint;

  if (complaintTriggered) {
    const pts = Number(compRule.currentPoints || 20);
    totalPoints += pts;
    const reasonText = hasCriticalComplaint 
      ? `Active Critical severity complaint unresolved with ${unresolvedComplaintsCount} open issues.`
      : `${unresolvedComplaintsCount} active unresolved service complaints exceed the threshold of ${compThreshold}.`;

    triggeredDetails.push({
      ruleCode: compRule.code,
      indicatorName: compRule.name || 'Repeated or Unresolved Service Complaints',
      observedValue: `${unresolvedComplaintsCount} open complaints (${hasCriticalComplaint ? 'Critical severity logged' : 'Standard severity'})`,
      baselineValue: '0 unresolved issues',
      thresholdApplied: `>= ${compThreshold} unresolved or critical severity`,
      pointsContributed: pts,
      explanation: reasonText,
      isTriggered: true,
    });
  }

  // 4. Significant product utilization decline
  const prodRule = ruleMap['RULE_PROD_UTIL_DECLINE'] || DEFAULT_RULES[3];
  const prodThreshold = Number(prodRule.thresholdValue || 20);
  const effectiveProdDecline = Number(productUtilizationDeclinePct) || 0;
  const prodTriggered = effectiveProdDecline >= prodThreshold || hasDecliningProducts;

  if (prodTriggered) {
    const pts = Number(prodRule.currentPoints || 15);
    totalPoints += pts;
    triggeredDetails.push({
      ruleCode: prodRule.code,
      indicatorName: prodRule.name || 'Significant Product Utilization Decline',
      observedValue: hasDecliningProducts 
        ? `Products marked Declining / Inactive (${effectiveProdDecline.toFixed(1)}% reduction)`
        : `${effectiveProdDecline.toFixed(1)}% facility utilization decline`,
      baselineValue: 'Full corporate facility utilization',
      thresholdApplied: `>= ${prodThreshold}% utilization drop or dormant product`,
      pointsContributed: pts,
      explanation: `Core banking product utilization has fallen by ${effectiveProdDecline.toFixed(1)}%, indicating decreasing operational reliance on the bank.`,
      isTriggered: true,
    });
  }

  // 5. Sustained payment activity decline
  // Check that this is independent and not double counting a single month spike
  const payRule = ruleMap['RULE_SUSTAINED_PAYMENT_DECLINE'] || DEFAULT_RULES[4];
  const sustainedMonthsThreshold = Number(payRule.thresholdValue || 2);
  const smaDevThreshold = 30.0;
  const sustainedTriggered = (sustainedDeclineMonths >= sustainedMonthsThreshold) || (txSma3DeviationPct >= smaDevThreshold);

  if (sustainedTriggered) {
    const pts = Number(payRule.currentPoints || 10);
    totalPoints += pts;
    triggeredDetails.push({
      ruleCode: payRule.code,
      indicatorName: payRule.name || 'Sustained Payment Activity Decline',
      observedValue: `${sustainedDeclineMonths} consecutive declining months (SMA-3 deviation: ${Number(txSma3DeviationPct).toFixed(1)}%)`,
      baselineValue: '3-Month Simple Moving Average (SMA-3)',
      thresholdApplied: `>= ${sustainedMonthsThreshold} consecutive months OR >= ${smaDevThreshold}% below SMA-3`,
      pointsContributed: pts,
      explanation: `Payment volumes have exhibited a persistent downward trajectory across multiple cycles rather than a transient anomaly.`,
      isTriggered: true,
    });
  }

  // Cap score at 100
  const finalScore = Math.min(100, Math.max(0, totalPoints));
  const category = getRiskCategory(finalScore);

  return {
    riskScore: finalScore,
    riskCategory: category,
    maxScore: 100,
    scoringType: 'Rule-Based Deterministic Scoring (Not Machine Learning / Not Attrition Probability)',
    triggeredRuleCount: triggeredDetails.length,
    details: triggeredDetails,
  };
}

/**
 * Recalculate and persist risk assessment for a specific customer
 * @param {string} customerId 
 * @param {string} scoringVersion 
 */
async function calculateAndSaveCustomerRisk(customerId, scoringVersion = 'v1.0') {
  // 1. Get latest transaction metrics
  const [txRows] = await db.query(
    `SELECT total_count, total_value, count_decline_pct, value_decline_pct, month_year, period_date
     FROM transaction_monthly
     WHERE customer_id = ?
     ORDER BY period_date DESC
     LIMIT 4`,
    [customerId]
  );

  // 2. Get latest balance metrics
  const [balRows] = await db.query(
    `SELECT closing_balance, previous_balance, balance_decline_pct, sma_3_deviation_pct, sustained_decline_months
     FROM operating_balances
     WHERE customer_id = ?
     ORDER BY period_date DESC
     LIMIT 2`,
    [customerId]
  );

  // 3. Get open complaints
  const [compRows] = await db.query(
    `SELECT count(*) AS total_open,
            SUM(CASE WHEN severity = 'Critical' THEN 1 ELSE 0 END) AS critical_count
     FROM service_complaints
     WHERE customer_id = ? AND status IN ('Open', 'Under Investigation', 'Escalated')`,
    [customerId]
  );

  // 4. Get product status
  const [prodRows] = await db.query(
    `SELECT count(*) AS total_products,
            SUM(CASE WHEN status IN ('Declining', 'Pending Cancellation', 'Inactive') THEN 1 ELSE 0 END) AS declining_count,
            AVG(utilization_pct) AS avg_utilization
     FROM customer_products
     WHERE customer_id = ?`,
    [customerId]
  );

  // Previous assessment to calculate delta
  const [prevAssessments] = await db.query(
    `SELECT id, risk_score, risk_category, scoring_version
     FROM risk_assessments
     WHERE customer_id = ? AND is_latest = TRUE
     LIMIT 1`,
    [customerId]
  );

  const prevScore = prevAssessments.length > 0 ? prevAssessments[0].risk_score : null;

  // Extract metrics
  const latestTx = txRows[0] || {};
  const prevTx = txRows[1] || {};
  const latestBal = balRows[0] || {};

  const txCounts = txRows.map(r => r.total_count);
  const baselineTxCount = prevTx.total_count || (txRows.length > 1 ? txRows[1].total_count : 0);
  const baselineBal = latestBal.previous_balance || 0;

  // Compute SMA-3 deviation for transactions
  let txSma3Dev = 0;
  if (txCounts.length >= 3) {
    const sma3 = (txCounts[1] + txCounts[2] + (txCounts[3] || txCounts[2])) / 3;
    if (sma3 > 0) {
      txSma3Dev = Math.max(0, ((sma3 - latestTx.total_count) / sma3) * 100);
    }
  }

  const metrics = {
    txVolumeDeclinePct: latestTx.count_decline_pct || 0,
    txValueDeclinePct: latestTx.value_decline_pct || 0,
    balanceDeclinePct: latestBal.balance_decline_pct || 0,
    unresolvedComplaintsCount: compRows[0]?.total_open || 0,
    hasCriticalComplaint: (compRows[0]?.critical_count || 0) > 0,
    productUtilizationDeclinePct: (prodRows[0]?.declining_count || 0) > 0 ? 25 : 0,
    hasDecliningProducts: (prodRows[0]?.declining_count || 0) > 0,
    sustainedDeclineMonths: latestBal.sustained_decline_months || 0,
    txSma3DeviationPct: txSma3Dev,
    baselineTxCount,
    baselineBalance: baselineBal,
    currentTxCount: latestTx.total_count || 0,
    currentBalance: latestBal.closing_balance || 0,
  };

  const activeRules = await getActiveRules();
  const evalResult = evaluateRisk(metrics, activeRules);

  const scoreDiff = prevScore !== null ? evalResult.riskScore - prevScore : 0;
  let changeReason = 'Initial risk assessment calculated.';
  if (prevScore !== null) {
    if (scoreDiff > 0) {
      changeReason = `Risk increased by +${scoreDiff} points due to newly triggered early warning conditions.`;
    } else if (scoreDiff < 0) {
      changeReason = `Risk decreased by ${scoreDiff} points due to stabilization in customer activity.`;
    } else {
      changeReason = 'Risk score remained stable with no change in active warning rules.';
    }
  }

  // Mark prior assessments as not latest
  await db.query(
    `UPDATE risk_assessments SET is_latest = FALSE WHERE customer_id = ?`,
    [customerId]
  );

  // Insert new assessment
  const [insertRes] = await db.query(
    `INSERT INTO risk_assessments 
     (customer_id, assessment_date, scoring_version, risk_score, risk_category, 
      score_change_from_previous, score_change_reason, previous_score, is_latest, created_at)
     VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, TRUE, NOW())`,
    [
      customerId,
      scoringVersion,
      evalResult.riskScore,
      evalResult.riskCategory,
      scoreDiff,
      changeReason,
      prevScore,
    ]
  );

  const assessmentId = insertRes.insertId;

  // Insert explanation details
  for (const detail of evalResult.details) {
    await db.query(
      `INSERT INTO risk_assessment_details
       (assessment_id, rule_code, indicator_name, observed_value, baseline_value, 
        threshold_applied, points_contributed, explanation, is_triggered)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        assessmentId,
        detail.ruleCode,
        detail.indicatorName,
        detail.observedValue,
        detail.baselineValue,
        detail.thresholdApplied,
        detail.pointsContributed,
        detail.explanation,
      ]
    );
  }

  return {
    assessmentId,
    customerId,
    ...evalResult,
    scoreDiff,
    changeReason,
    assessmentDate: new Date().toISOString(),
  };
}

module.exports = {
  DEFAULT_RULES,
  getRiskCategory,
  getActiveRules,
  evaluateRisk,
  calculateAndSaveCustomerRisk,
};
