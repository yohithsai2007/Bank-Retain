import React, { useState, useEffect } from 'react';
import {
  Target,
  Plus,
  BarChart2,
  CheckCircle2,
  TrendingUp,
  Percent,
  DollarSign,
  Users,
  Shield,
  RefreshCw,
  Info,
  Calendar,
  X,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { campaignApi } from '../services/api';

const INTERVENTION_TYPES = [
  'RM Outreach',
  'Service Issue Resolution',
  'Cash Management Review',
  'Digital Banking Assistance',
  'Product Suitability Review',
  'Eligible Loyalty Offers',
];

const SEGMENTS = ['All Segments', 'Enterprise', 'Mid-Corporate', 'Commercial', 'SME Corporate'];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected campaign for statistical evaluation
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [campaignAnalysis, setCampaignAnalysis] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // New Campaign Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    objective: '',
    targetSegment: 'All Segments',
    interventionType: 'RM Outreach',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
    budget: '50000',
    evaluationWindowDays: 90,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await campaignApi.getCampaigns();
      const list = res.data || [];
      setCampaigns(list);
      if (list.length > 0 && !selectedCampaignId) {
        setSelectedCampaignId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Fetch campaign analysis when selectedCampaignId changes
  useEffect(() => {
    if (!selectedCampaignId) return;
    setLoadingAnalysis(true);
    campaignApi.getAnalysis(selectedCampaignId)
      .then(res => setCampaignAnalysis(res.data))
      .catch(err => console.error('Failed to load analysis:', err))
      .finally(() => setLoadingAnalysis(false));
  }, [selectedCampaignId]);

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.objective.trim()) {
      alert('Name and objective are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await campaignApi.create({
        ...formData,
        budget: parseFloat(formData.budget || 0),
      });
      setShowNewModal(false);
      fetchCampaigns();
      if (res.campaignId) setSelectedCampaignId(res.campaignId);
    } catch (err) {
      alert(err.message || 'Failed to create campaign.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleDelivered = async (customerId, currentVal) => {
    if (!selectedCampaignId) return;
    try {
      await campaignApi.recordOutcome(selectedCampaignId, {
        customerId,
        interventionDelivered: !currentVal,
      });
      const res = await campaignApi.getAnalysis(selectedCampaignId);
      setCampaignAnalysis(res.data);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleRetained = async (customerId, currentVal) => {
    if (!selectedCampaignId) return;
    try {
      await campaignApi.recordOutcome(selectedCampaignId, {
        customerId,
        evaluatedRetained: !currentVal,
      });
      const res = await campaignApi.getAnalysis(selectedCampaignId);
      setCampaignAnalysis(res.data);
    } catch (err) {
      alert(err.message);
    }
  };

  const stats = campaignAnalysis?.statistics || {};
  const currentCampaign = campaigns.find(c => c.id === selectedCampaignId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Retention Campaign Analytics</h2>
          <p className="text-xs text-slate-500">
            Randomized Controlled Trials (RCT) • Two-proportion statistical tests • Confidence intervals & incremental ROI
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Launch Retention Campaign
          </button>
        </div>
      </div>

      {/* Campaign Selector Pills */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 overflow-x-auto text-xs">
        <span className="font-semibold text-slate-400 mr-2 shrink-0">Initiatives:</span>
        {campaigns.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedCampaignId(c.id)}
            className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition flex items-center gap-2 ${
              selectedCampaignId === c.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>{c.name}</span>
            <span className="text-[10px] opacity-75 font-mono">({c.campaign_code})</span>
          </button>
        ))}
      </div>

      {/* Methodology Alert */}
      <div className="p-4 bg-slate-900 text-slate-200 rounded-xl border border-slate-800 shadow-sm flex items-start gap-3 text-xs">
        <Info className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-white block font-bold">
            Rigorous Statistical Trial Methodology (Intention-To-Treat)
          </strong>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Eligible corporate accounts are randomly split 50/50 into a Treatment Group (assigned retention intervention) and a Control Group (standard service). Results are evaluated via a <strong>two-proportion Z-test</strong> and <strong>95% confidence intervals</strong>. We never assume a campaign worked merely because the treatment group showed a higher raw retention rate.
          </p>
        </div>
      </div>

      {loadingAnalysis ? (
        <div className="py-20 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          Calculating two-proportion statistical inference and retention lift...
        </div>
      ) : (
        <>
          {/* Statistical KPI Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Treatment Retention Rate */}
            <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm">
              <span className="text-slate-400 text-xs block font-semibold">Treatment Retention Rate</span>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {stats.treatmentRetentionRate ?? 0}%
              </div>
              <span className="text-[10px] text-slate-500">
                {stats.treatmentRetained} / {stats.treatmentTotal} Retained Clients
              </span>
            </div>

            {/* Control Retention Rate */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-slate-400 text-xs block font-semibold">Control Retention Rate</span>
              <div className="text-2xl font-bold text-slate-700 mt-1">
                {stats.controlRetentionRate ?? 0}%
              </div>
              <span className="text-[10px] text-slate-500">
                {stats.controlRetained} / {stats.controlTotal} Baseline Clients
              </span>
            </div>

            {/* Absolute Retention Lift */}
            <div className="bg-white p-4 rounded-xl border border-teal-200 shadow-sm bg-teal-50/20">
              <span className="text-teal-900 text-xs block font-semibold">Absolute Retention Lift</span>
              <div className="text-2xl font-bold text-teal-700 mt-1">
                {stats.absoluteLiftPercentage > 0 ? `+${stats.absoluteLiftPercentage}%` : `${stats.absoluteLiftPercentage}%`}
              </div>
              <span className="text-[10px] text-teal-700">
                Treatment Rate minus Control Rate
              </span>
            </div>

            {/* Incremental Cost per Retained Customer */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-slate-400 text-xs block font-semibold">Cost / Retained Client</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {stats.costPerRetainedCustomer ? `$${Number(stats.costPerRetainedCustomer).toLocaleString()}` : 'N/A'}
              </div>
              <span className="text-[10px] text-slate-500">
                Budget: ${(Number(stats.campaignCost || 0)).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Statistical Significance & Confidence Interval Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Two-Proportion Hypothesis Test & Uncertainty Range</h3>
                <span className="text-slate-400 text-[11px]">Testing H0: p_treatment = p_control at alpha = 0.05</span>
              </div>
              <span
                className={`px-3 py-1 rounded-full font-bold text-xs ${
                  stats.isStatisticallySignificant
                    ? 'bg-teal-100 text-teal-800 border border-teal-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}
              >
                {stats.isStatisticallySignificant ? 'Statistically Significant (p < 0.05)' : 'Not Statistically Significant (p >= 0.05)'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-400 block text-[11px]">Test Z-Score</span>
                <strong className="text-sm text-slate-900">{stats.zScore ?? '...'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">p-Value (Two-Tailed)</span>
                <strong className="text-sm text-slate-900">{stats.pValue ?? '...'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">95% Confidence Interval</span>
                <strong className="text-sm text-slate-900">
                  [{stats.confidenceInterval95?.lowerPercentage}%, {stats.confidenceInterval95?.upperPercentage}%]
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Incremental Retained Clients</span>
                <strong className="text-sm text-teal-700">+{stats.incrementalRetainedCustomers} Accounts</strong>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              <strong>Statistical Interpretation:</strong> The observed absolute retention lift of{' '}
              <strong>{stats.absoluteLiftPercentage}%</strong> is {stats.isStatisticallySignificant ? 'unlikely to be the result of random chance alone (p < 0.05)' : 'within expected sample variation limits (p >= 0.05)'}. The true population lift lies within the 95% confidence interval of <strong>[{stats.confidenceInterval95?.lowerPercentage}%, {stats.confidenceInterval95?.upperPercentage}%]</strong> with 95% certainty under randomized intention-to-treat analysis.
            </p>
          </div>

          {/* RCT Participant Assignment Breakdown Chart */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Retention Comparison: Treatment vs Control Cohort</h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    {
                      group: 'Treatment Cohort (Intervention)',
                      Retained: stats.treatmentRetained || 0,
                      Lost: (stats.treatmentTotal || 0) - (stats.treatmentRetained || 0),
                    },
                    {
                      group: 'Control Cohort (Standard Service)',
                      Retained: stats.controlRetained || 0,
                      Lost: (stats.controlTotal || 0) - (stats.controlRetained || 0),
                    },
                  ]}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="group" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="Retained" fill="#0d9488" stackId="a" />
                  <Bar dataKey="Lost" fill="#cbd5e1" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* Modal: Create Campaign */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">Launch Randomized Retention Campaign</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Campaign Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Commercial Cross-Border Fee Waiver Initiative"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Campaign Objective *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Detail the target retention goal and business case..."
                  value={formData.objective}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Segment</label>
                  <select
                    value={formData.targetSegment}
                    onChange={(e) => setFormData({ ...formData, targetSegment: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Intervention Type</label>
                  <select
                    value={formData.interventionType}
                    onChange={(e) => setFormData({ ...formData, interventionType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {INTERVENTION_TYPES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Budget ($)</label>
                  <input
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Evaluation Window (Days)</label>
                  <input
                    type="number"
                    value={formData.evaluationWindowDays}
                    onChange={(e) => setFormData({ ...formData, evaluationWindowDays: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-xs"
                >
                  {submitting ? 'Creating & Randomizing...' : 'Create & Assign RCT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
