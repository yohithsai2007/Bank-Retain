const {
  getCustomerTransactionAnalytics,
  getCustomerBalanceAnalytics,
  getCustomerProductsAnalytics,
  getCustomerComplaintsAnalytics,
} = require('../services/analyticsService');

async function getTransactions(req, res) {
  try {
    const { customerId } = req.params;
    const data = await getCustomerTransactionAnalytics(customerId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch transaction analytics.', error: error.message });
  }
}

async function getBalances(req, res) {
  try {
    const { customerId } = req.params;
    const data = await getCustomerBalanceAnalytics(customerId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch balance analytics.', error: error.message });
  }
}

async function getProducts(req, res) {
  try {
    const { customerId } = req.params;
    const data = await getCustomerProductsAnalytics(customerId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch products analytics.', error: error.message });
  }
}

async function getComplaints(req, res) {
  try {
    const { customerId } = req.params;
    const data = await getCustomerComplaintsAnalytics(customerId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch complaints analytics.', error: error.message });
  }
}

module.exports = {
  getTransactions,
  getBalances,
  getProducts,
  getComplaints,
};
