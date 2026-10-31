const db = require('../config/db');

/**
 * List alerts with rich filtering, search, and pagination
 */
async function getAlerts(req, res) {
  try {
    const {
      status = 'All',
      severity = 'All',
      search = '',
      ruleCode = '',
      rmId = '',
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * pageLimit;

    const whereClauses = [];
    const params = [];

    if (status && status !== 'All') {
      whereClauses.push('a.status = ?');
      params.push(status);
    }

    if (severity && severity !== 'All') {
      whereClauses.push('a.severity = ?');
      params.push(severity);
    }

    if (ruleCode && ruleCode !== 'All') {
      whereClauses.push('a.triggered_rule_code = ?');
      params.push(ruleCode);
    }

    if (rmId && rmId !== 'All') {
      whereClauses.push('a.rm_id = ?');
      params.push(parseInt(rmId, 10));
    }

    if (search) {
      whereClauses.push('(c.company_name LIKE ? OR a.customer_id LIKE ? OR a.alert_uid LIKE ? OR a.alert_type LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(a.id) AS total
      FROM alerts a
      INNER JOIN customers c ON a.customer_id = c.id
      ${whereSql}
    `;
    const [countRows] = await db.query(countSql, params);
    const totalRecords = countRows[0]?.total || 0;

    const dataSql = `
      SELECT 
        a.id,
        a.alert_uid,
        a.customer_id,
        c.company_name,
        c.industry,
        a.alert_type,
        a.triggered_rule_code,
        a.observed_value,
        a.historical_baseline,
        a.threshold,
        a.severity,
        a.detection_date,
        a.last_evaluated_date,
        a.status,
        a.dismissal_reason,
        a.resolution_notes,
        a.recommended_next_step,
        a.is_escalated,
        a.escalation_count,
        a.rm_id,
        rm.name AS rm_name
      FROM alerts a
      INNER JOIN customers c ON a.customer_id = c.id
      LEFT JOIN relationship_managers rm ON a.rm_id = rm.id
      ${whereSql}
      ORDER BY 
        FIELD(a.severity, 'Critical', 'High', 'Medium', 'Low'),
        FIELD(a.status, 'Active', 'Acknowledged', 'Under Review', 'Resolved', 'Dismissed'),
        a.detection_date DESC
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
    res.status(500).json({ success: false, message: 'Failed to fetch alerts.', error: error.message });
  }
}

/**
 * Get single alert details
 */
async function getAlertById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT a.*, c.company_name, c.industry, rm.name AS rm_name
       FROM alerts a
       INNER JOIN customers c ON a.customer_id = c.id
       LEFT JOIN relationship_managers rm ON a.rm_id = rm.id
       WHERE a.id = ?`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Alert not found.' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch alert.', error: error.message });
  }
}

/**
 * Acknowledge an active alert
 */
async function acknowledgeAlert(req, res) {
  try {
    const { id } = req.params;
    await db.query(
      `UPDATE alerts SET status = 'Acknowledged', updated_at = NOW() WHERE id = ?`,
      [id]
    );
    res.json({ success: true, message: 'Alert acknowledged.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to acknowledge alert.', error: error.message });
  }
}

/**
 * Assign an alert to a relationship manager
 */
async function assignAlert(req, res) {
  try {
    const { id } = req.params;
    const { rmId } = req.body;
    if (!rmId) {
      return res.status(400).json({ success: false, message: 'Relationship Manager ID is required.' });
    }

    await db.query(
      `UPDATE alerts SET rm_id = ?, status = 'Under Review', updated_at = NOW() WHERE id = ?`,
      [rmId, id]
    );

    res.json({ success: true, message: 'Alert assigned to Relationship Manager.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to assign alert.', error: error.message });
  }
}

/**
 * Mark alert as resolved
 */
async function resolveAlert(req, res) {
  try {
    const { id } = req.params;
    const { resolutionNotes } = req.body;

    await db.query(
      `UPDATE alerts 
       SET status = 'Resolved', resolution_notes = ?, updated_at = NOW() 
       WHERE id = ?`,
      [resolutionNotes || 'Remediation completed by relationship team.', id]
    );

    res.json({ success: true, message: 'Alert marked as resolved.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to resolve alert.', error: error.message });
  }
}

/**
 * Dismiss a false alert with required reason
 */
async function dismissAlert(req, res) {
  try {
    const { id } = req.params;
    const { dismissalReason } = req.body;

    if (!dismissalReason || dismissalReason.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'A detailed dismissal reason is required to dismiss early warning alerts.',
      });
    }

    await db.query(
      `UPDATE alerts 
       SET status = 'Dismissed', dismissal_reason = ?, updated_at = NOW() 
       WHERE id = ?`,
      [dismissalReason.trim(), id]
    );

    res.json({ success: true, message: 'Alert dismissed.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to dismiss alert.', error: error.message });
  }
}

module.exports = {
  getAlerts,
  getAlertById,
  acknowledgeAlert,
  assignAlert,
  resolveAlert,
  dismissAlert,
};
