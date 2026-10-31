const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Controllers
const authController = require('../controllers/authController');
const customerController = require('../controllers/customerController');
const dashboardController = require('../controllers/dashboardController');
const analyticsController = require('../controllers/analyticsController');
const riskController = require('../controllers/riskController');
const alertController = require('../controllers/alertController');
const recommendationController = require('../controllers/recommendationController');
const taskController = require('../controllers/taskController');
const campaignController = require('../controllers/campaignController');
const dataController = require('../controllers/dataController');
const reportsController = require('../controllers/reportsController');
const settingsController = require('../controllers/settingsController');

// Middleware
const { authenticateToken, requireRole } = require('../middleware/auth');

// ==========================================
// 1. Health & System Status
// ==========================================
router.get('/health', async (req, res) => {
  const dbStatus = await db.testConnection();
  res.json({
    status: 'online',
    system: 'BankRetain Corporate Banking Analytics Engine',
    timestamp: new Date().toISOString(),
    database: {
      connected: dbStatus.success,
      host: db.dbConfig.host,
      database: db.dbConfig.database,
      error: dbStatus.error || null,
    },
    version: '1.0.0',
    mode: process.env.NODE_ENV || 'development',
  });
});

// Relationship Managers lookup
router.get('/relationship-managers', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, email, phone, department, region, active_accounts_count
       FROM relationship_managers
       ORDER BY name ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 2. Authentication
// ==========================================
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticateToken, authController.getCurrentUser);

// ==========================================
// 3. Executive Dashboard
// ==========================================
router.get('/dashboard/summary', dashboardController.getDashboardSummary);
router.get('/dashboard/charts', dashboardController.getDashboardCharts);
router.get('/dashboard/high-risk', dashboardController.getHighRiskCustomers);

// ==========================================
// 4. Corporate Customer Management
// ==========================================
router.get('/customers', customerController.getCustomers);
router.get('/customers/:id', customerController.getCustomerById);
router.get('/customers/:id/timeline', customerController.getCustomerTimeline);
router.post('/customers', authenticateToken, customerController.createCustomer);
router.put('/customers/:id', authenticateToken, customerController.updateCustomer);
router.patch('/customers/:id/archive', authenticateToken, customerController.archiveCustomer);

// ==========================================
// 5. Relationship Analytics
// ==========================================
router.get('/analytics/transactions/:customerId', analyticsController.getTransactions);
router.get('/analytics/balances/:customerId', analyticsController.getBalances);
router.get('/analytics/products/:customerId', analyticsController.getProducts);
router.get('/analytics/complaints/:customerId', analyticsController.getComplaints);

// ==========================================
// 6. Rule-Based Risk Scoring & Explanation
// ==========================================
router.get('/risk/customers', riskController.getRiskCustomers);
router.get('/risk/customers/:customerId', riskController.getCustomerRiskAnalysis);
router.get('/risk/history/:customerId', riskController.getRiskHistory);
router.post('/risk/recalculate/:customerId', authenticateToken, riskController.recalculateCustomerRisk);
router.post('/risk/recalculate-all', authenticateToken, riskController.recalculateAllRisk);

// ==========================================
// 7. Early Warning System (Alerts)
// ==========================================
router.get('/alerts', alertController.getAlerts);
router.get('/alerts/:id', alertController.getAlertById);
router.post('/alerts/:id/acknowledge', authenticateToken, alertController.acknowledgeAlert);
router.post('/alerts/:id/assign', authenticateToken, alertController.assignAlert);
router.post('/alerts/:id/resolve', authenticateToken, alertController.resolveAlert);
router.post('/alerts/:id/dismiss', authenticateToken, alertController.dismissAlert);

// ==========================================
// 8. Retention Recommendations
// ==========================================
router.get('/recommendations', recommendationController.getRecommendations);
router.post('/recommendations', authenticateToken, recommendationController.createRecommendation);
router.patch('/recommendations/:id', authenticateToken, recommendationController.updateRecommendation);

// ==========================================
// 9. Retention Follow-Up Tasks
// ==========================================
router.get('/tasks', taskController.getTasks);
router.post('/tasks', authenticateToken, taskController.createTask);
router.patch('/tasks/:id', authenticateToken, taskController.updateTask);

// ==========================================
// 10. Campaign Analytics (RCT / A/B Testing)
// ==========================================
router.get('/campaigns', campaignController.getCampaigns);
router.post('/campaigns', authenticateToken, campaignController.createCampaign);
router.get('/campaigns/:id', campaignController.getCampaignById);
router.post('/campaigns/:id/assign', authenticateToken, campaignController.assignCampaign);
router.post('/campaigns/:id/outcomes', authenticateToken, campaignController.recordOutcome);
router.get('/campaigns/:id/analysis', campaignController.getCampaignAnalysis);

// ==========================================
// 11. Data Management & CSV Import
// ==========================================
router.post('/import/preview', authenticateToken, dataController.previewCsv);
router.post('/import/execute', authenticateToken, dataController.executeImport);

// ==========================================
// 12. Reports & CSV Exports
// ==========================================
router.get('/reports/high-risk-customers', reportsController.getHighRiskReport);
router.get('/reports/alerts', reportsController.getAlertsReport);
router.get('/reports/campaign-performance', reportsController.getCampaignPerformanceReport);
router.get('/reports/:type', reportsController.getReportByType);

// ==========================================
// 13. System Settings & Scoring Weights
// ==========================================
router.get('/settings', settingsController.getSettings);
router.put('/settings', authenticateToken, requireRole(['admin']), settingsController.updateSettings);

module.exports = router;
