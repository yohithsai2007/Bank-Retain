const db = require('../config/db');

/**
 * Format an array of objects as a valid CSV string
 */
function objectsToCsv(rows) {
  if (!rows || !rows.length) return '';
  const headers = Object.keys(rows[0]);
  const csvLines = [headers.join(',')];

  for (const row of rows) {
    const line = headers.map(h => {
      let val = row[h];
      if (val === null || val === undefined) return '""';
      if (typeof val === 'string') {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(',');
    csvLines.push(line);
  }
  return csvLines.join('\n');
}

/**
 * High-Risk Customers Report
 */
async function getHighRiskReport(req, res) {
  try {
    const { format } = req.query;
    const [rows] = await db.query(
      `SELECT 
        c.id AS customer_id,
        c.company_name,
        c.industry,
        c.business_segment,
        c.region,
        c.annual_revenue,
        rm.name AS relationship_manager,
        ra.risk_score,
        ra.risk_category,
        ra.assessment_date,
        ra.scoring_version,
        'Rule-Based Transparent Score' AS methodology_note
       FROM customers c
       INNER JOIN risk_assessments ra ON c.id = ra.customer_id AND ra.is_latest = TRUE
       LEFT JOIN relationship_managers rm ON c.rm_id = rm.id
       WHERE ra.risk_category IN ('High', 'Critical') AND c.account_status != 'Archived'
       ORDER BY ra.risk_score DESC`
    );

    if (format === 'csv') {
      const csv = objectsToCsv(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="high_risk_customers_report.csv"');
      return res.send(csv);
    }

    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate high-risk report.', error: error.message });
  }
}

/**
 * Early Warning Alerts Report
 */
async function getAlertsReport(req, res) {
  try {
    const { format } = req.query;
    const [rows] = await db.query(
      `SELECT 
        a.alert_uid,
        a.customer_id,
        c.company_name,
        c.industry,
        a.alert_type,
        a.severity,
        a.observed_value,
        a.historical_baseline,
        a.threshold,
        a.detection_date,
        a.status,
        rm.name AS relationship_manager
       FROM alerts a
       INNER JOIN customers c ON a.customer_id = c.id
       LEFT JOIN relationship_managers rm ON a.rm_id = rm.id
       ORDER BY FIELD(a.severity, 'Critical', 'High', 'Medium', 'Low'), a.detection_date DESC`
    );

    if (format === 'csv') {
      const csv = objectsToCsv(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="early_warning_alerts_report.csv"');
      return res.send(csv);
    }

    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate alerts report.', error: error.message });
  }
}

/**
 * Campaign Performance Report
 */
async function getCampaignPerformanceReport(req, res) {
  try {
    const { format } = req.query;
    const [rows] = await db.query(
      `SELECT 
        c.campaign_code,
        c.name AS campaign_name,
        c.intervention_type,
        c.target_segment,
        c.budget,
        COUNT(ca.id) AS total_participants,
        SUM(CASE WHEN ca.assignment_group = 'Treatment' THEN 1 ELSE 0 END) AS treatment_sample,
        SUM(CASE WHEN ca.assignment_group = 'Control' THEN 1 ELSE 0 END) AS control_sample,
        SUM(CASE WHEN ca.assignment_group = 'Treatment' AND ca.evaluated_retained = TRUE THEN 1 ELSE 0 END) AS treatment_retained,
        SUM(CASE WHEN ca.assignment_group = 'Control' AND ca.evaluated_retained = TRUE THEN 1 ELSE 0 END) AS control_retained,
        'Demonstration Randomized Controlled Trial' AS experiment_type
       FROM campaigns c
       LEFT JOIN campaign_assignments ca ON c.id = ca.campaign_id
       GROUP BY c.id
       ORDER BY c.created_at DESC`
    );

    if (format === 'csv') {
      const csv = objectsToCsv(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="campaign_performance_report.csv"');
      return res.send(csv);
    }

    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate campaign report.', error: error.message });
  }
}

/**
 * Generic Report by Type
 */
async function getReportByType(req, res) {
  try {
    const { type } = req.params;
    const { format } = req.query;

    let sql = '';
    let filename = `${type}_report.csv`;

    switch (type) {
      case 'customers':
        sql = `SELECT c.id, c.company_name, c.industry, c.business_segment, c.region, c.annual_revenue, c.account_status, rm.name as rm_name FROM customers c LEFT JOIN relationship_managers rm ON c.rm_id = rm.id WHERE c.account_status != 'Archived'`;
        break;
      case 'transactions-decline':
        sql = `SELECT tm.customer_id, c.company_name, tm.month_year, tm.total_count, tm.count_decline_pct, tm.total_value, tm.value_decline_pct FROM transaction_monthly tm INNER JOIN customers c ON tm.customer_id = c.id WHERE tm.count_decline_pct >= 15 OR tm.value_decline_pct >= 20 ORDER BY tm.period_date DESC`;
        break;
      case 'balance-decline':
        sql = `SELECT ob.customer_id, c.company_name, ob.month_year, ob.closing_balance, ob.balance_decline_pct, ob.sustained_decline_months FROM operating_balances ob INNER JOIN customers c ON ob.customer_id = c.id WHERE ob.balance_decline_pct >= 15 ORDER BY ob.period_date DESC`;
        break;
      case 'recommendations':
        sql = `SELECT rec.rec_uid, rec.customer_id, c.company_name, rec.recommendation_category, rec.title, rec.priority, rec.status, rec.due_date FROM recommendations rec INNER JOIN customers c ON rec.customer_id = c.id ORDER BY rec.created_date DESC`;
        break;
      case 'tasks':
        sql = `SELECT rt.task_uid, rt.customer_id, c.company_name, rt.title, rt.priority, rt.status, rt.due_date, rt.recorded_outcome, rm.name as rm_name FROM retention_tasks rt INNER JOIN customers c ON rt.customer_id = c.id LEFT JOIN relationship_managers rm ON rt.assigned_rm_id = rm.id ORDER BY rt.due_date ASC`;
        break;
      case 'historical-attrition':
        sql = `SELECT co.customer_id, c.company_name, co.outcome_date, co.outcome_type, co.primary_reason, co.annual_revenue_impact, 'Synthetic Historical Demo' as data_classification FROM customer_outcomes co INNER JOIN customers c ON co.customer_id = c.id ORDER BY co.outcome_date DESC`;
        break;
      default:
        return res.status(400).json({ success: false, message: `Unknown report type: ${type}` });
    }

    const [rows] = await db.query(sql);

    if (format === 'csv') {
      const csv = objectsToCsv(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csv);
    }

    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch report.', error: error.message });
  }
}

module.exports = {
  getHighRiskReport,
  getAlertsReport,
  getCampaignPerformanceReport,
  getReportByType,
};
