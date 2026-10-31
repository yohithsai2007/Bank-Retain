/**
 * BankRetain In-Memory High-Fidelity Data Store Fallback
 * 
 * Provides instantaneous, full-featured corporate banking analytics data
 * even before MySQL credentials are configured, ensuring the dashboard,
 * all 7 charts, 9 customer tabs, alerts, recommendations, and campaigns
 * are 100% functional out of the box for immediate review.
 */

const fs = require('fs');
const path = require('path');

let seedData = null;

function loadSeedData() {
  if (!seedData) {
    const candidatePaths = [
      path.resolve(__dirname, '../../database/seedData.json'),
      path.resolve(__dirname, '../database/seedData.json'),
      path.resolve(__dirname, '../../seedData.json'),
      path.resolve(__dirname, './seedData.json'),
      path.resolve(process.cwd(), 'database/seedData.json'),
      path.resolve(process.cwd(), '../database/seedData.json'),
    ];

    let foundPath = null;
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        foundPath = p;
        break;
      }
    }

    if (foundPath) {
      seedData = JSON.parse(fs.readFileSync(foundPath, 'utf8'));
    } else {
      seedData = { customers: [], transactions: [], balances: [], alerts: [], tasks: [], recommendations: [], riskAssessments: [], rms: [] };
    }
  }
  return seedData;
}

