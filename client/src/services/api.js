/**
 * BankRetain API Client
 * Centralized service for communicating with Express backend.
 */

// Support custom backend URL in cloud deployments (e.g. Vercel -> Render)
// Falls back to '/api' in local development to utilize Vite dev server proxy
const API_URL = import.meta.env.VITE_API_URL || '';
const API_BASE = API_URL ? `${API_URL.replace(/\/$/, '')}/api` : '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('bankretain_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/csv')) {
    return response.blob();
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `API error: ${response.status}`);
  }
  return data;
}

// 1. Auth APIs
export const authApi = {
  login: (username, password) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getCurrentUser: () => apiRequest('/auth/me'),
};

// 2. Dashboard APIs
export const dashboardApi = {
  getSummary: (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    return apiRequest(`/dashboard/summary?${query}`);
  },
  getCharts: (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    return apiRequest(`/dashboard/charts?${query}`);
  },
  getHighRisk: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/dashboard/high-risk?${query}`);
  },
};

// 3. Customer APIs
export const customerApi = {
  getCustomers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/customers?${query}`);
  },
  getCustomerById: (id) => apiRequest(`/customers/${id}`),
  getCustomerTimeline: (id) => apiRequest(`/customers/${id}/timeline`),
  createCustomer: (data) => apiRequest('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id, data) => apiRequest(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  archiveCustomer: (id) => apiRequest(`/customers/${id}/archive`, { method: 'PATCH' }),
};

// 4. Analytics APIs
export const analyticsApi = {
  getTransactions: (customerId) => apiRequest(`/analytics/transactions/${customerId}`),
  getBalances: (customerId) => apiRequest(`/analytics/balances/${customerId}`),
  getProducts: (customerId) => apiRequest(`/analytics/products/${customerId}`),
  getComplaints: (customerId) => apiRequest(`/analytics/complaints/${customerId}`),
};

// 5. Risk APIs
export const riskApi = {
  getRiskCustomers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/risk/customers?${query}`);
  },
  getCustomerAnalysis: (customerId) => apiRequest(`/risk/customers/${customerId}`),
  getRiskHistory: (customerId) => apiRequest(`/risk/history/${customerId}`),
  recalculateCustomer: (customerId) => apiRequest(`/risk/recalculate/${customerId}`, { method: 'POST' }),
  recalculateAll: () => apiRequest('/risk/recalculate-all', { method: 'POST' }),
};

// 6. Alert APIs
export const alertApi = {
  getAlerts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/alerts?${query}`);
  },
  getAlertById: (id) => apiRequest(`/alerts/${id}`),
  acknowledge: (id) => apiRequest(`/alerts/${id}/acknowledge`, { method: 'POST' }),
  assign: (id, rmId) => apiRequest(`/alerts/${id}/assign`, { method: 'POST', body: JSON.stringify({ rmId }) }),
  resolve: (id, resolutionNotes) => apiRequest(`/alerts/${id}/resolve`, { method: 'POST', body: JSON.stringify({ resolutionNotes }) }),
  dismiss: (id, dismissalReason) => apiRequest(`/alerts/${id}/dismiss`, { method: 'POST', body: JSON.stringify({ dismissalReason }) }),
};

// 7. Recommendation APIs
export const recommendationApi = {
  getRecommendations: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/recommendations?${query}`);
  },
  create: (data) => apiRequest('/recommendations', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiRequest(`/recommendations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// 8. Task APIs
export const taskApi = {
  getTasks: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/tasks?${query}`);
  },
  create: (data) => apiRequest('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiRequest(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// 9. Campaign APIs
export const campaignApi = {
  getCampaigns: () => apiRequest('/campaigns'),
  create: (data) => apiRequest('/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  getById: (id) => apiRequest(`/campaigns/${id}`),
  assign: (id) => apiRequest(`/campaigns/${id}/assign`, { method: 'POST' }),
  recordOutcome: (id, data) => apiRequest(`/campaigns/${id}/outcomes`, { method: 'POST', body: JSON.stringify(data) }),
  getAnalysis: (id) => apiRequest(`/campaigns/${id}/analysis`),
};

// 10. Data Import APIs
export const dataApi = {
  previewCsv: (csvContent, importType) => apiRequest('/import/preview', { method: 'POST', body: JSON.stringify({ csvContent, importType }) }),
  executeImport: (data) => apiRequest('/import/execute', { method: 'POST', body: JSON.stringify(data) }),
};

// 11. Reports APIs
export const reportsApi = {
  getReport: (type, format = 'json') => apiRequest(`/reports/${type}?format=${format}`),
  getHighRisk: (format = 'json') => apiRequest(`/reports/high-risk-customers?format=${format}`),
  getAlerts: (format = 'json') => apiRequest(`/reports/alerts?format=${format}`),
  getCampaigns: (format = 'json') => apiRequest(`/reports/campaign-performance?format=${format}`),
};

// 12. Settings & System APIs
export const settingsApi = {
  getSettings: () => apiRequest('/settings'),
  updateSettings: (data) => apiRequest('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  getHealth: () => apiRequest('/health'),
  getRelationshipManagers: () => apiRequest('/relationship-managers'),
};
