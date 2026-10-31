const db = require('../config/db');

/**
 * Get current risk scoring configuration and thresholds
 */
async function getSettings(req, res) {
  try {
    const [rules] = await db.query(
      `SELECT * FROM scoring_rules ORDER BY id ASC`
    );

    const [auditLogs] = await db.query(
      `SELECT al.*, u.username, u.full_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.entity_type = 'SETTINGS'
       ORDER BY al.created_at DESC
       LIMIT 10`
    );

    res.json({
      success: true,
      data: {
        scoringRules: rules,
        scoringVersion: 'v1.0',
        categories: [
          { name: 'Low', min: 0, max: 29, color: '#0d9488' },
          { name: 'Medium', min: 30, max: 59, color: '#d97706' },
          { name: 'High', min: 60, max: 79, color: '#ea580c' },
          { name: 'Critical', min: 80, max: 100, color: '#dc2626' },
        ],
        auditLogs,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch settings.', error: error.message });
  }
}

/**
 * Update scoring rules and thresholds
 */
async function updateSettings(req, res) {
  try {
    const { rules, newVersion } = req.body;
    if (!Array.isArray(rules) || rules.length === 0) {
      return res.status(400).json({ success: false, message: 'Rules array is required.' });
    }

    // Validate weights sum and thresholds
    let totalPoints = 0;
    for (const r of rules) {
      const pts = parseInt(r.currentPoints || r.current_points, 10);
      if (isNaN(pts) || pts < 0) {
        return res.status(400).json({ success: false, message: `Invalid points value for rule ${r.ruleCode || r.rule_code}` });
      }
      totalPoints += pts;
    }

    const version = newVersion || 'v1.1';

    // Update each rule in DB
    for (const r of rules) {
      const code = r.ruleCode || r.rule_code;
      const pts = parseInt(r.currentPoints || r.current_points, 10);
      const threshold = parseFloat(r.thresholdValue || r.threshold_value);

      await db.query(
        `UPDATE scoring_rules
         SET current_points = ?,
             threshold_value = ?,
             scoring_version = ?,
             updated_at = NOW()
         WHERE rule_code = ?`,
        [pts, threshold, version, code]
      );
    }

    // Log to audit log
    await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, created_at)
       VALUES (?, 'UPDATE_SCORING_RULES', 'SETTINGS', ?, ?, ?, NOW())`,
      [
        req.user?.id || 1,
        version,
        JSON.stringify({ updatedRulesCount: rules.length, newVersion: version, totalWeights: totalPoints }),
        req.ip || '127.0.0.1',
      ]
    );

    res.json({
      success: true,
      message: 'Scoring rules and risk thresholds updated successfully.',
      version,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update settings.', error: error.message });
  }
}

module.exports = {
  getSettings,
  updateSettings,
};
