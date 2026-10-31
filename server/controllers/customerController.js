const db = require('../config/db');
const { calculateAndSaveCustomerRisk } = require('../services/riskScoringService');
const { evaluateCustomerAlerts } = require('../services/alertService');
const { generateCustomerRecommendations } = require('../services/recommendationService');

/**
 * List corporate customers with rich filters, sorting, and pagination
 */
async function getCustomers(req, res) {
  try {
    const {
      search = '',
      industry = '',
      region = '',
      segment = '',
      riskCategory = '',
      status = '',
      rmId = '',
      sortBy = 'risk_score',
      sortDir = 'DESC',
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * pageLimit;

    const whereClauses = [];
    const params = [];

    if (search) {
      whereClauses.push('(c.company_name LIKE ? OR c.id LIKE ? OR c.registration_number LIKE ? OR c.contact_person LIKE ?)');
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    if (industry && industry !== 'All') {
      whereClauses.push('c.industry = ?');
      params.push(industry);
    }

    if (region && region !== 'All') {
      whereClauses.push('c.region = ?');
      params.push(region);
    }

    if (segment && segment !== 'All') {
      whereClauses.push('c.business_segment = ?');
      params.push(segment);
    }

    if (status && status !== 'All') {
      whereClauses.push('c.account_status = ?');
      params.push(status);
    } else {
      whereClauses.push("c.account_status != 'Archived'");
    }

    if (rmId && rmId !== 'All') {
      whereClauses.push('c.rm_id = ?');
      params.push(parseInt(rmId, 10));
    }

    if (riskCategory && riskCategory !== 'All') {
      whereClauses.push('ra.risk_category = ?');
      params.push(riskCategory);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Allowed sorting fields
    const validSortFields = {
      risk_score: 'ra.risk_score',
      company_name: 'c.company_name',
      annual_revenue: 'c.annual_revenue',
      relationship_start_date: 'c.relationship_start_date',
      product_count: 'c.product_count',
      id: 'c.id',
    };
    const orderColumn = validSortFields[sortBy] || 'ra.risk_score';
    const orderDirection = sortDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Count query
    const countSql = `
      SELECT COUNT(*) AS total
      FROM customers c
      LEFT JOIN risk_assessments ra ON c.id = ra.customer_id AND ra.is_latest = TRUE
      ${whereSql}
    `;
    const [countResult] = await db.query(countSql, params);
    const totalRecords = countResult[0]?.total || 0;

    // Data query
    const dataSql = `
      SELECT 
        c.id,
        c.company_name,
        c.registration_number,
        c.industry,
        c.business_segment,
        c.region,
        c.relationship_start_date,
        c.account_status,
        c.product_count,
        c.annual_revenue,
        c.credit_rating,
        c.contact_person,
        c.contact_email,
        c.contact_phone,
        c.rm_id,
        rm.name AS rm_name,
        COALESCE(ra.risk_score, 0) AS risk_score,
        COALESCE(ra.risk_category, 'Low') AS risk_category,
        COALESCE(ra.score_change_from_previous, 0) AS score_change_from_previous,
        (
          SELECT COUNT(*)
          FROM alerts a
          WHERE a.customer_id = c.id AND a.status IN ('Active', 'Acknowledged', 'Under Review')
        ) AS active_alerts_count,
        (
          SELECT COUNT(*)
          FROM retention_tasks rt
          WHERE rt.customer_id = c.id AND rt.status IN ('Open', 'In Progress', 'Overdue')
        ) AS pending_tasks_count,
        (
          SELECT COUNT(*)
          FROM recommendations rec
          WHERE rec.customer_id = c.id AND rec.status IN ('Pending', 'Accepted')
        ) AS pending_recommendations_count
      FROM customers c
      LEFT JOIN relationship_managers rm ON c.rm_id = rm.id
      LEFT JOIN risk_assessments ra ON c.id = ra.customer_id AND ra.is_latest = TRUE
      ${whereSql}
      ORDER BY ${orderColumn} ${orderDirection}
      LIMIT ? OFFSET ?
    `;

    const [rows] = await db.query(dataSql, [...params, pageLimit, offset]);

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
    res.status(500).json({ success: false, message: 'Failed to fetch customers.', error: error.message });
  }
}

/**
 * Get single customer detailed profile with metrics for all 9 tabs
 */
async function getCustomerById(req, res) {
  try {
    const { id } = req.params;

    // 1. Core customer and RM info
    const [custRows] = await db.query(
      `SELECT c.*, rm.name AS rm_name, rm.email AS rm_email, rm.phone AS rm_phone, rm.department AS rm_department
       FROM customers c
       LEFT JOIN relationship_managers rm ON c.rm_id = rm.id
       WHERE c.id = ?`,
      [id]
    );

    if (!custRows.length) {
      return res.status(404).json({ success: false, message: `Corporate customer '${id}' not found.` });
    }

    const customer = custRows[0];

    // 2. Latest risk assessment and details
    const [riskRows] = await db.query(
      `SELECT ra.* 
       FROM risk_assessments ra
       WHERE ra.customer_id = ? AND ra.is_latest = TRUE
       LIMIT 1`,
      [id]
    );

    let latestRisk = riskRows[0] || null;
    let riskDetails = [];

    if (latestRisk) {
      const [detailsRows] = await db.query(
        `SELECT * FROM risk_assessment_details WHERE assessment_id = ?`,
        [latestRisk.id]
      );
      riskDetails = detailsRows;
    }

    // 3. Historical risk scores (chronological trend)
    const [riskHistory] = await db.query(
      `SELECT id, assessment_date, risk_score, risk_category, score_change_from_previous, score_change_reason
       FROM risk_assessments
       WHERE customer_id = ?
       ORDER BY assessment_date ASC`,
      [id]
    );

    // 4. Monthly transactions (last 12 months)
    const [transactions] = await db.query(
      `SELECT * FROM transaction_monthly WHERE customer_id = ? ORDER BY period_date ASC`,
      [id]
    );

    // 5. Operating balances (last 12 months)
    const [balances] = await db.query(
      `SELECT * FROM operating_balances WHERE customer_id = ? ORDER BY period_date ASC`,
      [id]
    );

    // 6. Products
    const [products] = await db.query(
      `SELECT * FROM customer_products WHERE customer_id = ? ORDER BY product_category ASC`,
      [id]
    );

    // 7. Complaints
    const [complaints] = await db.query(
      `SELECT * FROM service_complaints WHERE customer_id = ? ORDER BY reported_date DESC`,
      [id]
    );

    // 8. Alerts
    const [alerts] = await db.query(
      `SELECT * FROM alerts WHERE customer_id = ? ORDER BY detection_date DESC`,
      [id]
    );

    // 9. Recommendations & Tasks
    const [recommendations] = await db.query(
      `SELECT * FROM recommendations WHERE customer_id = ? ORDER BY created_date DESC`,
      [id]
    );

    const [retentionTasks] = await db.query(
      `SELECT rt.*, rm.name AS rm_name
       FROM retention_tasks rt
       LEFT JOIN relationship_managers rm ON rt.assigned_rm_id = rm.id
       WHERE rt.customer_id = ?
       ORDER BY rt.due_date ASC`,
      [id]
    );

    // Calculate relationship duration in years and months
    const startDate = new Date(customer.relationship_start_date);
    const now = new Date();
    const diffMonths = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
    const years = Math.floor(diffMonths / 12);
    const months = diffMonths % 12;
    const durationFormatted = `${years} yrs ${months} mos`;

    res.json({
      success: true,
      data: {
        customer: {
          ...customer,
          durationFormatted,
        },
        risk: {
          latest: latestRisk,
          details: riskDetails,
          history: riskHistory,
        },
        transactions,
        balances,
        products,
        complaints,
        alerts,
        recommendations,
        retentionTasks,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch customer profile.', error: error.message });
  }
}

/**
 * Create a new corporate customer
 */
async function createCustomer(req, res) {
  try {
    const {
      companyName,
      registrationNumber,
      industry,
      businessSegment,
      region,
      relationshipStartDate,
      rmId,
      productCount = 1,
      annualRevenue = 0,
      creditRating = 'BBB',
      contactPerson,
      contactEmail,
      contactPhone,
    } = req.body;

    if (!companyName || !registrationNumber || !industry || !businessSegment || !region) {
      return res.status(400).json({ success: false, message: 'Missing mandatory customer information.' });
    }

    // Auto-generate customer ID: CUST-XXXX
    const [idRow] = await db.query(`SELECT COUNT(*) AS count FROM customers`);
    const newId = `CUST-${1000 + (idRow[0]?.count || 0) + 1}`;

    await db.query(
      `INSERT INTO customers 
       (id, company_name, registration_number, industry, business_segment, region,
        relationship_start_date, rm_id, account_status, product_count, annual_revenue,
        credit_rating, contact_person, contact_email, contact_phone, is_synthetic_demonstration, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?, ?, ?, ?, ?, FALSE, NOW())`,
      [
        newId,
        companyName,
        registrationNumber,
        industry,
        businessSegment,
        region,
        relationshipStartDate || new Date().toISOString().split('T')[0],
        rmId || null,
        productCount,
        annualRevenue,
        creditRating,
        contactPerson || 'Primary Contact',
        contactEmail || 'corporate@example.com',
        contactPhone || '+1-800-555-0100',
      ]
    );

    // Initialize baseline risk assessment
    await calculateAndSaveCustomerRisk(newId);

    res.status(201).json({
      success: true,
      message: 'Corporate customer registered successfully.',
      customerId: newId,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create customer.', error: error.message });
  }
}

/**
 * Update customer details
 */
async function updateCustomer(req, res) {
  try {
    const { id } = req.params;
    const {
      companyName,
      industry,
      businessSegment,
      region,
      rmId,
      accountStatus,
      productCount,
      annualRevenue,
      creditRating,
      contactPerson,
      contactEmail,
      contactPhone,
    } = req.body;

    await db.query(
      `UPDATE customers
       SET company_name = COALESCE(?, company_name),
           industry = COALESCE(?, industry),
           business_segment = COALESCE(?, business_segment),
           region = COALESCE(?, region),
           rm_id = COALESCE(?, rm_id),
           account_status = COALESCE(?, account_status),
           product_count = COALESCE(?, product_count),
           annual_revenue = COALESCE(?, annual_revenue),
           credit_rating = COALESCE(?, credit_rating),
           contact_person = COALESCE(?, contact_person),
           contact_email = COALESCE(?, contact_email),
           contact_phone = COALESCE(?, contact_phone),
           updated_at = NOW()
       WHERE id = ?`,
      [
        companyName,
        industry,
        businessSegment,
        region,
        rmId,
        accountStatus,
        productCount,
        annualRevenue,
        creditRating,
        contactPerson,
        contactEmail,
        contactPhone,
        id,
      ]
    );

    res.json({ success: true, message: 'Corporate customer updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update customer.', error: error.message });
  }
}

/**
 * Archive customer relationship
 */
async function archiveCustomer(req, res) {
  try {
    const { id } = req.params;
    await db.query(
      `UPDATE customers SET account_status = 'Archived', updated_at = NOW() WHERE id = ?`,
      [id]
    );
    res.json({ success: true, message: `Customer '${id}' archived successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to archive customer.', error: error.message });
  }
}

/**
 * Get customer activity timeline generated from actual application activities
 */
async function getCustomerTimeline(req, res) {
  try {
    const { id } = req.params;

    const timelineEvents = [];

    // 1. Transaction decline events
    const [txEvents] = await db.query(
      `SELECT month_year, period_date, total_count, count_decline_pct, total_value, value_decline_pct
       FROM transaction_monthly
       WHERE customer_id = ? AND (count_decline_pct >= 15 OR value_decline_pct >= 20)
       ORDER BY period_date DESC`,
      [id]
    );
    for (const tx of txEvents) {
      timelineEvents.push({
        type: 'TRANSACTION_DECLINE_DETECTED',
        category: 'warning',
        timestamp: `${tx.period_date} 09:00:00`,
        title: `Transaction Contraction Detected (${tx.month_year})`,
        description: `Month-over-month transaction volume dropped by ${Number(tx.count_decline_pct).toFixed(1)}% (${tx.total_count} transactions logged).`,
      });
    }

    // 2. Balance warnings
    const [balEvents] = await db.query(
      `SELECT month_year, period_date, closing_balance, balance_decline_pct, sustained_decline_months
       FROM operating_balances
       WHERE customer_id = ? AND balance_decline_pct >= 15
       ORDER BY period_date DESC`,
      [id]
    );
    for (const b of balEvents) {
      timelineEvents.push({
        type: 'OPERATING_BALANCE_WARNING',
        category: 'danger',
        timestamp: `${b.period_date} 10:30:00`,
        title: `Operating Balance Outflow Warning (${b.month_year})`,
        description: `Operating balance declined by ${Number(b.balance_decline_pct).toFixed(1)}% to $${Number(b.closing_balance).toLocaleString()}. Sustained outflow periods: ${b.sustained_decline_months}.`,
      });
    }

    // 3. Complaints recorded
    const [compEvents] = await db.query(
      `SELECT complaint_ticket, category, severity, status, reported_date, summary, resolution_date
       FROM service_complaints
       WHERE customer_id = ?
       ORDER BY reported_date DESC`,
      [id]
    );
    for (const c of compEvents) {
      timelineEvents.push({
        type: 'COMPLAINT_RECORDED',
        category: c.severity === 'Critical' ? 'danger' : 'warning',
        timestamp: c.reported_date,
        title: `Service Complaint Logged: ${c.complaint_ticket}`,
        description: `[${c.category} / ${c.severity} Severity] ${c.summary}`,
      });
      if (c.resolution_date) {
        timelineEvents.push({
          type: 'COMPLAINT_RESOLVED',
          category: 'success',
          timestamp: c.resolution_date,
          title: `Service Complaint Resolved: ${c.complaint_ticket}`,
          description: `Complaint successfully resolved and closed.`,
        });
      }
    }

    // 4. Risk score recalculations
    const [riskAssessments] = await db.query(
      `SELECT assessment_date, risk_score, risk_category, score_change_from_previous, score_change_reason
       FROM risk_assessments
       WHERE customer_id = ?
       ORDER BY assessment_date DESC`,
      [id]
    );
    for (const ra of riskAssessments) {
      timelineEvents.push({
        type: 'RISK_SCORE_RECALCULATED',
        category: ra.risk_category === 'Critical' || ra.risk_category === 'High' ? 'danger' : 'info',
        timestamp: ra.assessment_date,
        title: `Risk Score Assessment: ${ra.risk_score}/100 (${ra.risk_category})`,
        description: ra.score_change_reason || `Risk score evaluated at ${ra.risk_score} points under rule-based framework.`,
      });
    }

    // 5. Alerts acknowledged or resolved
    const [alertEvents] = await db.query(
      `SELECT alert_uid, alert_type, severity, status, detection_date, updated_at
       FROM alerts
       WHERE customer_id = ?
       ORDER BY detection_date DESC`,
      [id]
    );
    for (const a of alertEvents) {
      timelineEvents.push({
        type: 'ALERT_TRIGGERED',
        category: a.severity === 'Critical' ? 'danger' : 'warning',
        timestamp: a.detection_date,
        title: `Early Warning Alert: ${a.alert_type}`,
        description: `Alert [${a.alert_uid}] triggered with severity '${a.severity}'. Current status: ${a.status}.`,
      });
    }

    // 6. Retention recommendations & tasks
    const [taskEvents] = await db.query(
      `SELECT task_uid, title, status, due_date, recorded_outcome, updated_at, created_at
       FROM retention_tasks
       WHERE customer_id = ?
       ORDER BY created_at DESC`,
      [id]
    );
    for (const t of taskEvents) {
      timelineEvents.push({
        type: 'RETENTION_TASK_CREATED',
        category: 'info',
        timestamp: t.created_at,
        title: `Retention Task Assigned: ${t.title}`,
        description: `Task [${t.task_uid}] assigned with due date ${t.due_date}. Status: ${t.status}.`,
      });
      if (t.status === 'Completed') {
        timelineEvents.push({
          type: 'RETENTION_TASK_COMPLETED',
          category: 'success',
          timestamp: t.updated_at,
          title: `Retention Action Completed: ${t.title}`,
          description: `Outcome recorded: ${t.recorded_outcome || 'Action finalized'}.`,
        });
      }
    }

    // Sort all events newest first
    timelineEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      data: timelineEvents,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch customer timeline.', error: error.message });
  }
}

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  archiveCustomer,
  getCustomerTimeline,
};
