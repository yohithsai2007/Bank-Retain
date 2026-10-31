import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Info,
  ChevronRight,
  TrendingDown,
  Building,
  CheckCircle2,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { riskApi } from '../services/api';

const RISK_BADGES = {
  Critical: 'bg-red-600 text-white',
  High: 'bg-orange-100 text-orange-800 border border-orange-200',
  Medium: 'bg-amber-100 text-amber-800 border border-amber-200',
  Low: 'bg-teal-100 text-teal-800 border border-teal-200',
};

export default function RiskPage() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recalculatingAll, setRecalculatingAll] = useState(false);

  // Filters
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Explainability Drawer/Modal state
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [explanationData, setExplanationData] = useState(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  const fetchRiskCustomers = async () => {
    setLoading(true);
    try {
      const res = await riskApi.getRiskCustomers({
        category,
        search,
        page,
        limit: 15,
      });
      setCustomers(res.data || []);
      setPagination(res.pagination || { total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load risk customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskCustomers();
  }, [category, search, page]);

  const handleRecalculateAll = async () => {
    if (!window.confirm('Trigger batch recalculation of transparent risk scores, early warning alerts, and retention recommendations for all corporate customers?')) {
      return;
    }
    setRecalculatingAll(true);
    try {
      const res = await riskApi.recalculateAll();
      alert(res.message || 'Recalculation finished.');
      fetchRiskCustomers();
    } catch (err) {
      alert(err.message || 'Batch recalculation failed.');
    } finally {
      setRecalculatingAll(false);
    }
  };

  const handleOpenExplanation = async (customerId) => {
    setSelectedCustomerId(customerId);
    setLoadingExplanation(true);
    try {
      const res = await riskApi.getCustomerAnalysis(customerId);
      setExplanationData(res.data);
    } catch (err) {
      alert(err.message || 'Failed to fetch explanation.');
      setSelectedCustomerId(null);
    } finally {
      setLoadingExplanation(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Attrition Risk Analysis</h2>
          <p className="text-xs text-slate-500">
            Explainable rule-based risk ranking • Cumulative early-warning scoring (0–100) • Transparent factor attribution
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRecalculateAll}
            disabled={recalculatingAll}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${recalculatingAll ? 'animate-spin text-blue-400' : ''}`} />
            {recalculatingAll ? 'Recalculating Entire Portfolio...' : 'Recalculate All Risk Scores'}
          </button>
        </div>
      </div>

      {/* Disclaimers & Methodology Banner */}
      <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl flex items-start gap-3 text-blue-900 text-xs">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-sm block">Transparent, Non-Predictive Risk Architecture</span>
          <p className="leading-relaxed text-[11px] text-blue-800">
            A score of 80/100 reflects 80 points accumulated from satisfied early-warning business conditions (e.g. transaction drops, balance outflows, severe complaints). <strong>It is strictly NOT an 80% statistical probability of client attrition.</strong> All rule points and thresholds are auditable, verifiable, and configured by risk policy.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="font-semibold text-slate-400 mr-2">Category:</span>
          {['All', 'Critical', 'High', 'Medium', 'Low'].map(cat => (
            <button
              key={cat}
              onClick={() => { setCategory(cat); setPage(1); }}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                category === cat
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search company or ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Risk Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Customer ID</th>
                <th className="py-3 px-4">Company Name</th>
                <th className="py-3 px-4">Industry Sector</th>
                <th className="py-3 px-4">Relationship Manager</th>
                <th className="py-3 px-4 text-center">Score Progress</th>
                <th className="py-3 px-4 text-center">Score / 100</th>
                <th className="py-3 px-4 text-center">Risk Category</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Calculating portfolio risk rankings...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No customers found matching current risk category.
                  </td>
                </tr>
              ) : (
                customers.map(c => (
                  <tr key={c.customer_id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-medium text-slate-500">
                      {c.customer_id}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {c.company_name}
                      <span className="block text-[10px] text-slate-400 font-normal">{c.business_segment} • {c.region}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{c.industry}</td>
                    <td className="py-3 px-4 text-slate-600">{c.rm_name || 'Unassigned'}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="w-28 mx-auto h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            c.risk_score >= 80
                              ? 'bg-red-600'
                              : c.risk_score >= 60
                              ? 'bg-orange-500'
                              : c.risk_score >= 30
                              ? 'bg-amber-500'
                              : 'bg-teal-500'
                          }`}
                          style={{ width: `${Math.min(100, c.risk_score)}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-black text-slate-800 text-sm">
                      {c.risk_score}
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] ${RISK_BADGES[c.risk_category] || 'bg-slate-100 text-slate-700'}`}>
                        {c.risk_category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenExplanation(c.customer_id)}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded transition"
                        >
                          Explain Score
                        </button>
                        <button
                          onClick={() => navigate(`/customers/${c.customer_id}`)}
                          className="p-1 text-slate-400 hover:text-slate-800"
                          title="Full customer profile"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
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
            Showing page {page} of {pagination.totalPages || 1} ({pagination.total} evaluated corporate clients)
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

      {/* Explainable Risk Modal */}
      {selectedCustomerId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Transparent Risk Breakdown: {explanationData?.customer?.company_name}
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Client ID: {explanationData?.customer?.id} • {explanationData?.customer?.industry}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomerId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {loadingExplanation ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                  Generating transparent factor attribution...
                </div>
              ) : (
                <>
                  {/* Score Summary Box */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[11px] font-semibold">Total Rule-Based Score</span>
                      <div className="text-2xl font-black text-slate-900">
                        {explanationData?.assessment?.risk_score}/100
                        <span className="text-xs font-bold ml-2 text-red-600">
                          ({explanationData?.assessment?.risk_category} Risk)
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-slate-500">
                      <div>Version: <strong>{explanationData?.assessment?.scoring_version}</strong></div>
                      <div>Evaluated: <strong>{explanationData?.assessment?.assessment_date}</strong></div>
                    </div>
                  </div>

                  {/* Factor Attribution Table */}
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs mb-2">Triggered Warning Conditions</h4>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold text-[10px] uppercase">
                            <th className="py-2 px-3">Rule Name</th>
                            <th className="py-2 px-3">Observed Value</th>
                            <th className="py-2 px-3">Baseline</th>
                            <th className="py-2 px-3">Threshold</th>
                            <th className="py-2 px-3 text-center">Points</th>
                            <th className="py-2 px-3">Explanation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {explanationData?.explanationTable?.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-semibold text-slate-800">{item.indicator_name}</td>
                              <td className="py-2 px-3 font-bold text-red-600">{item.observed_value}</td>
                              <td className="py-2 px-3 text-slate-500">{item.baseline_value}</td>
                              <td className="py-2 px-3 font-mono text-[10px]">{item.threshold_applied}</td>
                              <td className="py-2 px-3 text-center font-bold text-red-700">+{item.points_contributed}</td>
                              <td className="py-2 px-3 text-slate-600 max-w-xs">{item.explanation}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Score Trajectory Chart */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                    <h4 className="font-bold text-slate-800 text-xs mb-2">Historical Score Trajectory</h4>
                    <div className="h-40 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={explanationData?.scoreHistory || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="assessment_date" tick={{ fontSize: 9, fill: '#64748b' }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                          <Line type="stepAfter" dataKey="risk_score" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 italic">
                    {explanationData?.disclaimer}
                  </p>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <button
                onClick={() => {
                  const id = selectedCustomerId;
                  setSelectedCustomerId(null);
                  navigate(`/customers/${id}`);
                }}
                className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
              >
                Go to Full Customer Profile <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setSelectedCustomerId(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
