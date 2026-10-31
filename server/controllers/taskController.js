const db = require('../config/db');

/**
 * List retention follow-up tasks with filters and overdue highlighting
 */
async function getTasks(req, res) {
  try {
    const { status = 'All', rmId = '', priority = 'All', isOverdue = false, search = '', page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * pageLimit;

    const whereClauses = [];
    const params = [];

    if (status && status !== 'All') {
      whereClauses.push('rt.status = ?');
      params.push(status);
    }

    if (rmId && rmId !== 'All') {
      whereClauses.push('rt.assigned_rm_id = ?');
      params.push(parseInt(rmId, 10));
    }

    if (priority && priority !== 'All') {
      whereClauses.push('rt.priority = ?');
      params.push(priority);
    }

    if (isOverdue === 'true' || isOverdue === true) {
      whereClauses.push('(rt.status = "Overdue" OR (rt.due_date < CURDATE() AND rt.status IN ("Open", "In Progress")))');
    }

    if (search) {
      whereClauses.push('(c.company_name LIKE ? OR rt.customer_id LIKE ? OR rt.title LIKE ? OR rt.task_uid LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(rt.id) AS total
      FROM retention_tasks rt
      INNER JOIN customers c ON rt.customer_id = c.id
      ${whereSql}
    `;
    const [countRows] = await db.query(countSql, params);
    const totalRecords = countRows[0]?.total || 0;

    const dataSql = `
      SELECT 
        rt.*,
        c.company_name,
        c.industry,
        c.business_segment,
        c.annual_revenue,
        rm.name AS rm_name,
        COALESCE(ra.risk_score, 0) AS risk_score,
        COALESCE(ra.risk_category, 'Low') AS risk_category,
        CASE 
          WHEN rt.due_date < CURDATE() AND rt.status IN ('Open', 'In Progress') THEN 1 
          ELSE 0 
        END AS is_overdue_flag
      FROM retention_tasks rt
      INNER JOIN customers c ON rt.customer_id = c.id
      LEFT JOIN relationship_managers rm ON rt.assigned_rm_id = rm.id
      LEFT JOIN risk_assessments ra ON c.id = ra.customer_id AND ra.is_latest = TRUE
      ${whereSql}
      ORDER BY 
        CASE WHEN rt.due_date < CURDATE() AND rt.status IN ('Open', 'In Progress') THEN 0 ELSE 1 END ASC,
        FIELD(rt.priority, 'Urgent', 'High', 'Medium', 'Low'),
        rt.due_date ASC
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
    res.status(500).json({ success: false, message: 'Failed to fetch retention tasks.', error: error.message });
  }
}

/**
 * Create a new retention task
 */
async function createTask(req, res) {
  try {
    const {
      customerId,
      recommendationId,
      title,
      description,
      assignedRmId,
      dueDate,
      priority = 'Medium',
      notes,
    } = req.body;

    if (!customerId || !title || !dueDate) {
      return res.status(400).json({ success: false, message: 'Customer ID, title, and due date are required.' });
    }

    const taskUid = `TSK-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    const [resInsert] = await db.query(
      `INSERT INTO retention_tasks
       (task_uid, customer_id, recommendation_id, title, description, assigned_rm_id, due_date, priority, status, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Open', ?, NOW())`,
      [taskUid, customerId, recommendationId || null, title, description || '', assignedRmId || null, dueDate, priority, notes || '']
    );

    res.status(201).json({
      success: true,
      message: 'Retention task created successfully.',
      id: resInsert.insertId,
      taskUid,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create retention task.', error: error.message });
  }
}

/**
 * Update task status, notes, interventions, customer feedback, and recorded outcome
 */
async function updateTask(req, res) {
  try {
    const { id } = req.params;
    const {
      status,
      assignedRmId,
      dueDate,
      priority,
      customerFeedback,
      completedInterventions,
      recordedOutcome,
      outcomeEvaluationDate,
      notes,
    } = req.body;

    await db.query(
      `UPDATE retention_tasks
       SET status = COALESCE(?, status),
           assigned_rm_id = COALESCE(?, assigned_rm_id),
           due_date = COALESCE(?, due_date),
           priority = COALESCE(?, priority),
           customer_feedback = COALESCE(?, customer_feedback),
           completed_interventions = COALESCE(?, completed_interventions),
           recorded_outcome = COALESCE(?, recorded_outcome),
           outcome_evaluation_date = COALESCE(?, outcome_evaluation_date),
           notes = COALESCE(?, notes),
           updated_at = NOW()
       WHERE id = ?`,
      [
        status,
        assignedRmId,
        dueDate,
        priority,
        customerFeedback,
        completedInterventions,
        recordedOutcome,
        outcomeEvaluationDate,
        notes,
        id,
      ]
    );

    res.json({ success: true, message: 'Retention task updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update retention task.', error: error.message });
  }
}

module.exports = {
  getTasks,
  createTask,
  updateTask,
};
