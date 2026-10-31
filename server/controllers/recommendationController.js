const db = require('../config/db');

/**
 * List recommendations
 */
async function getRecommendations(req, res) {
  try {
    const { status = 'All', priority = 'All', rmId = '', search = '', page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * pageLimit;

    const whereClauses = [];
    const params = [];

    if (status && status !== 'All') {
      whereClauses.push('rec.status = ?');
      params.push(status);
    }

    if (priority && priority !== 'All') {
      whereClauses.push('rec.priority = ?');
      params.push(priority);
    }

    if (rmId && rmId !== 'All') {
      whereClauses.push('rec.rm_id = ?');
      params.push(parseInt(rmId, 10));
    }

    if (search) {
      whereClauses.push('(c.company_name LIKE ? OR rec.customer_id LIKE ? OR rec.title LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(rec.id) AS total
      FROM recommendations rec
      INNER JOIN customers c ON rec.customer_id = c.id
      ${whereSql}
    `;
    const [countRows] = await db.query(countSql, params);
    const totalRecords = countRows[0]?.total || 0;

    const dataSql = `
      SELECT 
        rec.*,
        c.company_name,
        c.industry,
        c.business_segment,
        rm.name AS rm_name
      FROM recommendations rec
      INNER JOIN customers c ON rec.customer_id = c.id
      LEFT JOIN relationship_managers rm ON rec.rm_id = rm.id
      ${whereSql}
      ORDER BY 
        FIELD(rec.priority, 'Urgent', 'High', 'Medium', 'Low'),
        FIELD(rec.status, 'Pending', 'Accepted', 'In Progress', 'Completed', 'Deferred', 'Rejected'),
        rec.created_date DESC
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
    res.status(500).json({ success: false, message: 'Failed to fetch recommendations.', error: error.message });
  }
}

/**
 * Create a new recommendation manually
 */
async function createRecommendation(req, res) {
  try {
    const { customerId, category, title, description, priority = 'Medium', rmId, dueDate } = req.body;

    if (!customerId || !category || !title || !description) {
      return res.status(400).json({ success: false, message: 'Customer ID, category, title, and description are required.' });
    }

    const recUid = `REC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    const [result] = await db.query(
      `INSERT INTO recommendations
       (rec_uid, customer_id, recommendation_category, title, description, priority, rm_id, created_date, due_date, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, 'Pending', NOW())`,
      [recUid, customerId, category, title, description, priority, rmId || null, dueDate || null]
    );

    res.status(201).json({
      success: true,
      message: 'Recommendation created successfully.',
      id: result.insertId,
      recUid,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create recommendation.', error: error.message });
  }
}

/**
 * Update recommendation status and details
 */
async function updateRecommendation(req, res) {
  try {
    const { id } = req.params;
    const { status, rmId, dueDate, rejectionReason, completionNotes, outcome } = req.body;

    if (status === 'Rejected' && (!rejectionReason || rejectionReason.trim().length < 5)) {
      return res.status(400).json({
        success: false,
        message: 'A valid reason is strictly required when rejecting a retention recommendation.',
      });
    }

    await db.query(
      `UPDATE recommendations
       SET status = COALESCE(?, status),
           rm_id = COALESCE(?, rm_id),
           due_date = COALESCE(?, due_date),
           rejection_reason = COALESCE(?, rejection_reason),
           completion_notes = COALESCE(?, completion_notes),
           outcome = COALESCE(?, outcome),
           updated_at = NOW()
       WHERE id = ?`,
      [status, rmId, dueDate, rejectionReason, completionNotes, outcome, id]
    );

    // If accepted, automatically create a corresponding retention task
    if (status === 'Accepted') {
      const [recRows] = await db.query(`SELECT * FROM recommendations WHERE id = ?`, [id]);
      if (recRows.length > 0) {
        const r = recRows[0];
        const taskUid = `TSK-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
        await db.query(
          `INSERT INTO retention_tasks
           (task_uid, customer_id, recommendation_id, title, description, assigned_rm_id, due_date, priority, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, DATE_ADD(CURDATE(), INTERVAL 14 DAY)), ?, 'Open', NOW())`,
          [taskUid, r.customer_id, r.id, r.title, r.description, r.rm_id, r.due_date, r.priority]
        );
      }
    }

    res.json({ success: true, message: 'Recommendation updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update recommendation.', error: error.message });
  }
}

module.exports = {
  getRecommendations,
  createRecommendation,
  updateRecommendation,
};
