const db = require('../config/db');

/**
 * Build dynamic WHERE clause based on dashboard filters
 * @param {Object} query 
 * @param {string} customerAlias 
 */
function buildDashboardFilters(query, customerAlias = 'c', riskAlias = 'ra') {
  const clauses = [`${customerAlias}.account_status != 'Archived'`];
  const params = [];

  const { industry, segment, region, rmId, riskCategory } = query;

  if (industry && industry !== 'All') {
    clauses.push(`${customerAlias}.industry = ?`);
    params.push(industry);
  }

  if (segment && segment !== 'All') {
    clauses.push(`${customerAlias}.business_segment = ?`);
    params.push(segment);
  }

  if (region && region !== 'All') {
    clauses.push(`${customerAlias}.region = ?`);
    params.push(region);
  }

  if (rmId && rmId !== 'All') {
    clauses.push(`${customerAlias}.rm_id = ?`);
    params.push(parseInt(rmId, 10));
  }

  if (riskCategory && riskCategory !== 'All') {
    clauses.push(`${riskAlias}.risk_category = ?`);
    params.push(riskCategory);
  }

  return {
    whereSql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

/**
 * Get executive dashboard KPI summary cards
 */
async function getDashboardSummary(req, res) {
  try {
    const { whereSql, params } = buildDashboardFilters(req.query, 'c', 'ra');

    // 1. Customer risk breakdown and counts
    const kpiSql = `
      SELECT 
        COUNT(c.id) AS total_customers,
        SUM(CASE WHEN ra.risk_category IN ('High', 'Critical') THEN 1 ELSE 0 END) AS high_risk_customers,
        SUM(CASE WHEN ra.risk_category = 'Medium' THEN 1 ELSE 0 END) AS medium_risk_customers,
        SUM(CASE WHEN ra.risk_category = 'Low' OR ra.risk_category IS NULL THEN 1 ELSE 0 END) AS low_risk_customers,
        SUM(c.annual_revenue) AS total_annual_revenue
      FROM customers c
      LEFT JOIN risk_assessments ra ON c.id = ra.customer_id AND ra.is_latest = TRUE
      ${whereSql}
    `;
    const [kpiRows] = await db.query(kpiSql, params);
    const kpi = kpiRows[0] || {};

    // 2. Customers with declining transaction volumes (latest month decline >= 15%)
    const txDeclineSql = `
      SELECT COUNT(DISTINCT c.id) AS count
      FROM customers c
      LEFT JOIN risk_assessments ra ON c.id = ra.customer_id AND ra.is_latest = TRUE
      INNER JOIN (
        SELECT customer_id, count_decline_pct,
               ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY period_date DESC) as rn
        FROM transaction_monthly
      ) latest_tx ON c.id = latest_tx.customer_id AND latest_tx.rn = 1
      ${whereSql} AND latest_tx.count_decline_pct >= 15
    `;
    const [txDeclineRows] = await db.query(txDeclineSql, params);
    const decliningTxCount = txDeclineRows[0]?.count || 0;

    // 3. Customers with declining operating balances (latest month decline >= 15%)
    const balDeclineSql = `
      SELECT COUNT(DISTINCT c.id) AS count
      FROM customers c
      LEFT JOIN risk_assessments ra ON c.id = ra.customer_id AND ra.is_latest = TRUE
      INNER JOIN (
        SELECT customer_id, balance_decline_pct,
               ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY period_date DESC) as rn
        FROM operating_balances
      ) latest_bal ON c.id = latest_bal.customer_id AND latest_bal.rn = 1
      ${whereSql} AND latest_bal.balance_decline_pct >= 15
    `;
    const [balDeclineRows] = await db.query(balDeclineSql, params);
    const decliningBalCount = balDeclineRows[0]?.count || 0;

    // 4. Active unresolved alerts
    const alertsSql = `
      SELECT COUNT(a.id) AS active_alerts
      FROM alerts a
      INNER JOIN customers c ON a.customer_id = c.id
      LEFT JOIN risk_assessments ra ON c.id = ra.customer_id AND ra.is_latest = TRUE
      ${whereSql} AND a.status IN ('Active', 'Acknowledged', 'Under Review')
    `;
    const [alertRows] = await db.query(alertsSql, params);
    const activeAlertsCount = alertRows[0]?.active_alerts || 0;

    // 5. Pending retention tasks
    const tasksSql = `
      SELECT COUNT(rt.id) AS pending_tasks,
             SUM(CASE WHEN rt.status = 'Overdue' OR (rt.due_date < CURDATE() AND rt.status IN ('Open', 'In Progress')) THEN 1 ELSE 0 END) AS overdue_tasks
      FROM retention_tasks rt
      INNER JOIN customers c ON rt.customer_id = c.id
      LEFT JOIN risk_assessments ra ON c.id = ra.customer_id AND ra.is_latest = TRUE
      ${whereSql} AND rt.status IN ('Open', 'In Progress', 'Overdue')
    `;
    const [taskRows] = await db.query(tasksSql, params);
    const pendingTasksCount = taskRows[0]?.pending_tasks || 0;
    const overdueTasksCount = taskRows[0]?.overdue_tasks || 0;

    // 6. Historical customer attrition rate
    const [outcomeRows] = await db.query(`
      SELECT 
        COUNT(*) AS total_outcomes,
        SUM(CASE WHEN outcome_type IN ('Full Attrition', 'Partial Attrition') THEN 1 ELSE 0 END) AS attrition_count,
        SUM(CASE WHEN outcome_type = 'Retained' THEN 1 ELSE 0 END) AS retained_count
      FROM customer_outcomes
    `);
    const totalOutcomes = outcomeRows[0]?.total_outcomes || 0;
    const attritionCount = outcomeRows[0]?.attrition_count || 0;
    const retainedCount = outcomeRows[0]?.retained_count || 0;
    const attritionRatePct = totalOutcomes > 0 
      ? Number(((attritionCount / totalOutcomes) * 100).toFixed(1)) 
      : 4.8; // Baseline banking benchmark if outcomes are empty

    // 7. Active campaigns summary
    const [campRows] = await db.query(`
      SELECT COUNT(*) AS active_campaigns FROM campaigns WHERE status = 'Active'
    `);
    const activeCampaignsCount = campRows[0]?.active_campaigns || 0;

    res.json({
      success: true,
      data: {
        totalCustomers: Number(kpi.total_customers || 0),
        highRiskCustomers: Number(kpi.high_risk_customers || 0),
        mediumRiskCustomers: Number(kpi.medium_risk_customers || 0),
        lowRiskCustomers: Number(kpi.low_risk_customers || 0),
        decliningTxCustomers: Number(decliningTxCount),
        decliningBalCustomers: Number(decliningBalCount),
        activeUnresolvedAlerts: Number(activeAlertsCount),
        pendingRetentionTasks: Number(pendingTasksCount),
        overdueRetentionTasks: Number(overdueTasksCount),
        historicalAttritionRate: attritionRatePct,
        customersRetainedCount: Number(retainedCount),
        activeCampaigns: Number(activeCampaignsCount),
        totalPortfolioRevenue: Number(kpi.total_annual_revenue || 0),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to calculate dashboard summary.', error: error.message });
  }
}

/**
 * Get data for all 7 Recharts visualizations
 */
async function getDashboardCharts(req, res) {
  try {
    const { whereSql, params } = buildDashboardFilters(req.query, 'c', 'ra');

    // Chart 1: Customer Risk Distribution (Doughnut)
    const riskDistSql = `
      SELECT 
        COALESCE(ra.risk_category, 'Low') AS name,
        COUNT(c.id) AS value
      FROM customers c
      LEFT JOIN risk_assessments ra ON c.id = ra.customer_id AND ra.is_latest = TRUE
      ${whereSql}
      GROUP BY COALESCE(ra.risk_category, 'Low')
      ORDER BY FIELD(name, 'Low', 'Medium', 'High', 'Critical')
    `;
    const [riskDist] = await db.query(riskDistSql, params);

    // Chart 2: Monthly Transaction Volume Trend (Line) - Last 12 months aggregated
    const txTrendSql = `
      SELECT 
        tm.month_year AS month,
        SUM(tm.total_count) AS totalCount,
        ROUND(SUM(tm.total_value) / 1000000, 2) AS totalValueMillion,
        ROUND(AVG(tm.count_mom_change_pct), 2) AS avgMomChangePct
      FROM transaction_monthly tm
      INNER JOIN customers c ON tm.customer_id = c.id
      LEFT JOIN risk_assessments ra ON c.id = ra.customer_id AND ra.is_latest = TRUE
      ${whereSql}
      GROUP BY tm.month_year, tm.period_date
      ORDER BY tm.period_date ASC
      LIMIT 12
    `;
    const [txTrend] = await db.query(txTrendSql, params);

    // Chart 3: Operating Balance Trends (Line) - Last 12 months aggregated
    const balTrendSql = `
      SELECT 
        ob.month_year AS month,
        ROUND(SUM(ob.closing_balance) / 1000000, 2) AS totalBalanceMillion,
        ROUND(AVG(ob.closing_balance) / 1000, 2) AS avgBalanceThousand
      FROM operating_balances ob
      INNER JOIN customers c ON ob.customer_id = c.id
      LEFT JOIN risk_assessments ra ON c.id = ra.customer_id AND ra.is_latest = TRUE
      ${whereSql}
      GROUP BY ob.month_year, ob.period_date
      ORDER BY ob.period_date ASC
      LIMIT 12
    `;
    const [balTrend] = await db.query(balTrendSql, params);

    // Chart 4: High-Risk Customers by Industry (Bar)
    const indRiskSql = `
      SELECT 
        c.industry,
        SUM(CASE WHEN ra.risk_category = 'Critical' THEN 1 ELSE 0 END) AS criticalRisk,
        SUM(CASE WHEN ra.risk_category = 'High' THEN 1 ELSE 0 END) AS highRisk,
        SUM(CASE WHEN ra.risk_category = 'Medium' THEN 1 ELSE 0 END) AS mediumRisk
      FROM customers c
      LEFT JOIN risk_assessments ra ON c.id = ra.customer_id AND ra.is_latest = TRUE
      ${whereSql}
      GROUP BY c.industry
      ORDER BY (SUM(CASE WHEN ra.risk_category IN ('Critical', 'High') THEN 1 ELSE 0 END)) DESC
      LIMIT 8
    `;
    const [industryRisk] = await db.query(indRiskSql, params);

    // Chart 5: Early Warning Indicator Distribution (Bar)
    const alertDistSql = `
      SELECT 
        a.alert_type AS indicator,
        COUNT(a.id) AS count,
        a.severity
      FROM alerts a
      INNER JOIN customers c ON a.customer_id = c.id
      LEFT JOIN risk_assessments ra ON c.id = ra.customer_id AND ra.is_latest = TRUE
      ${whereSql} AND a.status IN ('Active', 'Acknowledged', 'Under Review')
      GROUP BY a.alert_type, a.severity
      ORDER BY count DESC
      LIMIT 6
    `;
    const [alertDist] = await db.query(alertDistSql, params);

    // Chart 6: Retention Task Status (Doughnut)
    const taskStatusSql = `
      SELECT 
        rt.status AS name,
        COUNT(rt.id) AS value
      FROM retention_tasks rt
      INNER JOIN customers c ON rt.customer_id = c.id
      LEFT JOIN risk_assessments ra ON c.id = ra.customer_id AND ra.is_latest = TRUE
      ${whereSql}
      GROUP BY rt.status
      ORDER BY FIELD(rt.status, 'Open', 'In Progress', 'Completed', 'Overdue', 'Cancelled')
    `;
    const [taskStatus] = await db.query(taskStatusSql, params);

    // Chart 7: Historical Customer Attrition Trend (Line)
    const attritionTrendSql = `
      SELECT 
        DATE_FORMAT(outcome_date, '%Y-%m') AS month,
        SUM(CASE WHEN outcome_type IN ('Full Attrition', 'Partial Attrition') THEN 1 ELSE 0 END) AS attritionCount,
        SUM(CASE WHEN outcome_type = 'Retained' THEN 1 ELSE 0 END) AS retainedCount
      FROM customer_outcomes
      GROUP BY DATE_FORMAT(outcome_date, '%Y-%m')
      ORDER BY month ASC
      LIMIT 12
    `;
    const [attritionTrend] = await db.query(attritionTrendSql);

    res.json({
      success: true,
      charts: {
        riskDistribution: riskDist,
        txVolumeTrend: txTrend,
        balanceTrend: balTrend,
        industryRisk: industryRisk,
        alertDistribution: alertDist,
        taskStatusDistribution: taskStatus,
        attritionTrend: attritionTrend,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard charts.', error: error.message });
  }
}

/**
 * Get high-risk customer table for the dashboard
 */
async function getHighRiskCustomers(req, res) {
  try {
    const { whereSql, params } = buildDashboardFilters(req.query, 'c', 'ra');
    const { page = 1, limit = 10, search = '' } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const pageLimit = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * pageLimit;

    let extraSearch = '';
    const searchParams = [];
    if (search) {
      extraSearch = ` AND (c.company_name LIKE ? OR c.id LIKE ? OR c.industry LIKE ?)`;
      const s = `%${search}%`;
      searchParams.push(s, s, s);
    }

    const baseWhere = whereSql 
      ? `${whereSql} AND ra.risk_category IN ('High', 'Critical') ${extraSearch}`
      : `WHERE c.account_status != 'Archived' AND ra.risk_category IN ('High', 'Critical') ${extraSearch}`;

    const countSql = `
      SELECT COUNT(c.id) AS total
      FROM customers c
      LEFT JOIN risk_assessments ra ON c.id = ra.customer_id AND ra.is_latest = TRUE
      ${baseWhere}
    `;
    const [countRows] = await db.query(countSql, [...params, ...searchParams]);
    const totalRecords = countRows[0]?.total || 0;

    const tableSql = `
      SELECT 
        c.id AS customer_id,
        c.company_name,
        c.industry,
        c.business_segment,
        c.annual_revenue,
        c.rm_id,
        rm.name AS rm_name,
        ra.risk_score,
        ra.risk_category,
        COALESCE(latest_tx.count_decline_pct, 0) AS tx_volume_decline,
        COALESCE(latest_bal.balance_decline_pct, 0) AS balance_decline,
        (
          SELECT COUNT(*)
          FROM alerts a
          WHERE a.customer_id = c.id AND a.status IN ('Active', 'Acknowledged', 'Under Review')
        ) AS active_warning_count,
        (
          SELECT title
          FROM recommendations rec
          WHERE rec.customer_id = c.id AND rec.status IN ('Pending', 'Accepted', 'In Progress')
          ORDER BY FIELD(rec.priority, 'Urgent', 'High', 'Medium', 'Low')
          LIMIT 1
        ) AS recommended_action
      FROM customers c
      LEFT JOIN relationship_managers rm ON c.rm_id = rm.id
      INNER JOIN risk_assessments ra ON c.id = ra.customer_id AND ra.is_latest = TRUE
      LEFT JOIN (
        SELECT customer_id, count_decline_pct,
               ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY period_date DESC) as rn
        FROM transaction_monthly
      ) latest_tx ON c.id = latest_tx.customer_id AND latest_tx.rn = 1
      LEFT JOIN (
        SELECT customer_id, balance_decline_pct,
               ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY period_date DESC) as rn
        FROM operating_balances
      ) latest_bal ON c.id = latest_bal.customer_id AND latest_bal.rn = 1
      ${baseWhere}
      ORDER BY ra.risk_score DESC, c.annual_revenue DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await db.query(tableSql, [...params, ...searchParams, pageLimit, offset]);

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: pageNum,
        limit: pageLimit,
        total: totalRecords,
        totalPages: Math.ceil(totalRecords / pageLimit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch high-risk customer table.', error: error.message });
  }
}

module.exports = {
  getDashboardSummary,
  getDashboardCharts,
  getHighRiskCustomers,
};
