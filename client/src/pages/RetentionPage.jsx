import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck,
  Search,
  Filter,
  Clock,
  AlertCircle,
  Plus,
  RefreshCw,
  Building,
  CheckCircle2,
  Calendar,
  MessageSquare,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { taskApi, settingsApi } from '../services/api';

const TASK_STATUSES = ['All', 'Open', 'In Progress', 'Completed', 'Overdue', 'Cancelled'];
const PRIORITIES = ['All', 'Urgent', 'High', 'Medium', 'Low'];

const OUTCOMES = [
  'Pending evaluation',
  'Improved transaction activity',
  'Improved operating balances',
  'Resolved complaints',
  'Improved product utilization',
  'No material improvement',
  'Actual attrition',
];

export default function RetentionPage() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rms, setRms] = useState([]);

  // Filters
  const [status, setStatus] = useState('All');
  const [priority, setPriority] = useState('All');
  const [rmId, setRmId] = useState('All');
  const [search, setSearch] = useState('');
  const [isOverdueOnly, setIsOverdueOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Update outcome/status modal state
  const [editingTask, setEditingTask] = useState(null);
  const [taskStatus, setTaskStatus] = useState('Open');
  const [taskFeedback, setTaskFeedback] = useState('');
  const [taskIntervention, setTaskIntervention] = useState('');
  const [taskOutcome, setTaskOutcome] = useState('Pending evaluation');
  const [savingTask, setSavingTask] = useState(false);

  useEffect(() => {
    settingsApi.getRelationshipManagers()
      .then(res => { if (res?.data) setRms(res.data); })
      .catch(() => {});
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await taskApi.getTasks({
        status,
        priority,
        rmId,
        isOverdue: isOverdueOnly,
        search,
        page,
        limit: 15,
      });
      setTasks(res.data || []);
      setPagination(res.pagination || { total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load retention tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [status, priority, rmId, isOverdueOnly, search, page]);

  const handleOpenEdit = (t) => {
    setEditingTask(t);
    setTaskStatus(t.status);
    setTaskFeedback(t.customer_feedback || '');
    setTaskIntervention(t.completed_interventions || '');
    setTaskOutcome(t.recorded_outcome || 'Pending evaluation');
  };

  const handleSaveTaskUpdates = async (e) => {
    e.preventDefault();
    if (!editingTask) return;
    setSavingTask(true);
    try {
      await taskApi.update(editingTask.id, {
        status: taskStatus,
        customerFeedback: taskFeedback,
        completedInterventions: taskIntervention,
        recordedOutcome: taskOutcome,
        outcomeEvaluationDate: taskOutcome !== 'Pending evaluation' ? new Date().toISOString().split('T')[0] : null,
      });
      setEditingTask(null);
      fetchTasks();
    } catch (err) {
      alert(err.message || 'Failed to update task.');
    } finally {
      setSavingTask(false);
    }
  };

  const overdueCount = tasks.filter(t => t.is_overdue_flag === 1).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Retention Management & Follow-Up Tasks</h2>
          <p className="text-xs text-slate-500">
            Relationship manager follow-ups • Structured client interventions • Customer feedback and outcome recording
          </p>
        </div>
        <button
          onClick={fetchTasks}
          className="p-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-xs"
          title="Refresh tasks"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Prominent Overdue Tasks Banner */}
      {overdueCount > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <div className="text-xs text-red-900">
              <strong className="font-bold">{overdueCount} Retention Tasks are Overdue!</strong>
              <p className="text-[11px] text-red-700 mt-0.5">
                Target follow-up dates have passed without recorded commercial contact. Prioritize reaching out to these clients.
              </p>
            </div>
          </div>
          <button
            onClick={() => { setIsOverdueOnly(!isOverdueOnly); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              isOverdueOnly ? 'bg-red-700 text-white' : 'bg-red-200 text-red-900 hover:bg-red-300'
            }`}
          >
            {isOverdueOnly ? 'Show All Tasks' : 'Filter Overdue Tasks Only'}
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        {/* Status tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-3">
          <span className="text-xs font-semibold text-slate-400 mr-2">Status:</span>
          {TASK_STATUSES.map(s => (
            <button
              key={s}
              onClick={() => { setStatus(s); setIsOverdueOnly(false); setPage(1); }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                status === s && !isOverdueOnly
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Priority, RM & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search tasks by client or title..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <select
              value={priority}
              onChange={(e) => { setPriority(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
            >
              {PRIORITIES.map(p => <option key={p} value={p}>{p === 'All' ? 'All Priorities' : `${p} Priority`}</option>)}
            </select>
          </div>

          <div>
            <select
              value={rmId}
              onChange={(e) => { setRmId(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Relationship Managers</option>
              {rms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Task UID</th>
                <th className="py-3 px-4">Corporate Client</th>
                <th className="py-3 px-4">Intervention Title</th>
                <th className="py-3 px-4">Assigned RM</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-center">Priority</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Recorded Outcome</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading retention tasks...
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No retention follow-up tasks match the selected criteria.
                  </td>
                </tr>
              ) : (
                tasks.map(t => {
                  const isOverdue = t.is_overdue_flag === 1;
                  return (
                    <tr key={t.id} className={`hover:bg-slate-50 transition ${isOverdue ? 'bg-red-50/20' : ''}`}>
                      <td className="py-3 px-4 font-mono font-medium text-slate-500">{t.task_uid}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <button
                          onClick={() => navigate(`/customers/${t.customer_id}`)}
                          className="hover:text-blue-600 transition text-left"
                        >
                          {t.company_name}
                        </button>
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {t.customer_id} • Risk: {t.risk_score}/100
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{t.title}</div>
                        <div className="text-[10px] text-slate-400 max-w-xs truncate">{t.description}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{t.rm_name || 'Unassigned'}</td>
                      <td className="py-3 px-4 font-medium">
                        <span className={isOverdue ? 'text-red-600 font-bold' : 'text-slate-700'}>
                          {t.due_date}
                        </span>
                        {isOverdue && <span className="block text-[9px] text-red-600 font-bold uppercase">Overdue</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.priority === 'Urgent'
                              ? 'bg-red-600 text-white'
                              : t.priority === 'High'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.status === 'Completed'
                              ? 'bg-teal-100 text-teal-800'
                              : t.status === 'Overdue'
                              ? 'bg-red-100 text-red-800'
                              : t.status === 'In Progress'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {t.recorded_outcome || 'Pending evaluation'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(t)}
                          className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded transition"
                        >
                          Update Task
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
          <span>
            Showing page {page} of {pagination.totalPages || 1} ({pagination.total} retention tasks)
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

      {/* Modal: Update Task, Feedback, Interventions & Recorded Outcome */}
      {editingTask && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Update Retention Task</h3>
                <span className="text-[11px] text-slate-500">
                  {editingTask.task_uid} • {editingTask.company_name}
                </span>
              </div>
              <button onClick={() => setEditingTask(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSaveTaskUpdates} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={taskStatus}
                  onChange={(e) => setTaskStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Completed Interventions</label>
                <textarea
                  rows={2}
                  value={taskIntervention}
                  onChange={(e) => setTaskIntervention(e.target.value)}
                  placeholder="e.g. Conducted executive liquidity review with corporate treasurer; presented revised sweeping structure..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Reaction & Feedback</label>
                <textarea
                  rows={2}
                  value={taskFeedback}
                  onChange={(e) => setTaskFeedback(e.target.value)}
                  placeholder="e.g. Client CFO confirmed acceptance of revised terms; requested follow-up next quarter..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Recorded Retention Outcome</label>
                <select
                  value={taskOutcome}
                  onChange={(e) => setTaskOutcome(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-teal-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Note: A recorded improvement does not necessarily imply direct causality from the banking intervention.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTask}
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-xs"
                >
                  {savingTask ? 'Saving...' : 'Save Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
