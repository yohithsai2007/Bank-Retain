import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  UserCheck,
  RefreshCw,
  Clock,
  Building,
  ShieldAlert,
  ChevronRight,
  Info,
} from 'lucide-react';
import { alertApi, settingsApi } from '../services/api';

const SEVERITY_COLORS = {
  Critical: 'bg-red-600 text-white',
  High: 'bg-orange-100 text-orange-800 border border-orange-200',
  Medium: 'bg-amber-100 text-amber-800 border border-amber-200',
  Low: 'bg-slate-100 text-slate-700 border border-slate-200',
};

const STATUS_TABS = ['All', 'Active', 'Acknowledged', 'Under Review', 'Resolved', 'Dismissed'];
const SEVERITIES = ['All', 'Critical', 'High', 'Medium', 'Low'];

export default function AlertsPage() {
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rms, setRms] = useState([]);

  // Filters
  const [status, setStatus] = useState('All');
  const [severity, setSeverity] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Modals state
  const [assigningAlert, setAssigningAlert] = useState(null);
  const [selectedRmId, setSelectedRmId] = useState('');

  const [resolvingAlert, setResolvingAlert] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const [dismissingAlert, setDismissingAlert] = useState(null);
  const [dismissalReason, setDismissalReason] = useState('');

  useEffect(() => {
    settingsApi.getRelationshipManagers()
      .then(res => { if (res?.data) setRms(res.data); })
      .catch(() => {});
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await alertApi.getAlerts({
        status,
        severity,
        search,
        page,
        limit: 15,
      });
      setAlerts(res.data || []);
      setPagination(res.pagination || { total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [status, severity, search, page]);

  const handleAcknowledge = async (id) => {
    try {
      await alertApi.acknowledge(id);
      fetchAlerts();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRmId) return;
    try {
      await alertApi.assign(assigningAlert.id, selectedRmId);
      setAssigningAlert(null);
      fetchAlerts();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    try {
      await alertApi.resolve(resolvingAlert.id, resolutionNotes);
      setResolvingAlert(null);
      setResolutionNotes('');
      fetchAlerts();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDismissSubmit = async (e) => {
    e.preventDefault();
    if (!dismissalReason || dismissalReason.trim().length < 5) {
      alert('A valid reason is required to dismiss early warning alerts.');
      return;
    }
    try {
      await alertApi.dismiss(dismissingAlert.id, dismissalReason);
      setDismissingAlert(null);
      setDismissalReason('');
      fetchAlerts();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Early Warning System (EWS)</h2>
          <p className="text-xs text-slate-500">
            Automated detection across 10 deterministic behavioural rules with escalation safeguards and audit trails
          </p>
        </div>
        <button
          onClick={fetchAlerts}
          className="p-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-xs"
          title="Refresh alerts"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter and Status Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-3">
          <span className="text-xs font-semibold text-slate-400 mr-2">Status:</span>
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => { setStatus(tab); setPage(1); }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                status === tab
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Severity & Search filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="sm:col-span-2 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by company, customer ID, alert ID, rule type..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <select
              value={severity}
              onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
            >
              {SEVERITIES.map(s => <option key={s} value={s}>{s === 'All' ? 'All Severities' : `${s} Severity`}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Alert ID</th>
                <th className="py-3 px-4">Corporate Client</th>
                <th className="py-3 px-4">Warning Trigger</th>
                <th className="py-3 px-4">Observed Metric</th>
                <th className="py-3 px-4">Baseline / Threshold</th>
                <th className="py-3 px-4 text-center">Severity</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Assigned RM</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Scanning early warning system...
                  </td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No early warning alerts matching filter criteria.
                  </td>
                </tr>
              ) : (
                alerts.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-medium text-slate-500">
                      {a.alert_uid}
                      {a.is_escalated && (
                        <span className="block text-[9px] text-red-600 font-bold uppercase">Escalated</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <button
                        onClick={() => navigate(`/customers/${a.customer_id}`)}
                        className="hover:text-blue-600 text-left transition flex items-center gap-1"
                      >
                        {a.company_name} <ChevronRight className="w-3 h-3 text-slate-400" />
                      </button>
                      <span className="text-[10px] text-slate-400 font-normal">{a.customer_id} • {a.industry}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{a.alert_type}</div>
                      <div className="text-[10px] text-slate-400 max-w-xs line-clamp-1">{a.recommended_next_step}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-red-600">
                      {a.observed_value}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      <div>Base: {a.historical_baseline}</div>
                      <div className="text-[10px] text-slate-400">Thresh: {a.threshold}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${SEVERITY_COLORS[a.severity] || 'bg-slate-100 text-slate-800'}`}>
                        {a.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-semibold">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] ${
                          a.status === 'Resolved'
                            ? 'bg-teal-100 text-teal-800'
                            : a.status === 'Dismissed'
                            ? 'bg-slate-100 text-slate-500'
                            : a.status === 'Under Review'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {a.rm_name || 'Unassigned'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {a.status === 'Active' && (
                          <button
                            onClick={() => handleAcknowledge(a.id)}
                            className="px-2 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded transition"
                          >
                            Acknowledge
                          </button>
                        )}

                        {['Active', 'Acknowledged', 'Under Review'].includes(a.status) && (
                          <>
                            <button
                              onClick={() => { setAssigningAlert(a); setSelectedRmId(a.rm_id || rms[0]?.id || ''); }}
                              className="px-2 py-1 text-[11px] text-blue-600 hover:bg-blue-50 rounded transition font-semibold"
                            >
                              Assign
                            </button>
                            <button
                              onClick={() => { setResolvingAlert(a); setResolutionNotes(''); }}
                              className="px-2 py-1 text-[11px] bg-teal-600 hover:bg-teal-700 text-white rounded font-semibold transition"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() => { setDismissingAlert(a); setDismissalReason(''); }}
                              className="px-1.5 py-1 text-[11px] text-slate-400 hover:text-red-600 rounded transition"
                              title="Dismiss false warning"
                            >
                              Dismiss
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
          <span>
            Showing page {page} of {pagination.totalPages || 1} ({pagination.total} early warning records)
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Assign Alert to RM */}
      {assigningAlert && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl p-6 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-800">Assign Alert to Relationship Manager</h3>
            <p className="text-slate-500 text-[11px]">
              Assigning {assigningAlert.alert_type} for <strong>{assigningAlert.company_name}</strong>.
            </p>
            <form onSubmit={handleAssignSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Relationship Manager</label>
                <select
                  value={selectedRmId}
                  onChange={(e) => setSelectedRmId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                >
                  {rms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.region})</option>)}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAssigningAlert(null)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-xs"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Resolve Alert */}
      {resolvingAlert && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-800">Resolve Early Warning</h3>
            <p className="text-slate-500 text-[11px]">
              Record the commercial resolution or operational remediation undertaken for <strong>{resolvingAlert.company_name}</strong>.
            </p>
            <form onSubmit={handleResolveSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Resolution Summary *</label>
                <textarea
                  required
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Conducted liquidity review; corporate treasurer agreed to maintain balances under restructured sweeping facility..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResolvingAlert(null)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 shadow-xs"
                >
                  Resolve Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Dismiss Alert */}
      {dismissingAlert && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-red-600">Dismiss False Early Warning Alert</h3>
            <p className="text-slate-500 text-[11px]">
              Dismissals are logged in regulatory audit trails. A clear rationale must be recorded explaining why this anomaly does not pose attrition risk.
            </p>
            <form onSubmit={handleDismissSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Dismissal *</label>
                <textarea
                  required
                  rows={3}
                  value={dismissalReason}
                  onChange={(e) => setDismissalReason(e.target.value)}
                  placeholder="e.g. One-time corporate acquisition payment; verified client confirmed normal payroll operations resumed..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDismissingAlert(null)}
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
