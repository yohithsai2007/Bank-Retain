import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  Calendar,
  ShieldAlert,
  AlertTriangle,
  User,
  Mail,
  Phone,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
  Package,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Plus,
  Activity,
  ArrowLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import {
  customerApi,
  riskApi,
  alertApi,
  recommendationApi,
  taskApi,
} from '../services/api';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'balances', label: 'Operating Balances' },
  { id: 'products', label: 'Product Utilization' },
  { id: 'complaints', label: 'Complaints' },
  { id: 'risk', label: 'Risk Analysis' },
  { id: 'alerts', label: 'Early Warnings' },
  { id: 'retention', label: 'Retention Actions' },
  { id: 'timeline', label: 'Activity Timeline' },
];

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [recalculating, setRecalculating] = useState(false);

  // Task creation modal inside Retention tab
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDue, setNewTaskDue] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [newTaskPriority, setNewTaskPriority] = useState('High');

  // Dismiss alert modal state
  const [dismissingAlertId, setDismissingAlertId] = useState(null);
  const [dismissalReason, setDismissalReason] = useState('');

  // Resolve alert state
  const [resolvingAlertId, setResolvingAlertId] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const [pRes, tRes] = await Promise.all([
        customerApi.getCustomerById(id),
        customerApi.getCustomerTimeline(id),
      ]);
      setProfileData(pRes.data);
      setTimelineEvents(tRes.data || []);
    } catch (err) {
      console.error('Failed to load customer profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const handleRecalculateRisk = async () => {
    setRecalculating(true);
    try {
      await riskApi.recalculateCustomer(id);
      await fetchProfile();
    } catch (err) {
      alert(err.message || 'Recalculation failed.');
    } finally {
      setRecalculating(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId) => {
    try {
      await alertApi.acknowledge(alertId);
      fetchProfile();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResolveAlert = async (e) => {
    e.preventDefault();
    if (!resolvingAlertId) return;
    try {
      await alertApi.resolve(resolvingAlertId, resolutionNotes);
      setResolvingAlertId(null);
      setResolutionNotes('');
      fetchProfile();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDismissAlert = async (e) => {
    e.preventDefault();
    if (!dismissingAlertId || dismissalReason.trim().length < 5) {
      alert('A valid reason is required to dismiss early warning alerts.');
      return;
    }
    try {
      await alertApi.dismiss(dismissingAlertId, dismissalReason);
      setDismissingAlertId(null);
      setDismissalReason('');
      fetchProfile();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      await taskApi.create({
        customerId: id,
        title: newTaskTitle,
        dueDate: newTaskDue,
        priority: newTaskPriority,
        assignedRmId: profileData?.customer?.rm_id || null,
      });
      setShowTaskModal(false);
      setNewTaskTitle('');
      fetchProfile();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus, recordedOutcome) => {
    try {
      await taskApi.update(taskId, {
        status: newStatus,
        recordedOutcome: recordedOutcome || undefined,
        outcomeEvaluationDate: recordedOutcome ? new Date().toISOString().split('T')[0] : undefined,
      });
      fetchProfile();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <span className="text-sm font-medium">Loading comprehensive customer analytics...</span>
      </div>
    );
  }

  const {
    customer,
    risk,
    transactions = [],
    balances = [],
    products = [],
    complaints = [],
    alerts = [],
    recommendations = [],
    retentionTasks = [],
  } = profileData || {};

  const activeAlerts = alerts.filter(a => ['Active', 'Acknowledged', 'Under Review'].includes(a.status));
  const openTasks = retentionTasks.filter(t => ['Open', 'In Progress', 'Overdue'].includes(t.status));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/customers')}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Corporate Directory
        </button>
        <div className="text-xs text-slate-400">
          Client ID: <span className="font-mono text-slate-700 font-semibold">{customer?.id}</span>
        </div>
      </div>

      {/* Corporate Profile Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
            {customer?.company_name?.charAt(0) || 'C'}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {customer?.company_name}
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  customer?.account_status === 'Active'
                    ? 'bg-teal-100 text-teal-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {customer?.account_status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
              <span>{customer?.industry}</span>
              <span>•</span>
              <span>{customer?.business_segment}</span>
              <span>•</span>
              <span>{customer?.region}</span>
              <span>•</span>
              <span>Reg: {customer?.registration_number}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
              <span>RM: <strong className="text-slate-700">{customer?.rm_name || 'Unassigned'}</strong></span>
              <span>•</span>
              <span>Duration: <strong className="text-slate-700">{customer?.durationFormatted}</strong></span>
              <span>•</span>
              <span>Turnover: <strong className="text-slate-700">${(Number(customer?.annual_revenue || 0) / 1000000).toFixed(1)}M</strong></span>
            </div>
          </div>
        </div>

        {/* Right side: Current Risk Score & Quick Recalculate */}
        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="text-right">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Rule-Based Risk Score
            </div>
            <div className="text-2xl font-black text-slate-900 leading-tight">
              {risk?.latest?.risk_score ?? 0}
              <span className="text-xs text-slate-400 font-normal"> / 100</span>
            </div>
            <span
              className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold mt-0.5 ${
                risk?.latest?.risk_category === 'Critical'
                  ? 'bg-red-600 text-white'
                  : risk?.latest?.risk_category === 'High'
                  ? 'bg-orange-100 text-orange-800'
                  : risk?.latest?.risk_category === 'Medium'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-teal-100 text-teal-800'
              }`}
            >
              {risk?.latest?.risk_category ?? 'Low'} Risk
            </span>
          </div>
          <button
            onClick={handleRecalculateRisk}
            disabled={recalculating}
            className="p-2.5 text-slate-600 hover:text-blue-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition shadow-xs"
            title="Recalculate transparent risk score and early warning rules"
          >
            <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="border-b border-slate-200 bg-white rounded-t-xl px-4 flex items-center gap-1 overflow-x-auto shadow-xs">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              {tab.label}
              {tab.id === 'alerts' && activeAlerts.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-red-100 text-red-700 font-bold">
                  {activeAlerts.length}
                </span>
              )}
              {tab.id === 'retention' && openTasks.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-700 font-bold">
                  {openTasks.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT PANELS */}
      <div className="bg-white p-6 rounded-b-xl border border-t-0 border-slate-200 shadow-sm min-h-[480px]">

        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6 text-xs">
            {/* Quick KPI stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block font-medium">Banking Products Held</span>
                <span className="text-xl font-bold text-slate-800">{products.length} Products</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block font-medium">Active EWS Warnings</span>
                <span className="text-xl font-bold text-amber-600">{activeAlerts.length} Active</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block font-medium">Open RM Follow-Up Tasks</span>
                <span className="text-xl font-bold text-blue-600">{openTasks.length} Pending</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block font-medium">Service Complaints Logged</span>
                <span className="text-xl font-bold text-slate-800">{complaints.length} Total</span>
              </div>
            </div>

            {/* Split row: Active warnings vs Pending retention */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Active Warning Indicators */}
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <h3 className="font-bold text-slate-800">Active Early Warning Indicators</h3>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    {activeAlerts.length} Flagged
                  </span>
                </div>
                {activeAlerts.length === 0 ? (
                  <p className="text-slate-400 py-4 text-center">No active warning anomalies detected.</p>
                ) : (
                  <div className="space-y-2">
                    {activeAlerts.map(alt => (
                      <div key={alt.id} className="p-2.5 bg-white rounded-lg border border-amber-100 shadow-xs">
                        <div className="flex items-center justify-between font-semibold text-slate-800">
                          <span>{alt.alert_type}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${alt.severity === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {alt.severity}
                          </span>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5">{alt.observed_value}</p>
                        <p className="text-[10px] text-blue-600 font-medium mt-1">Recommended: {alt.recommended_next_step}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending Retention Recommendations */}
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    <h3 className="font-bold text-slate-800">Recommended Retention Actions</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('retention')}
                    className="text-[11px] font-semibold text-blue-600 hover:underline"
                  >
                    View All →
                  </button>
                </div>
                {recommendations.length === 0 ? (
                  <p className="text-slate-400 py-4 text-center">No pending retention actions required.</p>
                ) : (
                  <div className="space-y-2">
                    {recommendations.slice(0, 3).map(rec => (
                      <div key={rec.id} className="p-2.5 bg-white rounded-lg border border-blue-100 shadow-xs">
                        <div className="flex items-center justify-between font-semibold text-slate-800">
                          <span>{rec.title}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-blue-100 text-blue-700">
                            {rec.priority}
                          </span>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5 line-clamp-2">{rec.description}</p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
                          <span>Status: <strong>{rec.status}</strong></span>
                          <span>Due: <strong>{rec.due_date || 'Standard'}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick 12-month Trend Chart Previews */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              <div className="border border-slate-200 rounded-xl p-4">
                <h4 className="font-bold text-slate-800 mb-2">12-Month Transaction History</h4>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={transactions}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month_year" tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                      <Line type="monotone" dataKey="total_count" stroke="#2563eb" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4">
                <h4 className="font-bold text-slate-800 mb-2">12-Month Operating Balances</h4>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={balances}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month_year" tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip
                        formatter={(val) => [`$${Number(val).toLocaleString()}`, 'Balance']}
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                      />
                      <Line type="monotone" dataKey="closing_balance" stroke="#0d9488" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. TRANSACTIONS TAB */}
        {activeTab === 'transactions' && (
          <div className="space-y-6 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Monthly Transaction History & Contraction Analysis</h3>
                <p className="text-slate-400">Month-over-month volume, turnover, inbound vs outbound, and domestic vs cross-border wire distribution</p>
              </div>
            </div>

            {/* Transaction Trend Line Chart */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={transactions}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month_year" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                    <Legend verticalAlign="top" height={30} />
                    <Line yAxisId="left" type="monotone" dataKey="total_count" name="Total Count" stroke="#2563eb" strokeWidth={2.5} />
                    <Line yAxisId="right" type="monotone" dataKey="total_value" name="Turnover ($)" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Transaction Data Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase">
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-3 text-right">Total Txs</th>
                    <th className="py-2.5 px-3 text-right">MoM Change</th>
                    <th className="py-2.5 px-3 text-right">Decline %</th>
                    <th className="py-2.5 px-3 text-right">Turnover ($)</th>
                    <th className="py-2.5 px-3 text-right">Inbound Count</th>
                    <th className="py-2.5 px-3 text-right">Outbound Count</th>
                    <th className="py-2.5 px-3 text-right">Domestic</th>
                    <th className="py-2.5 px-3 text-right">Cross-Border</th>
                    <th className="py-2.5 px-3 text-center">Alert Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {transactions.map(t => {
                    const decline = t.count_decline_pct;
                    let badge = <span className="text-teal-700 font-medium">Normal / Growth</span>;
                    if (decline > 25) {
                      badge = <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold">High Decline (&gt;25%)</span>;
                    } else if (decline >= 10) {
                      badge = <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">Moderate Decline (10-25%)</span>;
                    }
                    return (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-800">{t.month_year}</td>
                        <td className="py-2 px-3 text-right font-bold">{Number(t.total_count).toLocaleString()}</td>
                        <td className={`py-2 px-3 text-right font-medium ${t.count_mom_change_pct < 0 ? 'text-red-600' : 'text-teal-600'}`}>
                          {t.count_mom_change_pct !== null ? `${t.count_mom_change_pct > 0 ? '+' : ''}${t.count_mom_change_pct}%` : 'N/A'}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-red-600">
                          {t.count_decline_pct !== null ? `${t.count_decline_pct}%` : 'N/A'}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold">${Number(t.total_value).toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-slate-500">{t.inbound_count}</td>
                        <td className="py-2 px-3 text-right text-slate-500">{t.outbound_count}</td>
                        <td className="py-2 px-3 text-right text-slate-500">{t.domestic_count}</td>
                        <td className="py-2 px-3 text-right text-slate-500">{t.international_count}</td>
                        <td className="py-2 px-3 text-center">{badge}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. OPERATING BALANCES TAB */}
        {activeTab === 'balances' && (
          <div className="space-y-6 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Operating Balance Analytics & Moving Average Tracking</h3>
                <p className="text-slate-400">Closing balance trends, 3-month Simple Moving Average (SMA-3), 6-month SMA, and sustained capital outflow duration</p>
              </div>
            </div>

            {/* Balance Trend Line Chart */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={balances}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month_year" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip formatter={(val) => [`$${Number(val).toLocaleString()}`, 'Balance']} contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                    <Legend verticalAlign="top" height={30} />
                    <Line type="monotone" dataKey="closing_balance" name="Closing Balance" stroke="#0d9488" strokeWidth={2.5} />
                    <Line type="monotone" dataKey="average_balance" name="Average Balance" stroke="#6366f1" strokeDasharray="3 3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Operating Balances Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase">
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-3 text-right">Closing Balance</th>
                    <th className="py-2.5 px-3 text-right">Average Balance</th>
                    <th className="py-2.5 px-3 text-right">Balance Decline %</th>
                    <th className="py-2.5 px-3 text-right">3-Month SMA</th>
                    <th className="py-2.5 px-3 text-right">SMA-3 Deviation</th>
                    <th className="py-2.5 px-3 text-center">Sustained Outflow</th>
                    <th className="py-2.5 px-3 text-center">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {balances.map(b => {
                    const decline = b.balance_decline_pct;
                    let badge = <span className="text-teal-700 font-medium">Normal</span>;
                    if (decline > 20) {
                      badge = <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold">High Decline (&gt;20%)</span>;
                    } else if (decline >= 10) {
                      badge = <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">Moderate (10-20%)</span>;
                    }
                    return (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-800">{b.month_year}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">${Number(b.closing_balance).toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-slate-500">${Number(b.average_balance).toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-medium text-red-600">
                          {b.balance_decline_pct !== null ? `${b.balance_decline_pct}%` : 'N/A'}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600">
                          {b.sma_3_month ? `$${Number(b.sma_3_month).toLocaleString()}` : 'Insufficient Data'}
                        </td>
                        <td className="py-2 px-3 text-right font-medium">
                          {b.sma_3_deviation_pct !== null ? `${b.sma_3_deviation_pct}%` : 'N/A'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {b.sustained_decline_months > 0 ? (
                            <span className="font-bold text-red-600">{b.sustained_decline_months} months</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">{badge}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. PRODUCT UTILIZATION TAB */}
        {activeTab === 'products' && (
          <div className="space-y-6 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Corporate Banking Products & Utilization</h3>
                <p className="text-slate-400">Credit lines, treasury facilities, trade finance, and cash management utility metrics</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(p => (
                <div key={p.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{p.product_name}</h4>
                      <span className="text-[10px] text-slate-400">{p.product_category}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.status === 'Active'
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                      <span>Facility Utilization</span>
                      <span>{p.utilization_pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          p.utilization_pct < 20 ? 'bg-red-500' : p.utilization_pct < 45 ? 'bg-amber-500' : 'bg-teal-500'
                        }`}
                        style={{ width: `${Math.min(100, p.utilization_pct)}%` }}
                      ></div>
                    </div>
                  </div>

                  {p.credit_limit && (
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200/60">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Credit Line</span>
                        <strong className="text-slate-800">${(Number(p.credit_limit) / 1000000).toFixed(1)}M</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Outstanding</span>
                        <strong className="text-slate-800">${(Number(p.outstanding_balance) / 1000000).toFixed(1)}M</strong>
                      </div>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400">
                    Last commercial activity: {p.last_activity_date}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. COMPLAINTS TAB */}
        {activeTab === 'complaints' && (
          <div className="space-y-6 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Customer Complaints & Operational Issues</h3>
                <p className="text-slate-400">Tracked service disruptions, fee disputes, and operational escalation turnaround times</p>
              </div>
            </div>

            {complaints.length === 0 ? (
              <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                No service complaints on file for this corporate client. Excellent service track record.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase">
                      <th className="py-2.5 px-3">Ticket</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Severity</th>
                      <th className="py-2.5 px-3">Reported Date</th>
                      <th className="py-2.5 px-3">Summary</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Resolution Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {complaints.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-800">{c.complaint_ticket}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">{c.category}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              c.severity === 'Critical'
                                ? 'bg-red-100 text-red-700'
                                : c.severity === 'High'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {c.severity}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{c.reported_date}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800 max-w-sm truncate">{c.summary}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              c.status === 'Resolved' || c.status === 'Closed'
                                ? 'bg-teal-100 text-teal-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{c.resolution_date || 'Pending resolution'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 6. RISK ANALYSIS TAB */}
        {activeTab === 'risk' && (
          <div className="space-y-6 text-xs">
            {/* Transparent Disclaimer Box */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3 text-blue-900">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold mb-0.5">Transparent Deterministic Scoring Methodology</strong>
                <p className="text-[11px] leading-relaxed">
                  A risk score of {risk?.latest?.risk_score}/100 represents {risk?.latest?.risk_score} points accumulated out of 100 on our rule-based early warning severity index. <strong>It is strictly NOT a probability of attrition.</strong> No black-box machine learning or predictive algorithms are used. Every single point contributed is accounted for below with observed values against configured baseline thresholds.
                </p>
              </div>
            </div>

            {/* Explanation Breakdown Table */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-3">Line-by-Line Risk Factor Attribution</h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase">
                      <th className="py-2.5 px-3">Warning Indicator</th>
                      <th className="py-2.5 px-3">Observed Value</th>
                      <th className="py-2.5 px-3">Historical Baseline</th>
                      <th className="py-2.5 px-3">Threshold Applied</th>
                      <th className="py-2.5 px-3 text-center">Points Contributed</th>
                      <th className="py-2.5 px-3">Deterministic Explanation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {risk?.details?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400">
                          No active risk rules currently triggered for this corporate client.
                        </td>
                      </tr>
                    ) : (
                      risk?.details?.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{d.indicator_name}</td>
                          <td className="py-2.5 px-3 font-bold text-red-600">{d.observed_value}</td>
                          <td className="py-2.5 px-3 text-slate-500">{d.baseline_value}</td>
                          <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">{d.threshold_applied}</td>
                          <td className="py-2.5 px-3 text-center font-bold">
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                              +{d.points_contributed} pts
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 max-w-sm">{d.explanation}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Historical Score Progression Chart */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <h4 className="font-bold text-slate-800 mb-2">Historical Risk Score Trajectory</h4>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={risk?.history || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="assessment_date" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                    <Line type="stepAfter" dataKey="risk_score" name="Risk Score (0-100)" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* 7. ALERTS TAB */}
        {activeTab === 'alerts' && (
          <div className="space-y-6 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Early Warning Alerts</h3>
                <p className="text-slate-400">Manage early warning triggers, acknowledge alerts, assign relationship managers, or dismiss false warnings</p>
              </div>
            </div>

            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  No early warning alerts detected.
                </div>
              ) : (
                alerts.map(alt => (
                  <div
                    key={alt.id}
                    className={`p-4 rounded-xl border transition ${
                      alt.status === 'Resolved' || alt.status === 'Dismissed'
                        ? 'bg-slate-50 border-slate-200 opacity-70'
                        : alt.severity === 'Critical'
                        ? 'bg-red-50/30 border-red-200'
                        : 'bg-amber-50/30 border-amber-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-500 font-semibold">{alt.alert_uid}</span>
                        <h4 className="font-bold text-slate-900 text-sm">{alt.alert_type}</h4>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            alt.severity === 'Critical'
                              ? 'bg-red-600 text-white'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {alt.severity}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-700">
                          Status: {alt.status}
                        </span>

                        {alt.status === 'Active' && (
                          <button
                            onClick={() => handleAcknowledgeAlert(alt.id)}
                            className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded text-slate-700 font-semibold transition"
                          >
                            Acknowledge
                          </button>
                        )}

                        {['Active', 'Acknowledged', 'Under Review'].includes(alt.status) && (
                          <>
                            <button
                              onClick={() => { setResolvingAlertId(alt.id); setResolutionNotes(''); }}
                              className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded font-semibold transition shadow-xs"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() => { setDismissingAlertId(alt.id); setDismissalReason(''); }}
                              className="px-2.5 py-1 text-slate-500 hover:text-red-600 hover:bg-white rounded transition"
                            >
                              Dismiss False Alert
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 bg-white/70 p-2.5 rounded-lg border border-slate-100">
                      <div>Observed: <strong>{alt.observed_value}</strong></div>
                      <div>Baseline: <strong>{alt.historical_baseline}</strong></div>
                      <div>Threshold: <strong>{alt.threshold}</strong></div>
                    </div>

                    <p className="mt-2 text-[11px] text-blue-700 font-medium">
                      Next Step: {alt.recommended_next_step}
                    </p>

                    {alt.resolution_notes && (
                      <p className="mt-1 text-[11px] text-teal-800 font-medium">
                        Resolution Notes: {alt.resolution_notes}
                      </p>
                    )}
                    {alt.dismissal_reason && (
                      <p className="mt-1 text-[11px] text-slate-500 italic">
                        Dismissal Reason: {alt.dismissal_reason}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 8. RETENTION ACTIONS TAB */}
        {activeTab === 'retention' && (
          <div className="space-y-6 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Retention Follow-Up Tasks & Interventions</h3>
                <p className="text-slate-400">Structured relationship manager follow-ups, customer feedback logging, and outcome evaluation</p>
              </div>
              <button
                onClick={() => setShowTaskModal(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1.5 transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Assign Follow-Up Task
              </button>
            </div>

            {/* Task list */}
            <div className="space-y-3">
              {retentionTasks.length === 0 ? (
                <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  No retention tasks created. Click &quot;Assign Follow-Up Task&quot; above to create one.
                </div>
              ) : (
                retentionTasks.map(t => (
                  <div key={t.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400 font-semibold">{t.task_uid}</span>
                        <h4 className="font-bold text-slate-900 text-sm">{t.title}</h4>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.priority === 'Urgent'
                              ? 'bg-red-600 text-white'
                              : t.priority === 'High'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </div>

                      {/* Status Dropdown */}
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px]">Status:</span>
                        <select
                          value={t.status}
                          onChange={(e) => handleUpdateTaskStatus(t.id, e.target.value)}
                          className="bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                          <option value="Overdue">Overdue</option>
                        </select>
                      </div>
                    </div>

                    <p className="text-slate-600">{t.description || 'Client follow-up scheduled with relationship manager.'}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-2 border-t border-slate-200/60 text-slate-500">
                      <div>Assigned RM: <strong className="text-slate-700">{t.rm_name || 'Marcus Vance'}</strong></div>
                      <div>Due Date: <strong className="text-slate-700">{t.due_date}</strong></div>
                      <div>Recorded Outcome: <strong className="text-teal-700">{t.recorded_outcome || 'Pending'}</strong></div>
                    </div>

                    {/* Outcome Recording Options if completed */}
                    {t.status === 'Completed' && (
                      <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg flex flex-wrap items-center justify-between gap-3">
                        <span className="font-semibold text-teal-900">Recorded Customer Reaction / Outcome:</span>
                        <select
                          value={t.recorded_outcome || 'Pending evaluation'}
                          onChange={(e) => handleUpdateTaskStatus(t.id, 'Completed', e.target.value)}
                          className="bg-white border border-teal-300 rounded px-2 py-1 text-teal-900 font-bold text-xs"
                        >
                          <option value="Pending evaluation">Pending evaluation</option>
                          <option value="Improved transaction activity">Improved transaction activity</option>
                          <option value="Improved operating balances">Improved operating balances</option>
                          <option value="Resolved complaints">Resolved complaints</option>
                          <option value="Improved product utilization">Improved product utilization</option>
                          <option value="No material improvement">No material improvement</option>
                          <option value="Actual attrition">Actual attrition</option>
                        </select>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 9. ACTIVITY TIMELINE TAB */}
        {activeTab === 'timeline' && (
          <div className="space-y-6 text-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Customer Activity & Retention Timeline</h3>
              <p className="text-slate-400">Complete chronological audit trail generated from real application activities</p>
            </div>

            <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 py-2">
              {timelineEvents.length === 0 ? (
                <div className="pl-6 text-slate-400">No events logged for this customer.</div>
              ) : (
                timelineEvents.map((evt, idx) => (
                  <div key={idx} className="relative pl-6 group">
                    {/* Timeline Node Dot */}
                    <div
                      className={`absolute -left-[9px] top-0.5 w-4 h-4 rounded-full border-2 border-white shadow-xs ${
                        evt.category === 'danger'
                          ? 'bg-red-600'
                          : evt.category === 'warning'
                          ? 'bg-amber-500'
                          : evt.category === 'success'
                          ? 'bg-teal-500'
                          : 'bg-blue-600'
                      }`}
                    ></div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 hover:bg-slate-100/70 transition shadow-xs">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="font-bold text-slate-900 text-xs">{evt.title}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">{evt.timestamp}</span>
                      </div>
                      <p className="text-slate-600 text-[11px]">{evt.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>

      {/* Modal: Create Retention Task */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-800">Create Follow-Up Retention Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Schedule Liquidity Review with CFO"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  required
                  value={newTaskDue}
                  onChange={(e) => setNewTaskDue(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-xs"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Resolve Alert */}
      {resolvingAlertId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-800">Resolve Early Warning Alert</h3>
            <form onSubmit={handleResolveAlert} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remediation & Resolution Notes *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detail actions taken to stabilize customer activity or address operational disruption..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResolvingAlertId(null)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 shadow-xs"
                >
                  Confirm Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Dismiss Alert */}
      {dismissingAlertId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-red-600">Dismiss False Early Warning Alert</h3>
            <p className="text-slate-500 text-[11px]">
              Dismissals are logged in regulatory audit trails. A clear rationale must be recorded explaining why this anomaly does not pose attrition risk.
            </p>
            <form onSubmit={handleDismissAlert} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Dismissal *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Verified planned seasonal inventory drawdown; verified client confirmed scheduled rebound next month..."
                  value={dismissalReason}
                  onChange={(e) => setDismissalReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDismissingAlertId(null)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 shadow-xs"
                >
                  Confirm Dismissal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
