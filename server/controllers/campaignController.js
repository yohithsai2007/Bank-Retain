const db = require('../config/db');
const { assignCustomersToCampaign, analyzeCampaign } = require('../services/campaignService');

/**
 * List campaigns
 */
async function getCampaigns(req, res) {
  try {
    const [campaigns] = await db.query(
      `SELECT c.*,
              COUNT(ca.id) AS total_assigned_customers,
              SUM(CASE WHEN ca.assignment_group = 'Treatment' THEN 1 ELSE 0 END) AS treatment_count,
              SUM(CASE WHEN ca.assignment_group = 'Control' THEN 1 ELSE 0 END) AS control_count,
              SUM(CASE WHEN ca.evaluated_retained = TRUE THEN 1 ELSE 0 END) AS total_retained
       FROM campaigns c
       LEFT JOIN campaign_assignments ca ON c.id = ca.campaign_id
       GROUP BY c.id
       ORDER BY c.created_at DESC`
    );

    res.json({ success: true, data: campaigns });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch campaigns.', error: error.message });
  }
}

/**
 * Create a new retention campaign
 */
async function createCampaign(req, res) {
  try {
    const {
      name,
      objective,
      targetSegment = 'All Segments',
      eligibilityRules = {},
      interventionType = 'RM Outreach',
      startDate,
      endDate,
      evaluationWindowDays = 90,
      budget = 0,
    } = req.body;

    if (!name || !objective || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Campaign name, objective, start date, and end date are required.' });
    }

    const campaignCode = `CMP-${Date.now().toString(36).toUpperCase()}`;

    const [resInsert] = await db.query(
      `INSERT INTO campaigns
       (campaign_code, name, objective, target_segment, eligibility_rules, intervention_type,
        start_date, end_date, evaluation_window_days, budget, status, is_demonstration, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', TRUE, NOW())`,
      [
        campaignCode,
        name,
        objective,
        targetSegment,
        JSON.stringify(eligibilityRules),
        interventionType,
        startDate,
        endDate,
        evaluationWindowDays,
        budget,
      ]
    );

    const campaignId = resInsert.insertId;

    // Automatically perform initial 50/50 assignment
    const assignmentResult = await assignCustomersToCampaign(campaignId);

    res.status(201).json({
      success: true,
      message: 'Retention campaign created and randomized controlled trial assigned.',
      campaignId,
      campaignCode,
      assignments: assignmentResult,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create campaign.', error: error.message });
  }
}

/**
 * Get campaign details and participants
 */
async function getCampaignById(req, res) {
  try {
    const { id } = req.params;

    const [campRows] = await db.query(`SELECT * FROM campaigns WHERE id = ?`, [id]);
    if (!campRows.length) {
      return res.status(404).json({ success: false, message: 'Campaign not found.' });
    }

    const [assignments] = await db.query(
      `SELECT ca.*, c.company_name, c.industry, c.business_segment,
              COALESCE(ra.risk_score, 0) as risk_score,
              COALESCE(ra.risk_category, 'Low') as risk_category
       FROM campaign_assignments ca
       INNER JOIN customers c ON ca.customer_id = c.id
       LEFT JOIN risk_assessments ra ON c.id = ra.customer_id AND ra.is_latest = TRUE
       WHERE ca.campaign_id = ?
       ORDER BY ca.assignment_group DESC, c.company_name ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        campaign: campRows[0],
        assignments,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch campaign details.', error: error.message });
  }
}

/**
 * Trigger RCT Assignment for a campaign
 */
async function assignCampaign(req, res) {
  try {
    const { id } = req.params;
    const result = await assignCustomersToCampaign(parseInt(id, 10));
    res.json({ success: true, message: 'Customers assigned to RCT groups.', result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to assign customers.', error: error.message });
  }
}

/**
 * Record intervention delivery or retention outcome for a campaign assignment
 */
async function recordOutcome(req, res) {
  try {
    const { id } = req.params; // campaignId
    const { customerId, interventionDelivered, evaluatedRetained, notes, revenueImpact } = req.body;

    await db.query(
      `UPDATE campaign_assignments
       SET intervention_delivered = COALESCE(?, intervention_delivered),
           intervention_date = CASE WHEN ? = TRUE THEN COALESCE(intervention_date, CURDATE()) ELSE intervention_date END,
           evaluated_retained = COALESCE(?, evaluated_retained),
           evaluation_date = CASE WHEN ? IS NOT NULL THEN CURDATE() ELSE evaluation_date END,
           customer_revenue_impact = COALESCE(?, customer_revenue_impact),
           notes = COALESCE(?, notes)
       WHERE campaign_id = ? AND customer_id = ?`,
      [
        interventionDelivered,
        interventionDelivered,
        evaluatedRetained,
        evaluatedRetained,
        revenueImpact,
        notes,
        id,
        customerId,
      ]
    );

    res.json({ success: true, message: 'Campaign assignment outcome updated.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to record campaign outcome.', error: error.message });
  }
}

/**
 * Get statistical A/B analysis of the campaign
 */
async function getCampaignAnalysis(req, res) {
  try {
    const { id } = req.params;
    const analysis = await analyzeCampaign(parseInt(id, 10));
    res.json({ success: true, data: analysis });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to analyze campaign.', error: error.message });
  }
}

module.exports = {
  getCampaigns,
  createCampaign,
  getCampaignById,
  assignCampaign,
  recordOutcome,
  getCampaignAnalysis,
};
