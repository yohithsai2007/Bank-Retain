/**
 * BankRetain: Campaign Analytics Service (Randomized Controlled Trials)
 * 
 * Implements rigorous conventional statistical A/B testing for retention campaigns.
 * Strictly intention-to-treat (ITT) methodology.
 * No machine learning or black-box predictive models.
 */

const db = require('../config/db');
const { calculateCampaignStatistics } = require('../utils/mathUtils');

/**
 * Assign eligible customers to Treatment and Control groups (50/50 randomized split)
 * @param {number} campaignId 
 */
async function assignCustomersToCampaign(campaignId) {
  // Fetch campaign details
  const [campRows] = await db.query(
    `SELECT id, campaign_code, target_segment, eligibility_rules
     FROM campaigns
     WHERE id = ?`,
    [campaignId]
  );
  if (!campRows.length) throw new Error('Campaign not found.');
  const campaign = campRows[0];

  // Find eligible customers not already assigned to this campaign
  let segmentFilter = '';
  const params = [campaignId];

  if (campaign.target_segment && campaign.target_segment !== 'All Segments') {
    segmentFilter = 'AND c.business_segment = ?';
    params.push(campaign.target_segment);
  }

  const [eligibleCustomers] = await db.query(
    `SELECT c.id, c.company_name, c.business_segment
     FROM customers c
     WHERE c.account_status = 'Active'
       ${segmentFilter}
       AND c.id NOT IN (SELECT customer_id FROM campaign_assignments WHERE campaign_id = ?)
     ORDER BY c.id ASC`,
    params.length === 2 ? [campaign.target_segment, campaignId] : [campaignId]
  );

  if (!eligibleCustomers.length) {
    return { assignedCount: 0, message: 'No unassigned eligible customers found.' };
  }

  // Shuffle reproducibly using Fisher-Yates
  const shuffled = [...eligibleCustomers];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  let treatmentCount = 0;
  let controlCount = 0;

  for (let i = 0; i < shuffled.length; i++) {
    // 50/50 alternating split
    const group = (i % 2 === 0) ? 'Treatment' : 'Control';
    if (group === 'Treatment') treatmentCount++;
    else controlCount++;

    await db.query(
      `INSERT INTO campaign_assignments
       (campaign_id, customer_id, assignment_group, intervention_delivered, created_at)
       VALUES (?, ?, ?, FALSE, NOW())`,
      [campaignId, shuffled[i].id, group]
    );
  }

  return {
    totalAssigned: shuffled.length,
    treatmentCount,
    controlCount,
  };
}

/**
 * Analyze statistical results of a retention campaign
 * @param {number} campaignId 
 */
async function analyzeCampaign(campaignId) {
  const [campRows] = await db.query(
    `SELECT id, campaign_code, name, objective, target_segment, intervention_type,
            budget, start_date, end_date, evaluation_window_days, status, is_demonstration
     FROM campaigns
     WHERE id = ?`,
    [campaignId]
  );
  if (!campRows.length) throw new Error('Campaign not found.');
  const campaign = campRows[0];

  // Aggregate results by assignment group
  const [counts] = await db.query(
    `SELECT assignment_group,
            count(*) as total_customers,
            SUM(CASE WHEN intervention_delivered = TRUE THEN 1 ELSE 0 END) as delivered_interventions,
            SUM(CASE WHEN evaluated_retained = TRUE THEN 1 ELSE 0 END) as retained_customers,
            SUM(CASE WHEN evaluated_retained = FALSE THEN 1 ELSE 0 END) as churned_customers,
            SUM(CASE WHEN evaluated_retained IS NULL THEN 1 ELSE 0 END) as pending_evaluation,
            SUM(COALESCE(customer_revenue_impact, 0)) as total_revenue_impact
     FROM campaign_assignments
     WHERE campaign_id = ?
     GROUP BY assignment_group`,
    [campaignId]
  );

  let treatStats = { total_customers: 0, retained_customers: 0, delivered_interventions: 0, total_revenue_impact: 0 };
  let ctrlStats = { total_customers: 0, retained_customers: 0, delivered_interventions: 0, total_revenue_impact: 0 };

  for (const row of counts) {
    if (row.assignment_group === 'Treatment') treatStats = row;
    else if (row.assignment_group === 'Control') ctrlStats = row;
  }

  // Calculate comprehensive statistics
  const stats = calculateCampaignStatistics(
    treatStats.retained_customers || 0,
    treatStats.total_customers || 0,
    ctrlStats.retained_customers || 0,
    ctrlStats.total_customers || 0,
    campaign.budget || 0
  );

  return {
    campaign,
    treatment: treatStats,
    control: ctrlStats,
    statistics: stats,
    evaluationSummary: {
      totalAssigned: (Number(treatStats.total_customers) || 0) + (Number(ctrlStats.total_customers) || 0),
      deliveredInterventions: treatStats.delivered_interventions || 0,
      treatmentDeliveryRate: treatStats.total_customers > 0 
        ? Number(((treatStats.delivered_interventions / treatStats.total_customers) * 100).toFixed(1)) 
        : 0,
    },
  };
}

module.exports = {
  assignCustomersToCampaign,
  analyzeCampaign,
};
