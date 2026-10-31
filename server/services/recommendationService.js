/**
 * BankRetain: Retention Recommendation Engine
 * 
 * Maps observed early warning conditions to structured corporate banking interventions.
 * Human-in-the-loop: Never automatically alters client accounts or issues commitments.
 */

const db = require('../config/db');

/**
 * Generate actionable retention recommendations based on customer alerts and risk state
 * @param {string} customerId 
 */
async function generateCustomerRecommendations(customerId) {
  // 1. Fetch customer
  const [custRows] = await db.query(
    `SELECT c.id, c.company_name, c.rm_id, rm.name as rm_name
     FROM customers c
     LEFT JOIN relationship_managers rm ON c.rm_id = rm.id
     WHERE c.id = ?`,
    [customerId]
  );
  if (!custRows.length) return [];

  const customer = custRows[0];

  // 2. Fetch latest risk assessment
  const [raRows] = await db.query(
    `SELECT risk_score, risk_category
     FROM risk_assessments
     WHERE customer_id = ? AND is_latest = TRUE
     LIMIT 1`,
    [customerId]
  );
  const currentRisk = raRows[0] || { risk_score: 0, risk_category: 'Low' };

  // 3. Fetch active alerts
  const [activeAlerts] = await db.query(
    `SELECT alert_uid, alert_type, triggered_rule_code, severity, observed_value
     FROM alerts
     WHERE customer_id = ? AND status IN ('Active', 'Acknowledged', 'Under Review')`,
    [customerId]
  );

  if (!activeAlerts.length && currentRisk.risk_score < 30) {
    return []; // No action needed for healthy baseline
  }

  const alertCodes = activeAlerts.map(a => a.triggered_rule_code);
  const candidateRecs = [];

  // Rule A: Multiple warning indicators or Critical risk
  if (alertCodes.includes('WARN_09_MULTI_CHANGES') || currentRisk.risk_category === 'Critical') {
    candidateRecs.push({
      category: 'Executive Relationship Review',
      title: 'Comprehensive Corporate Relationship Review',
      priority: 'Urgent',
      description: 'Convene an executive meeting between corporate C-suite (CFO/Treasurer) and Regional Commercial Banking Director to evaluate complete banking relationship requirements and address systemic friction.',
      supportingIndicators: activeAlerts.map(a => a.alert_type),
      dueDateDays: 7,
    });
  }

  // Rule B: Transaction volume / value decline
  if (alertCodes.includes('WARN_01_TX_VOL') || alertCodes.includes('WARN_02_TX_VAL')) {
    candidateRecs.push({
      category: 'Transaction Banking',
      title: 'Transaction Activity & Payment Requirements Review',
      priority: currentRisk.risk_score >= 60 ? 'High' : 'Medium',
      description: 'Audit corporate ERP and payment gateway connectivity. Investigate whether supplier payments or customer collections were rerouted to a secondary financial institution.',
      supportingIndicators: activeAlerts.filter(a => a.triggered_rule_code.startsWith('WARN_01') || a.triggered_rule_code.startsWith('WARN_02')).map(a => a.alert_type),
      dueDateDays: 14,
    });
  }

  // Rule C: Operating balance decline
  if (alertCodes.includes('WARN_03_BAL')) {
    candidateRecs.push({
      category: 'Liquidity Management',
      title: 'Cash Management & Deposit Structure Review',
      priority: 'High',
      description: 'Engage Global Liquidity Management team to propose competitive automated sweeping, interest-bearing money market accounts, or flexible multi-currency pooling structures.',
      supportingIndicators: ['Operating Balance Outflow'],
      dueDateDays: 10,
    });
  }

  // Rule D: Complaints increasing or severe complaint
  if (alertCodes.includes('WARN_06_COMPLAINT_FREQ') || alertCodes.includes('WARN_07_COMPLAINT_SEV')) {
    candidateRecs.push({
      category: 'Service Quality & Operations',
      title: 'Client Service Escalation & Operational Resolution',
      priority: alertCodes.includes('WARN_07_COMPLAINT_SEV') ? 'Urgent' : 'High',
      description: 'Assign a dedicated senior operations specialist to resolve open tickets, perform root-cause analysis, and deliver a service satisfaction remediation letter.',
      supportingIndicators: activeAlerts.filter(a => a.triggered_rule_code.includes('COMPLAINT')).map(a => a.alert_type),
      dueDateDays: 5,
    });
  }

  // Rule E: Product utilization decline
  if (alertCodes.includes('WARN_05_PROD_UTIL')) {
    candidateRecs.push({
      category: 'Credit & Facility Management',
      title: 'Corporate Credit Facility & Product Suitability Assessment',
      priority: 'Medium',
      description: 'Evaluate working capital covenants, trade finance fee structure, and line utilization to re-align corporate banking products with the customer’s evolving commercial cycle.',
      supportingIndicators: ['Reduced Banking Product Utilization'],
      dueDateDays: 21,
    });
  }

  // Rule F: International payments decline
  if (alertCodes.includes('WARN_08_INTL_PAY')) {
    candidateRecs.push({
      category: 'FX & International Treasury',
      title: 'International Business & FX Requirements Review',
      priority: 'Medium',
      description: 'Investigate shifts in cross-border supply chains. Introduce FX structuring desk to provide tighter foreign exchange spreads and hedging advisory.',
      supportingIndicators: ['Declining International Payments'],
      dueDateDays: 14,
    });
  }

  // Persist recommendations without duplicating open recommendations
  const createdRecs = [];
  for (const rec of candidateRecs) {
    const [existing] = await db.query(
      `SELECT id, status FROM recommendations
       WHERE customer_id = ? AND title = ? AND status IN ('Pending', 'Accepted', 'In Progress')
       LIMIT 1`,
      [customerId, rec.title]
    );

    if (!existing.length) {
      const recUid = `REC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + rec.dueDateDays);

      const [res] = await db.query(
        `INSERT INTO recommendations
         (rec_uid, customer_id, recommendation_category, title, description,
          supporting_warning_indicators, priority, rm_id, created_date, due_date, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, 'Pending', NOW())`,
        [
          recUid,
          customerId,
          rec.category,
          rec.title,
          rec.description,
          JSON.stringify(rec.supportingIndicators),
          rec.priority,
          customer.rm_id,
          dueDate.toISOString().split('T')[0],
        ]
      );
      createdRecs.push({ id: res.insertId, recUid, title: rec.title, status: 'Pending' });
    }
  }

  return createdRecs;
}

module.exports = {
  generateCustomerRecommendations,
};
