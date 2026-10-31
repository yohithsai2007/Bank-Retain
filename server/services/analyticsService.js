/**
 * BankRetain: Relationship Analytics Service
 * 
 * Computes deterministic month-over-month percentage changes, moving averages (SMA-3, SMA-6),
 * sustained decline durations, and multi-product utilization baselines.
 * No machine learning or trained black-box models.
 */

const db = require('../config/db');
const {
  calculatePercentageChange,
  calculateDeclinePercentage,
  calculateSMA,
  calculateSMADeviation,
} = require('../utils/mathUtils');

/**
 * Get monthly transaction analytics for a customer with MoM percentage change and decline metrics
 * @param {string} customerId 
 */
async function getCustomerTransactionAnalytics(customerId) {
  const [rows] = await db.query(
    `SELECT id, customer_id, month_year, period_date, total_count, total_value,
            inbound_count, inbound_value, outbound_count, outbound_value,
            domestic_count, domestic_value, international_count, international_value,
            count_mom_change_pct, value_mom_change_pct, count_decline_pct, value_decline_pct
     FROM transaction_monthly
     WHERE customer_id = ?
     ORDER BY period_date ASC`,
    [customerId]
  );

  // Compute enriched analytical metrics including rolling 3-month and 6-month SMAs
  const countHistory = [];
  const valueHistory = [];

  const enriched = rows.map((row, index) => {
    countHistory.push(row.total_count);
    valueHistory.push(Number(row.total_value));

    const sma3Count = calculateSMA(countHistory, 3);
    const sma6Count = calculateSMA(countHistory, 6);
    const sma3Value = calculateSMA(valueHistory, 3);
    const sma3CountDev = calculateSMADeviation(row.total_count, sma3Count);

    // Classify decline severity per Section 6 thresholds:
    // < 10%: No significant decline
    // 10% - 25%: Moderate decline
    // > 25%: High decline
    let countDeclineCategory = 'Normal / Growth';
    const cDecline = row.count_decline_pct;
    if (cDecline !== null && cDecline !== undefined) {
      if (cDecline > 25) countDeclineCategory = 'High Decline';
      else if (cDecline >= 10) countDeclineCategory = 'Moderate Decline';
    }

    let valueDeclineCategory = 'Normal / Growth';
    const vDecline = row.value_decline_pct;
    if (vDecline !== null && vDecline !== undefined) {
      if (vDecline > 25) valueDeclineCategory = 'High Decline';
      else if (vDecline >= 10) valueDeclineCategory = 'Moderate Decline';
    }

    return {
      ...row,
      sma3Count,
      sma6Count,
      sma3Value,
      sma3CountDeviationPct: sma3CountDev,
      countDeclineCategory,
      valueDeclineCategory,
    };
  });

  return enriched;
}

/**
 * Get operating balance analytics for a customer with 3-month and 6-month moving averages
 * @param {string} customerId 
 */
async function getCustomerBalanceAnalytics(customerId) {
  const [rows] = await db.query(
    `SELECT id, customer_id, month_year, period_date, closing_balance, average_balance,
            min_balance, max_balance, previous_balance, balance_change_pct, balance_decline_pct,
            sma_3_month, sma_6_month, sma_3_deviation_pct, sustained_decline_months
     FROM operating_balances
     WHERE customer_id = ?
     ORDER BY period_date ASC`,
    [customerId]
  );

  const balanceHistory = [];

  const enriched = rows.map((row) => {
    balanceHistory.push(Number(row.closing_balance));
    const sma3 = calculateSMA(balanceHistory, 3);
    const sma6 = calculateSMA(balanceHistory, 6);
    const deviation = calculateSMADeviation(Number(row.closing_balance), sma3);

    // Balance decline thresholds per Section 6:
    // < 10%: No significant decline
    // 10% - 20%: Moderate decline
    // > 20%: High decline
    let declineCategory = 'Normal / Growth';
    const bDecline = row.balance_decline_pct;
    if (bDecline !== null && bDecline !== undefined) {
      if (bDecline > 20) declineCategory = 'High Decline';
      else if (bDecline >= 10) declineCategory = 'Moderate Decline';
    }

    return {
      ...row,
      sma_3_month: sma3,
      sma_6_month: sma6,
      sma_3_deviation_pct: deviation,
      declineCategory,
    };
  });

  return enriched;
}

/**
 * Get banking products utilization for a customer
 * @param {string} customerId 
 */
async function getCustomerProductsAnalytics(customerId) {
  const [products] = await db.query(
    `SELECT id, product_code, product_name, product_category, utilization_pct,
            credit_limit, outstanding_balance, status, last_activity_date, opened_date, notes
     FROM customer_products
     WHERE customer_id = ?
     ORDER BY product_category ASC, product_name ASC`,
    [customerId]
  );

  // Compute portfolio metrics
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.status === 'Active').length;
  const decliningProducts = products.filter(p => p.status === 'Declining').length;
  const avgUtilization = totalProducts > 0
    ? Number((products.reduce((acc, p) => acc + Number(p.utilization_pct || 0), 0) / totalProducts).toFixed(1))
    : 0;

  return {
    products,
    summary: {
      totalProducts,
      activeProducts,
      decliningProducts,
      averageUtilizationPct: avgUtilization,
    },
  };
}

/**
 * Get complaints history and operational resolution metrics for a customer
 * @param {string} customerId 
 */
async function getCustomerComplaintsAnalytics(customerId) {
  const [complaints] = await db.query(
    `SELECT sc.id, sc.complaint_ticket, sc.category, sc.severity, sc.status,
            sc.reported_date, sc.resolution_date, sc.resolution_time_hours,
            sc.summary, sc.details, sc.root_cause, sc.rm_id, rm.name as rm_name
     FROM service_complaints sc
     LEFT JOIN relationship_managers rm ON sc.rm_id = rm.id
     WHERE sc.customer_id = ?
     ORDER BY sc.reported_date DESC`,
    [customerId]
  );

  const openCount = complaints.filter(c => ['Open', 'Under Investigation', 'Escalated'].includes(c.status)).length;
  const criticalCount = complaints.filter(c => c.severity === 'Critical' && c.status !== 'Resolved').length;
  const resolvedCount = complaints.filter(c => c.status === 'Resolved' || c.status === 'Closed').length;

  const resolutionTimes = complaints.filter(c => c.resolution_time_hours !== null).map(c => c.resolution_time_hours);
  const avgResolutionHours = resolutionTimes.length > 0
    ? Number((resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length).toFixed(1))
    : null;

  return {
    complaints,
    metrics: {
      totalComplaints: complaints.length,
      openComplaints: openCount,
      criticalUnresolvedComplaints: criticalCount,
      resolvedComplaints: resolvedCount,
      averageResolutionHours: avgResolutionHours,
    },
  };
}

module.exports = {
  getCustomerTransactionAnalytics,
  getCustomerBalanceAnalytics,
  getCustomerProductsAnalytics,
  getCustomerComplaintsAnalytics,
};