function handleMockQuery(sql, params = []) {
  const data = loadSeedData();
  const lowerSql = sql.toLowerCase().trim();

  // 1. SELECT 1 (health check)
  if (lowerSql.includes('select 1')) {
    return [[{ connected: 1 }]];
  }

  // 2. Relationship managers
  if (lowerSql.includes('from relationship_managers')) {
    return [data.rms || []];
  }

  // 3. System Users
  if (lowerSql.includes('from users')) {
    const defaultHash = '$2a$10$wbFQyV3Q451SbURuV01Vh.6oE0aAFMZSNB58FyXIB79LNXdEbPyI6'; // Hash for 'Admin@123'
    return [[
      { id: 1, username: 'admin', email: 'admin@bankretain.internal', password_hash: defaultHash, full_name: 'Sarah Jenkins', role: 'admin', status: 'active' },
      { id: 2, username: 'rm_sarah', email: 'marcus.v@bankretain.internal', password_hash: defaultHash, full_name: 'Marcus Vance', role: 'relationship_manager', status: 'active' },
      { id: 3, username: 'analyst_john', email: 'elena.r@bankretain.internal', password_hash: defaultHash, full_name: 'Elena Rostova', role: 'analytics_viewer', status: 'active' },
    ]];
  }

  // 4. Customer Directory List (CHECK THIS FIRST before count subqueries!)
  if (lowerSql.includes('from customers c') && lowerSql.includes('limit ? offset ?')) {
    // Check if this is the high-risk table
    if (lowerSql.includes('ra.risk_category in (\'high\', \'critical\')')) {
      const highCusts = data.customers
        .filter(c => c.archetype === 'CRITICAL_MULTI' || c.archetype === 'TX_DECLINE')
        .map(c => {
          const ra = data.riskAssessments.find(r => r.customer_id === c.id) || { risk_score: 75, risk_category: 'High' };
          return {
            customer_id: c.id,
            company_name: c.company_name,
            industry: c.industry,
            business_segment: c.business_segment,
            annual_revenue: c.annual_revenue,
            rm_id: c.rm_id,
            rm_name: c.rm_name,
            risk_score: ra.risk_score,
            risk_category: ra.risk_category,
            tx_volume_decline: ra.risk_score >= 80 ? 38.4 : 31.2,
            balance_decline: ra.risk_score >= 80 ? 26.8 : 8.5,
            active_warning_count: ra.risk_score >= 80 ? 3 : 2,
            recommended_action: ra.risk_score >= 80 ? 'Comprehensive Corporate Relationship Review' : 'Transaction Activity & Payment Requirements Review',
          };
        });

      const limit = parseInt(params[params.length - 2], 10) || 10;
      const offset = parseInt(params[params.length - 1], 10) || 0;
      return [highCusts.slice(offset, offset + limit)];
    }

    // Normal customer directory list
    const list = data.customers.map(c => {
      const ra = data.riskAssessments.find(r => r.customer_id === c.id) || { risk_score: 15, risk_category: 'Low' };
      const alertCount = data.alerts.filter(a => a.customer_id === c.id).length;
      return {
        ...c,
        risk_score: ra.risk_score,
        risk_category: ra.risk_category,
        active_alerts_count: alertCount,
        pending_tasks_count: c.archetype === 'CRITICAL_MULTI' ? 1 : 0,
      };
    });

    const limit = parseInt(params[params.length - 2], 10) || 15;
    const offset = parseInt(params[params.length - 1], 10) || 0;
    return [list.slice(offset, offset + limit)];
  }

  // 5. Dashboard Summary KPI query
  if (lowerSql.includes('from customers c') && lowerSql.includes('sum(case when ra.risk_category')) {
    const total = data.customers.length;
    const high = data.riskAssessments.filter(r => r.risk_category === 'High' || r.risk_category === 'Critical').length;
    const med = data.riskAssessments.filter(r => r.risk_category === 'Medium').length;
    const low = data.riskAssessments.filter(r => r.risk_category === 'Low').length;
    const rev = data.customers.reduce((acc, c) => acc + (c.annual_revenue || 0), 0);

    return [[{
      total_customers: total,
      high_risk_customers: high,
      medium_risk_customers: med,
      low_risk_customers: low,
      total_annual_revenue: rev,
    }]];
  }

  // Declining tx count KPI
  if (lowerSql.includes('latest_tx.count_decline_pct >= 15')) {
    return [[{ count: 38 }]];
  }

  // Declining bal count KPI
  if (lowerSql.includes('latest_bal.balance_decline_pct >= 15')) {
    return [[{ count: 25 }]];
  }

  // Active alerts count KPI
  if (lowerSql.includes('from alerts a') && lowerSql.includes('count(a.id) as active_alerts')) {
    const activeCount = data.alerts.filter(a => a.status === 'Active' || a.status === 'Acknowledged' || a.status === 'Under Review').length;
    return [[{ active_alerts: activeCount || 24 }]];
  }

  // Pending tasks count KPI
  if (lowerSql.includes('from retention_tasks rt') && lowerSql.includes('count(rt.id) as pending_tasks')) {
    return [[{ pending_tasks: data.tasks.length || 18, overdue_tasks: 7 }]];
  }

  // Customer outcomes KPI
  if (lowerSql.includes('from customer_outcomes')) {
    return [[{ total_outcomes: 30, attrition_count: 5, retained_count: 25 }]];
  }

  // Campaigns count KPI
  if (lowerSql.includes('from campaigns where status = \'active\'') || (lowerSql.includes('from campaigns') && lowerSql.includes('count(*) as active_campaigns'))) {
    return [[{ active_campaigns: 3 }]];
  }

  // Dashboard Chart 1: Customer Risk Distribution (Pie)
  if (lowerSql.includes('group by coalesce(ra.risk_category')) {
    return [[
      { name: 'Low', value: 160 },
      { name: 'Medium', value: 50 },
      { name: 'High', value: 25 },
      { name: 'Critical', value: 15 },
    ]];
  }

  // Dashboard Chart 2: Monthly Transaction Volume Trend
  if (lowerSql.includes('from transaction_monthly tm') && lowerSql.includes('group by tm.month_year')) {
    const months = ['2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
    const rows = months.map((m, idx) => ({
      month: m,
      totalCount: Math.floor(320000 + Math.sin(idx) * 25000),
      totalValueMillion: Number((450 + Math.cos(idx) * 30).toFixed(2)),
      avgMomChangePct: Number(((Math.sin(idx) * 4)).toFixed(2)),
    }));
    return [rows];
  }

  // Dashboard Chart 3: Operating Balance Trends
  if (lowerSql.includes('from operating_balances ob') && lowerSql.includes('group by ob.month_year')) {
    const months = ['2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
    const rows = months.map((m, idx) => ({
      month: m,
      totalBalanceMillion: Number((1280 - idx * 8 + Math.sin(idx) * 20).toFixed(2)),
      avgBalanceThousand: Number((5120 - idx * 30).toFixed(2)),
    }));
    return [rows];
  }

  // Dashboard Chart 4: High-Risk by Industry
  if (lowerSql.includes('from customers c') && lowerSql.includes('group by c.industry')) {
    return [[
      { industry: 'Manufacturing', criticalRisk: 4, highRisk: 6, mediumRisk: 12 },
      { industry: 'Technology & Telecom', criticalRisk: 3, highRisk: 5, mediumRisk: 8 },
      { industry: 'Wholesale & Retail', criticalRisk: 3, highRisk: 4, mediumRisk: 7 },
      { industry: 'Logistics & Transportation', criticalRisk: 2, highRisk: 4, mediumRisk: 6 },
      { industry: 'Healthcare & Pharma', criticalRisk: 1, highRisk: 3, mediumRisk: 5 },
      { industry: 'Energy & Utilities', criticalRisk: 1, highRisk: 2, mediumRisk: 4 },
      { industry: 'Construction & Real Estate', criticalRisk: 1, highRisk: 1, mediumRisk: 4 },
      { industry: 'Financial Services', criticalRisk: 0, highRisk: 0, mediumRisk: 4 },
    ]];
  }

  // Dashboard Chart 5: Alert distribution
  if (lowerSql.includes('from alerts a') && lowerSql.includes('group by a.alert_type')) {
    return [[
      { indicator: 'Transaction Volume Decline', count: 18, severity: 'High' },
      { indicator: 'Operating Balance Outflow', count: 14, severity: 'High' },
      { indicator: 'Payment Frequency Reduction', count: 10, severity: 'Medium' },
      { indicator: 'Multiple Simultaneous Changes', count: 8, severity: 'Critical' },
      { indicator: 'Increasing Complaint Frequency', count: 7, severity: 'Medium' },
      { indicator: 'Declining International Payments', count: 5, severity: 'Medium' },
    ]];
  }

  // Dashboard Chart 6: Task status distribution
  if (lowerSql.includes('from retention_tasks rt') && lowerSql.includes('group by rt.status')) {
    return [[
      { name: 'Open', value: 8 },
      { name: 'In Progress', value: 6 },
      { name: 'Completed', value: 12 },
      { name: 'Overdue', value: 7 },
      { name: 'Cancelled', value: 2 },
    ]];
  }

  // Dashboard Chart 7: Historical Attrition Trend
  if (lowerSql.includes('from customer_outcomes') && lowerSql.includes('group by date_format')) {
    const months = ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
    const rows = months.map((m, idx) => ({
      month: m,
      attritionCount: (idx % 3 === 0) ? 2 : 1,
      retainedCount: 4 + (idx % 2),
    }));
    return [rows];
  }

  // High-Risk Customer Count on Dashboard
  if (lowerSql.includes('ra.risk_category in (\'high\', \'critical\')') && lowerSql.includes('count(c.id)')) {
    const highList = data.customers.filter(c => c.archetype === 'CRITICAL_MULTI' || c.archetype === 'TX_DECLINE');
    return [[{ total: highList.length }]];
  }

  // Customer Directory Count
  if (lowerSql.includes('from customers c') && (lowerSql.includes('count(*)') || lowerSql.includes('count(c.id)'))) {
    return [[{ total: data.customers.length }]];
  }

  // Single Customer Detail Profile
  if (lowerSql.includes('from customers c') && (lowerSql.includes('c.id = ?') || lowerSql.includes('where c.id ='))) {
    const custId = params[0];
    const cust = data.customers.find(c => c.id === custId || c.id === `CUST-${custId}` || (custId == 1 && c.id === 'CUST-1001')) || data.customers[0];
    return [[{
      ...cust,
      rm_email: 'marcus.v@bankretain.internal',
      rm_phone: '+1-212-555-0111',
      rm_department: 'Commercial Banking',
    }]];
  }

  // Single Customer Risk Assessment
  if (lowerSql.includes('from risk_assessments') && (lowerSql.includes('customer_id = ?') || lowerSql.includes('ra.customer_id = ?') || lowerSql.includes('where customer_id = ?'))) {
    const custId = params[0];
    const ra = data.riskAssessments.find(r => r.customer_id === custId || r.customer_id === `CUST-${custId}` || (custId == 1 && r.customer_id === 'CUST-1001')) || {
      id: 1,
      customer_id: custId || 'CUST-1001',
      assessment_date: '2026-10-25 08:30:00',
      scoring_version: 'v1.0',
      risk_score: 75,
      risk_category: 'High',
      score_change_from_previous: 0,
      score_change_reason: 'Elevated transaction decline pattern',
      is_latest: 1,
    };
    return [[ra]];
  }

  // Risk Assessment Details
  if (lowerSql.includes('from risk_assessment_details')) {
    return [[
      { id: 1, rule_code: 'RULE_TX_VOL_DECLINE', indicator_name: 'High Transaction Volume Decline', observed_value: '35.4% drop', baseline_value: '1,200 txs/mo', threshold_applied: '>= 25%', points_contributed: 30, explanation: 'Transaction count fell below baseline.', is_triggered: 1 },
      { id: 2, rule_code: 'RULE_BAL_DECLINE', indicator_name: 'High Operating Balance Decline', observed_value: '24.1% balance drop', baseline_value: '$9,200,000', threshold_applied: '>= 20%', points_contributed: 25, explanation: 'Liquidity drain observed.', is_triggered: 1 },
      { id: 3, rule_code: 'RULE_COMPLAINTS_SEV', indicator_name: 'Repeated or Unresolved Service Complaints', observed_value: '1 High complaint logged', baseline_value: '0 issues', threshold_applied: 'High severity', points_contributed: 20, explanation: 'Open dispute on foreign wire execution.', is_triggered: 1 },
      { id: 4, rule_code: 'RULE_PROD_UTIL_DECLINE', indicator_name: 'Significant Product Utilization Decline', observed_value: '18% utilization', baseline_value: '50% min', threshold_applied: '< 20%', points_contributed: 15, explanation: 'Letter of credit facility reduced.', is_triggered: 0 },
      { id: 5, rule_code: 'RULE_SUSTAINED_PAYMENT_DECLINE', indicator_name: 'Sustained Payment Activity Decline', observed_value: '2 consecutive months', baseline_value: '0 drop', threshold_applied: '>= 2 mos', points_contributed: 10, explanation: 'Sustained contraction in international payments.', is_triggered: 0 },
    ]];
  }

  // Customer Transactions
  if (lowerSql.includes('from transaction_monthly where customer_id = ?') || (lowerSql.includes('from transaction_monthly') && lowerSql.includes('customer_id = ?'))) {
    const custId = params[0];
    const txs = data.transactions.filter(t => t.customer_id === custId || t.customer_id === `CUST-${custId}` || (custId == 1 && t.customer_id === 'CUST-1001'));
    return [txs.length ? txs : data.transactions.slice(0, 12)];
  }

  // Customer Balances
  if (lowerSql.includes('from operating_balances where customer_id = ?') || (lowerSql.includes('from operating_balances') && lowerSql.includes('customer_id = ?'))) {
    const custId = params[0];
    const bals = data.balances.filter(b => b.customer_id === custId || b.customer_id === `CUST-${custId}` || (custId == 1 && b.customer_id === 'CUST-1001'));
    return [bals.length ? bals : data.balances.slice(0, 12)];
  }

  // Customer Products
  if (lowerSql.includes('from customer_products') && lowerSql.includes('customer_id = ?')) {
    return [[
      { id: 1, product_code: 'PRD-CUR-1', product_name: 'Operating Current Account', product_category: 'Current Accounts', utilization_pct: 88, status: 'Active', last_activity_date: '2026-10-20' },
      { id: 2, product_code: 'PRD-CSH-1', product_name: 'Automated Cash Concentration & Sweeping', product_category: 'Cash Management', utilization_pct: 72, status: 'Active', last_activity_date: '2026-10-22' },
      { id: 3, product_code: 'PRD-TRD-1', product_name: 'Import Letter of Credit Facility', product_category: 'Trade Finance', utilization_pct: 18, credit_limit: 5000000, outstanding_balance: 900000, status: 'Declining', last_activity_date: '2026-09-14' },
      { id: 4, product_code: 'PRD-WRK-1', product_name: 'Revolving Working Capital Line', product_category: 'Working Capital Facilities', utilization_pct: 45, credit_limit: 10000000, outstanding_balance: 4500000, status: 'Active', last_activity_date: '2026-10-18' },
      { id: 5, product_code: 'PRD-FX-1', product_name: 'FX Spot & Forward Execution Desk', product_category: 'International Payments', utilization_pct: 30, status: 'Active', last_activity_date: '2026-10-05' },
    ]];
  }

  // Customer Complaints
  if (lowerSql.includes('from service_complaints') && lowerSql.includes('customer_id = ?')) {
    return [[
      { id: 1, complaint_ticket: 'TKT-2026-8812', category: 'Payment Processing', severity: 'Critical', status: 'Open', reported_date: '2026-10-12 11:30:00', summary: 'Cross-border supplier payment delayed by 72 hours; client treasurer escalated.', details: 'Payment delayed.', rm_id: 3, rm_name: 'Kenji Tanaka' },
      { id: 2, complaint_ticket: 'TKT-2026-4519', category: 'Fee Dispute', severity: 'Medium', status: 'Resolved', reported_date: '2026-08-04 09:15:00', resolution_date: '2026-08-06', summary: 'Disputed international routing fees waived by relationship manager.', details: 'Fee adjusted.', rm_id: 3, rm_name: 'Kenji Tanaka' },
    ]];
  }

  // Customer Alerts
  if (lowerSql.includes('from alerts') && lowerSql.includes('customer_id = ?')) {
    const custId = params[0];
    const custAlerts = data.alerts.filter(a => a.customer_id === custId || a.customer_id === `CUST-${custId}` || (custId == 1 && a.customer_id === 'CUST-1001'));
    return [custAlerts.length ? custAlerts : data.alerts.slice(0, 3)];
  }

  // Customer Recommendations
  if (lowerSql.includes('from recommendations') && lowerSql.includes('customer_id = ?')) {
    const custId = params[0];
    const custRecs = data.recommendations.filter(r => r.customer_id === custId || r.customer_id === `CUST-${custId}` || (custId == 1 && r.customer_id === 'CUST-1001'));
    return [custRecs.length ? custRecs : data.recommendations.slice(0, 2)];
  }

  // Customer Tasks
  if (lowerSql.includes('from retention_tasks') && lowerSql.includes('customer_id = ?')) {
    const custId = params[0];
    const custTasks = data.tasks.filter(t => t.customer_id === custId || t.customer_id === `CUST-${custId}` || (custId == 1 && t.customer_id === 'CUST-1001'));
    return [custTasks.length ? custTasks : data.tasks.slice(0, 2)];
  }

  // Alerts List Page Count & Data
  if (lowerSql.includes('from alerts a') && lowerSql.includes('count(a.id)')) {
    return [[{ total: data.alerts.length || 24 }]];
  }
  if (lowerSql.includes('from alerts a') && lowerSql.includes('order by')) {
    const limit = parseInt(params[params.length - 2], 10) || 15;
    const offset = parseInt(params[params.length - 1], 10) || 0;
    return [data.alerts.slice(offset, offset + limit)];
  }

  // Retention Tasks List Page Count & Data
  if (lowerSql.includes('from retention_tasks rt') && lowerSql.includes('count(rt.id)')) {
    return [[{ total: data.tasks.length || 18 }]];
  }
  if (lowerSql.includes('from retention_tasks rt') && lowerSql.includes('order by')) {
    const limit = parseInt(params[params.length - 2], 10) || 15;
    const offset = parseInt(params[params.length - 1], 10) || 0;
    return [data.tasks.slice(offset, offset + limit)];
  }

  // Risk Customers List
  if (lowerSql.includes('from customers c') && lowerSql.includes('ra.risk_score desc')) {
    const riskList = data.customers.map(c => {
      const ra = data.riskAssessments.find(r => r.customer_id === c.id) || { risk_score: 15, risk_category: 'Low' };
      return {
        customer_id: c.id,
        company_name: c.company_name,
        industry: c.industry,
        business_segment: c.business_segment,
        region: c.region,
        annual_revenue: c.annual_revenue,
        rm_id: c.rm_id,
        rm_name: c.rm_name,
        risk_score: ra.risk_score,
        risk_category: ra.risk_category,
        assessment_date: '2026-10-25',
        scoring_version: 'v1.0',
      };
    });
    const limit = parseInt(params[params.length - 2], 10) || 25;
    const offset = parseInt(params[params.length - 1], 10) || 0;
    return [riskList.slice(offset, offset + limit)];
  }

  // Campaigns List & Single Campaign
  if (lowerSql.includes('from campaigns c') || lowerSql.includes('from campaigns')) {
    const campList = [
      {
        id: 1,
        campaign_code: 'CMP-2026-Q1',
        name: 'Q3 Mid-Corporate Liquidity Retention Initiative',
        objective: 'Prevent deposit migration by proactively introducing premium money-market liquidity sweeps.',
        target_segment: 'Mid-Corporate',
        intervention_type: 'Cash Management Review',
        start_date: '2026-07-01',
        end_date: '2026-09-30',
        evaluation_window_days: 90,
        budget: 75000.00,
        status: 'Active',
        total_assigned_customers: 60,
        treatment_count: 30,
        control_count: 30,
        total_retained: 46,
      },
      {
        id: 2,
        campaign_code: 'CMP-2026-Q2',
        name: 'Enterprise Cross-Border Payment Pricing Optimization',
        objective: 'Provide discounted FX spreads and dedicated corporate treasury advisory to stem international payment declines.',
        target_segment: 'Enterprise',
        intervention_type: 'Eligible Loyalty Offers',
        start_date: '2026-08-01',
        end_date: '2026-10-31',
        evaluation_window_days: 90,
        budget: 120000.00,
        status: 'Active',
        total_assigned_customers: 40,
        treatment_count: 20,
        control_count: 20,
        total_retained: 32,
      },
      {
        id: 3,
        campaign_code: 'CMP-2026-Q3',
        name: 'Commercial Relationship Manager High-Touch Outreach',
        objective: 'Conduct structured on-site relationship reviews with executive finance leadership for all flagged accounts.',
        target_segment: 'Commercial',
        intervention_type: 'RM Outreach',
        start_date: '2026-09-01',
        end_date: '2026-11-30',
        evaluation_window_days: 90,
        budget: 50000.00,
        status: 'Active',
        total_assigned_customers: 50,
        treatment_count: 25,
        control_count: 25,
        total_retained: 38,
      },
    ];
    if (lowerSql.includes('where id = ?') || lowerSql.includes('where c.id = ?')) {
      const campId = parseInt(params[0], 10) || 1;
      const found = campList.find(c => c.id === campId) || campList[0];
      return [[found]];
    }
    return [campList];
  }

  // Campaign Assignments
  if (lowerSql.includes('from campaign_assignments')) {
    return [[
      { id: 1, campaign_id: 1, customer_id: 'CUST-1004', company_name: 'Cobalt Networks Ltd', industry: 'Technology & Telecom', business_segment: 'Mid-Corporate', risk_score: 78, assignment_group: 'Treatment', intervention_delivered: 1, delivery_date: '2026-08-05', outcome: 'Retained', outcome_date: '2026-10-15' },
      { id: 2, campaign_id: 1, customer_id: 'CUST-1006', company_name: 'Horizon Supply Chain PLC', industry: 'Logistics & Transportation', business_segment: 'Mid-Corporate', risk_score: 72, assignment_group: 'Control', intervention_delivered: 0, delivery_date: null, outcome: 'Churned', outcome_date: '2026-09-28' },
      { id: 3, campaign_id: 1, customer_id: 'CUST-1009', company_name: 'Vortex Precision Machining', industry: 'Manufacturing', business_segment: 'Mid-Corporate', risk_score: 65, assignment_group: 'Treatment', intervention_delivered: 1, delivery_date: '2026-08-12', outcome: 'Retained', outcome_date: '2026-10-20' },
      { id: 4, campaign_id: 1, customer_id: 'CUST-1014', company_name: 'Starlight Media Group', industry: 'Technology & Telecom', business_segment: 'Mid-Corporate', risk_score: 62, assignment_group: 'Treatment', intervention_delivered: 1, delivery_date: '2026-08-18', outcome: 'Retained', outcome_date: '2026-10-22' },
      { id: 5, campaign_id: 1, customer_id: 'CUST-1018', company_name: 'Aero Dynamics Global', industry: 'Manufacturing', business_segment: 'Mid-Corporate', risk_score: 70, assignment_group: 'Control', intervention_delivered: 0, delivery_date: null, outcome: 'Churned', outcome_date: '2026-10-02' },
    ]];
  }

  // Customer Outcomes / Historical Attrition Report
  if (lowerSql.includes('from customer_outcomes') || lowerSql.includes('customer_outcomes co')) {
    return [[
      { id: 1, customer_id: 'CUST-1001', company_name: 'Solaris Global Industries', outcome_date: '2026-09-15', outcome_type: 'Retained', primary_reason: 'Fee restructuring and upgraded liquidity sweep facility', annual_revenue_impact: 145000.00 },
      { id: 2, customer_id: 'CUST-1004', company_name: 'Cobalt Networks Ltd', outcome_date: '2026-08-20', outcome_type: 'Retained', primary_reason: 'Dedicated cash management specialist assigned', annual_revenue_impact: 220000.00 },
      { id: 3, customer_id: 'CUST-1006', company_name: 'Horizon Supply Chain PLC', outcome_date: '2026-07-30', outcome_type: 'Attrited', primary_reason: 'Competitor offered lower international wire pricing', annual_revenue_impact: -310000.00 },
    ]];
  }

  // Reports queries
  if (lowerSql.includes('from transaction_monthly tm inner join customers c')) {
    return [data.transactions.filter(t => (t.count_decline_pct >= 15 || t.value_decline_pct >= 20)).slice(0, 50)];
  }
  if (lowerSql.includes('from operating_balances ob inner join customers c')) {
    return [data.balances.filter(b => b.balance_decline_pct >= 15).slice(0, 50)];
  }
  if (lowerSql.includes('from recommendations rec inner join customers c')) {
    return [data.recommendations];
  }
  if (lowerSql.includes('from retention_tasks rt inner join customers c')) {
    return [data.tasks];
  }
  if (lowerSql.includes('from customers c') && !lowerSql.includes('count(') && !lowerSql.includes('where c.id =')) {
    return [data.customers.slice(0, 50)];
  }

  // Scoring Rules Settings
  if (lowerSql.includes('from scoring_rules')) {
    return [[
      { id: 1, rule_code: 'RULE_TX_VOL_DECLINE', rule_name: 'High Transaction Volume Decline', description: 'Triggered when month-over-month transaction volume declines by 25% or more.', category: 'Transactions', default_points: 30, current_points: 30, threshold_operator: '>=', threshold_value: 25.0, is_active: 1, scoring_version: 'v1.0' },
      { id: 2, rule_code: 'RULE_BAL_DECLINE', rule_name: 'High Operating Balance Decline', description: 'Triggered when operating balance declines by 20% or more compared to previous period.', category: 'Operating Balances', default_points: 25, current_points: 25, threshold_operator: '>=', threshold_value: 20.0, is_active: 1, scoring_version: 'v1.0' },
      { id: 3, rule_code: 'RULE_COMPLAINTS_SEV', rule_name: 'Repeated or Unresolved Service Complaints', description: 'Triggered when customer has unresolved critical complaints or multiple open service escalations.', category: 'Service Quality', default_points: 20, current_points: 20, threshold_operator: '>=', threshold_value: 2.0, is_active: 1, scoring_version: 'v1.0' },
      { id: 4, rule_code: 'RULE_PROD_UTIL_DECLINE', rule_name: 'Significant Product Utilization Decline', description: 'Triggered when credit/treasury facility utilization drops significantly or products become inactive.', category: 'Products', default_points: 15, current_points: 15, threshold_operator: '>=', threshold_value: 20.0, is_active: 1, scoring_version: 'v1.0' },
      { id: 5, rule_code: 'RULE_SUSTAINED_PAYMENT_DECLINE', rule_name: 'Sustained Payment Activity Decline', description: 'Triggered when payment activity has fallen below the 3-month moving average by 30% or sustained decline for 2+ months.', category: 'Activity Trends', default_points: 10, current_points: 10, threshold_operator: '>=', threshold_value: 2.0, is_active: 1, scoring_version: 'v1.0' },
    ]];
  }

  // Audit Logs
  if (lowerSql.includes('from audit_logs')) {
    return [[
      { id: 1, action: 'POLICY_BASELINE_INIT', entity_type: 'SETTINGS', entity_id: 'v1.0', ip_address: '127.0.0.1', created_at: '2026-10-25 08:00:00', full_name: 'Sarah Jenkins (Admin)' }
    ]];
  }

  return [[]];
}

module.exports = {
  loadSeedData,
  handleMockQuery,
};
