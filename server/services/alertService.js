/**
 * BankRetain: Early Warning System (Alert Service)
 * 
 * Generates transparent alerts across 10 behavioural warning rules.
 * Prevents duplicate active alerts for unchanged conditions.
 * Escalates alerts when conditions persist or compound.
 */

const db = require('../config/db');

// The 10 standardized Early Warning rules
const ALERT_RULES = {
  TX_VOL_DECLINE: {
    code: 'WARN_01_TX_VOL',
    name: 'Transaction Volume Decline',
    severity: 'High',
    recommendedStep: 'Conduct transaction volume reconciliation and schedule review with corporate treasury officer.',
  },
  TX_VAL_DECLINE: {
    code: 'WARN_02_TX_VAL',
    name: 'Transaction Value Decline',
    severity: 'High',
    recommendedStep: 'Review corporate turnover migration and identify primary billing outflow destinations.',
  },
  BAL_DECLINE: {
    code: 'WARN_03_BAL',
    name: 'Operating Balance Outflow',
    severity: 'High',
    recommendedStep: 'Initiate liquidity management check to determine if balances were moved to competing deposit rates.',
  },
  PAYMENT_FREQ_REDUCTION: {
    code: 'WARN_04_PAY_FREQ',
    name: 'Sustained Payment Frequency Reduction',
    severity: 'Medium',
    recommendedStep: 'Contact corporate payroll and supplier disbursement desk to verify payment schedule changes.',
  },
  PROD_UTIL_DECLINE: {
    code: 'WARN_05_PROD_UTIL',
    name: 'Reduced Banking Product Utilization',
    severity: 'Medium',
    recommendedStep: 'Engage product specialists (Trade/Treasury) to review product pricing and service utility.',
  },
  INCREASED_COMPLAINTS: {
    code: 'WARN_06_COMPLAINT_FREQ',
    name: 'Increasing Complaint Frequency',
    severity: 'Medium',
    recommendedStep: 'Coordinate with customer operations desk to address repeated operational friction points.',
  },
  UNRESOLVED_SEVERE_COMPLAINT: {
    code: 'WARN_07_COMPLAINT_SEV',
    name: 'Unresolved Severe Complaint',
    severity: 'Critical',
    recommendedStep: 'Escalate immediately to senior Relationship Manager and Head of Client Experience.',
  },
  INTL_PAYMENTS_DECLINE: {
    code: 'WARN_08_INTL_PAY',
    name: 'Declining International Payments',
    severity: 'Medium',
    recommendedStep: 'Assess FX spreads and cross-border payment routing with FX Treasury desk.',
  },
  MULTIPLE_BEHAVIORAL_CHANGES: {
    code: 'WARN_09_MULTI_CHANGES',
    name: 'Multiple Simultaneous Behavioural Changes',
    severity: 'Critical',
    recommendedStep: 'Convene multi-product corporate relationship review to present an executive retention package.',
  },
  PERSISTENT_DECLINE: {
    code: 'WARN_10_PERSISTENT',
    name: 'Persistent Multi-Period Decline',
    severity: 'Critical',
    recommendedStep: 'Prioritize in-person executive visit by Managing Director of Commercial Banking.',
  },
};

/**
 * Scan a customer's data and update/generate early warning alerts
 * @param {string} customerId 
 */
