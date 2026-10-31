const db = require('../config/db');
const { calculateAndSaveCustomerRisk, getActiveRules } = require('../services/riskScoringService');
const { evaluateCustomerAlerts } = require('../services/alertService');
const { generateCustomerRecommendations } = require('../services/recommendationService');

/**
 * List all customers with their latest rule-based risk scores
 */
async function getRiskCustomers(req, res) {
  try {
    const { category, search = '', page = 1, limit = 25 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * pageLimit;

    const whereClauses = ["c.account_status != 'Archived'"];
    const params = [];

    if (category && category !== 'All') {
      whereClauses.push('ra.risk_category = ?');
      params.push(category);
    }

    if (search) {
      whereClauses.push('(c.company_name LIKE ? OR c.id LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total
       FROM customers c
       LEFT JOIN risk_assessments ra ON c.id = ra.customer_id AND ra.is_latest = TRUE
       ${whereSql}`,
      params
    );
    const totalRecords = countRows[0]?.total || 0;

    const [rows] = await db.query(
      `SELECT 
        c.id AS customer_id,
        c.company_name,
        c.industry,
        c.business_segment,
        c.region,
        c.annual_revenue,
        c.rm_id,
        rm.name AS rm_name,
        COALESCE(ra.risk_score, 0) AS risk_score,
        COALESCE(ra.risk_category, 'Low') AS risk_category,
        COALESCE(ra.score_change_from_previous, 0) AS score_change_from_previous,
        ra.assessment_date,
        ra.scoring_version
       FROM customers c
       LEFT JOIN relationship_managers rm ON c.rm_id = rm.id
       LEFT JOIN risk_assessments ra ON c.id = ra.customer_id AND ra.is_latest = TRUE
       ${whereSql}
       ORDER BY ra.risk_score DESC, c.company_name ASC
       LIMIT ? OFFSET ?`,
      [...params, pageLimit, offset]
    );

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
    res.status(500).json({ success: false, message: 'Failed to fetch risk customers.', error: error.message });
  }
}

/**
 * Get explainable risk analysis breakdown for a customer
 */
async function getCustomerRiskAnalysis(req, res) {
  try {
    const { customerId } = req.params;

    // Get customer
    const [custRows] = await db.query(
      `SELECT c.id, c.company_name, c.industry, c.business_segment, c.rm_id, rm.name AS rm_name
       FROM customers c
       LEFT JOIN relationship_managers rm ON c.rm_id = rm.id
       WHERE c.id = ?`,
      [customerId]
    );
    if (!custRows.length) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    // Get latest risk assessment
    const [raRows] = await db.query(
      `SELECT * FROM risk_assessments WHERE customer_id = ? AND is_latest = TRUE LIMIT 1`,
      [customerId]
    );

    if (!raRows.length) {
      // Recalculate on-the-fly if missing
      await calculateAndSaveCustomerRisk(customerId);
      const [recalcRows] = await db.query(
        `SELECT * FROM risk_assessments WHERE customer_id = ? AND is_latest = TRUE LIMIT 1`,
        [customerId]
      );
      raRows.push(recalcRows[0]);
    }

    const assessment = raRows[0];

    // Get line-by-line explanation details
    const [details] = await db.query(
      `SELECT id, rule_code, indicator_name, observed_value, baseline_value, 
              threshold_applied, points_contributed, explanation, is_triggered
       FROM risk_assessment_details
       WHERE assessment_id = ?
       ORDER BY points_contributed DESC`,
      [assessment.id]
    );

    // Get risk score history
    const [history] = await db.query(
      `SELECT id, assessment_date, risk_score, risk_category, score_change_from_previous, score_change_reason, scoring_version
       FROM risk_assessments
       WHERE customer_id = ?
       ORDER BY assessment_date ASC`,
      [customerId]
    );

    res.json({
      success: true,
      data: {
        customer: custRows[0],
        assessment,
        explanationTable: details,
        scoreHistory: history,
        disclaimer: 'Risk scores are deterministic, rule-based indicators calculated from transparent business rules. A risk score of 80/100 represents 80 points out of 100 on the severity scale, NOT an 80% attrition probability. No machine learning or predictive models are used.',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch customer risk analysis.', error: error.message });
  }
}

/**
 * Trigger risk recalculation for a single customer
 */
async function recalculateCustomerRisk(req, res) {
  try {
    const { customerId } = req.params;
    const result = await calculateAndSaveCustomerRisk(customerId);
    await evaluateCustomerAlerts(customerId);
    await generateCustomerRecommendations(customerId);

    res.json({
      success: true,
      message: `Risk score recalculated successfully for customer ${customerId}.`,
      result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Recalculation failed.', error: error.message });
  }
}

/**
 * Recalculate risk for all corporate customers
 */
async function recalculateAllRisk(req, res) {
  try {
    const [customers] = await db.query(`SELECT id FROM customers WHERE account_status != 'Archived'`);
    let processed = 0;

    for (const c of customers) {
      await calculateAndSaveCustomerRisk(c.id);
      await evaluateCustomerAlerts(c.id);
      await generateCustomerRecommendations(c.id);
      processed++;
    }

    res.json({
      success: true,
      message: `Risk scores, alerts, and recommendations recalculated for ${processed} corporate customers.`,
      processedCount: processed,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Batch recalculation failed.', error: error.message });
  }
}

/**
 * Get risk history for customer
 */
async function getRiskHistory(req, res) {
  try {
    const { customerId } = req.params;
    const [history] = await db.query(
      `SELECT id, assessment_date, risk_score, risk_category, score_change_from_previous, score_change_reason, scoring_version
       FROM risk_assessments
       WHERE customer_id = ?
       ORDER BY assessment_date ASC`,
      [customerId]
    );

    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch risk history.', error: error.message });
  }
}

module.exports = {
  getRiskCustomers,
  getCustomerRiskAnalysis,
  recalculateCustomerRisk,
  recalculateAllRisk,
  getRiskHistory,
};