async function evaluateCustomerAlerts(customerId) {
  // 1. Fetch customer details
  const [custRows] = await db.query(
    `SELECT c.id, c.company_name, c.rm_id, rm.name AS rm_name
     FROM customers c
     LEFT JOIN relationship_managers rm ON c.rm_id = rm.id
     WHERE c.id = ?`,
    [customerId]
  );
  if (!custRows.length) return [];

  const customer = custRows[0];

  // 2. Fetch transaction history (last 3 periods)
  const [txRows] = await db.query(
    `SELECT total_count, total_value, international_count, international_value,
            count_decline_pct, value_decline_pct, month_year, period_date
     FROM transaction_monthly
     WHERE customer_id = ?
     ORDER BY period_date DESC
     LIMIT 3`,
    [customerId]
  );

  // 3. Fetch balance history (last 3 periods)
  const [balRows] = await db.query(
    `SELECT closing_balance, previous_balance, balance_decline_pct, sma_3_deviation_pct, sustained_decline_months
     FROM operating_balances
     WHERE customer_id = ?
     ORDER BY period_date DESC
     LIMIT 3`,
    [customerId]
  );

  // 4. Fetch complaints
  const [compRows] = await db.query(
    `SELECT id, severity, status, summary, reported_date
     FROM service_complaints
     WHERE customer_id = ? AND status IN ('Open', 'Under Investigation', 'Escalated')`,
    [customerId]
  );

  // 5. Fetch products
  const [prodRows] = await db.query(
    `SELECT id, product_category, status, utilization_pct
     FROM customer_products
     WHERE customer_id = ?`,
    [customerId]
  );

  const candidateAlerts = [];
  const latestTx = txRows[0] || {};
  const prevTx = txRows[1] || {};
  const latestBal = balRows[0] || {};

  // Rule 1: Transaction Volume Decline (>= 15% for medium, >= 25% for high)
  if (latestTx.count_decline_pct >= 25) {
    candidateAlerts.push({
      rule: ALERT_RULES.TX_VOL_DECLINE,
      observedValue: `${Number(latestTx.count_decline_pct).toFixed(1)}% decline (${latestTx.total_count} txs)`,
      historicalBaseline: `${prevTx.total_count || 'Historical'} txs/month`,
      threshold: '>= 25% decline',
      severity: latestTx.count_decline_pct >= 40 ? 'Critical' : 'High',
    });
  } else if (latestTx.count_decline_pct >= 15) {
    candidateAlerts.push({
      rule: ALERT_RULES.TX_VOL_DECLINE,
      observedValue: `${Number(latestTx.count_decline_pct).toFixed(1)}% decline (${latestTx.total_count} txs)`,
      historicalBaseline: `${prevTx.total_count || 'Historical'} txs/month`,
      threshold: '>= 15% decline',
      severity: 'Medium',
    });
  }

  // Rule 2: Transaction Value Decline (>= 20%)
  if (latestTx.value_decline_pct >= 20) {
    candidateAlerts.push({
      rule: ALERT_RULES.TX_VAL_DECLINE,
      observedValue: `${Number(latestTx.value_decline_pct).toFixed(1)}% drop in monthly turnover`,
      historicalBaseline: `$${Number(prevTx.total_value || 0).toLocaleString()} turnover`,
      threshold: '>= 20% value decline',
      severity: latestTx.value_decline_pct >= 40 ? 'Critical' : 'High',
    });
  }

  // Rule 3: Operating Balance Outflow (>= 20%)
  if (latestBal.balance_decline_pct >= 20) {
    candidateAlerts.push({
      rule: ALERT_RULES.BAL_DECLINE,
      observedValue: `${Number(latestBal.balance_decline_pct).toFixed(1)}% balance decrease ($${Number(latestBal.closing_balance).toLocaleString()})`,
      historicalBaseline: `$${Number(latestBal.previous_balance || 0).toLocaleString()} closing balance`,
      threshold: '>= 20% balance decline',
      severity: latestBal.balance_decline_pct >= 35 ? 'Critical' : 'High',
    });
  }

  // Rule 4: Payment Frequency Reduction (SMA-3 deviation >= 25%)
  if (latestBal.sma_3_deviation_pct >= 25) {
    candidateAlerts.push({
      rule: ALERT_RULES.PAYMENT_FREQ_REDUCTION,
      observedValue: `${Number(latestBal.sma_3_deviation_pct).toFixed(1)}% below 3-month moving average`,
      historicalBaseline: '3-Month Moving Average (SMA-3)',
      threshold: '>= 25% deviation from SMA-3',
      severity: 'Medium',
    });
  }

  // Rule 5: Reduced Banking Product Utilization
  const decliningProds = prodRows.filter(p => p.status === 'Declining' || p.status === 'Inactive');
  if (decliningProds.length > 0) {
    candidateAlerts.push({
      rule: ALERT_RULES.PROD_UTIL_DECLINE,
      observedValue: `${decliningProds.length} product(s) marked Declining or Inactive`,
      historicalBaseline: `${prodRows.length} active corporate products`,
      threshold: 'Any dormant or declining banking facility',
      severity: decliningProds.length >= 2 ? 'High' : 'Medium',
    });
  }

  // Rule 6: Increased Complaints (>= 2 unresolved complaints)
  if (compRows.length >= 2) {
    candidateAlerts.push({
      rule: ALERT_RULES.INCREASED_COMPLAINTS,
      observedValue: `${compRows.length} active open complaints`,
      historicalBaseline: '0-1 baseline complaint',
      threshold: '>= 2 open unresolved complaints',
      severity: 'Medium',
    });
  }

  // Rule 7: Unresolved Severe Complaints (Critical or High)
  const criticalComp = compRows.find(c => c.severity === 'Critical' || c.severity === 'High');
  if (criticalComp) {
    candidateAlerts.push({
      rule: ALERT_RULES.UNRESOLVED_SEVERE_COMPLAINT,
      observedValue: `Active ${criticalComp.severity} complaint: "${criticalComp.summary}"`,
      historicalBaseline: 'Zero unresolved high-severity complaints',
      threshold: 'Any open High or Critical severity complaint',
      severity: 'Critical',
    });
  }

  // Rule 8: Declining International Payments (>= 25% reduction)
  if (latestTx.international_count !== undefined && prevTx.international_count > 0) {
    const intlDecline = ((prevTx.international_count - latestTx.international_count) / prevTx.international_count) * 100;
    if (intlDecline >= 25) {
      candidateAlerts.push({
        rule: ALERT_RULES.INTL_PAYMENTS_DECLINE,
        observedValue: `${intlDecline.toFixed(1)}% decline in international wire transactions`,
        historicalBaseline: `${prevTx.international_count} cross-border wires`,
        threshold: '>= 25% drop in cross-border payments',
        severity: 'Medium',
      });
    }
  }

  // Rule 9: Multiple Simultaneous Behavioural Changes (>= 3 independent alerts triggered)
  if (candidateAlerts.length >= 3) {
    candidateAlerts.push({
      rule: ALERT_RULES.MULTIPLE_BEHAVIORAL_CHANGES,
      observedValue: `${candidateAlerts.length} concurrent warning indicators detected`,
      historicalBaseline: 'Normal baseline operations (0-1 warnings)',
      threshold: '>= 3 simultaneous warning indicators',
      severity: 'Critical',
    });
  }

  // Rule 10: Persistent Multi-Period Decline (sustained decline months >= 3)
  if (latestBal.sustained_decline_months >= 3) {
    candidateAlerts.push({
      rule: ALERT_RULES.PERSISTENT_DECLINE,
      observedValue: `${latestBal.sustained_decline_months} consecutive periods of capital and transaction contraction`,
      historicalBaseline: 'Consistent operating account balance',
      threshold: '>= 3 consecutive declining periods',
      severity: 'Critical',
    });
  }

  // Process candidate alerts into DB, avoiding duplicate active alerts
  const processedAlerts = [];

  for (const item of candidateAlerts) {
    const ruleCode = item.rule.code;

    // Check if active alert already exists for this rule and customer
    const [existing] = await db.query(
      `SELECT id, alert_uid, observed_value, severity, is_escalated, escalation_count
       FROM alerts
       WHERE customer_id = ? AND triggered_rule_code = ? AND status IN ('Active', 'Acknowledged', 'Under Review')
       LIMIT 1`,
      [customerId, ruleCode]
    );

    if (existing.length > 0) {
      // Active alert already exists for unchanged condition!
      // Update last_evaluated_date and handle escalation if observed severity increased
      const existingAlert = existing[0];
      const shouldEscalate = (item.severity === 'Critical' && existingAlert.severity !== 'Critical');

      await db.query(
        `UPDATE alerts
         SET observed_value = ?,
             last_evaluated_date = NOW(),
             is_escalated = CASE WHEN ? = TRUE THEN TRUE ELSE is_escalated END,
             escalation_count = CASE WHEN ? = TRUE THEN escalation_count + 1 ELSE escalation_count END,
             severity = CASE WHEN ? = TRUE THEN 'Critical' ELSE severity END
         WHERE id = ?`,
        [item.observedValue, shouldEscalate, shouldEscalate, shouldEscalate, existingAlert.id]
      );
      processedAlerts.push({ ...existingAlert, updated: true });
    } else {
      // Insert new alert
      const alertUid = `ALT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
      const [insertRes] = await db.query(
        `INSERT INTO alerts
         (alert_uid, customer_id, alert_type, triggered_rule_code, observed_value,
          historical_baseline, threshold, severity, detection_date, rm_id, status,
          recommended_next_step, is_escalated, escalation_count, last_evaluated_date, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, 'Active', ?, FALSE, 0, NOW(), NOW())`,
        [
          alertUid,
          customerId,
          item.rule.name,
          ruleCode,
          item.observedValue,
          item.historicalBaseline,
          item.threshold,
          item.severity,
          customer.rm_id,
          item.rule.recommendedStep,
        ]
      );
      processedAlerts.push({
        id: insertRes.insertId,
        alertUid,
        customerId,
        ruleCode,
        inserted: true,
      });
    }
  }

  return processedAlerts;
}

module.exports = {
  ALERT_RULES,
  evaluateCustomerAlerts,
};
