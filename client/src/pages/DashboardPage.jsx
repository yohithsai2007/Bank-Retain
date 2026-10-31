import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  ShieldAlert,
  AlertTriangle,
  TrendingDown,
  Wallet,
  Clock,
  CheckCircle2,
  Filter,
  RefreshCw,
  Search,
  ArrowUpDown,
  Building2,
  ChevronRight,
  ExternalLink,
  Target,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { dashboardApi, settingsApi } from '../services/api';

const RISK_COLORS = {
  Low: '#0d9488', // teal
  Medium: '#d97706', // amber
  High: '#ea580c', // orange-red
  Critical: '#dc2626', // strong red
};

const TASK_COLORS = {
  Open: '#3b82f6',
  'In Progress': '#8b5cf6',
  Completed: '#10b981',
  Overdue: '#ef4444',
  Cancelled: '#64748b',
};

const INDUSTRIES = [
  'All',
  'Manufacturing',
  'Technology & Telecom',
  'Healthcare & Pharma',
  'Wholesale & Retail',
  'Energy & Utilities',
  'Logistics & Transportation',
  'Financial Services',
  'Construction & Real Estate',
  'Hospitality & Leisure',
  'Agriculture & Food',
];

const SEGMENTS = ['All', 'Enterprise', 'Mid-Corporate', 'Commercial', 'SME Corporate'];
const REGIONS = ['All', 'North America', 'EMEA', 'APAC', 'LATAM', 'National'];
const RISK_CATEGORIES = ['All', 'Low', 'Medium', 'High', 'Critical'];

export default function DashboardPage() {
  const navigate = useNavigate();

  // Filters state
  const [filters, setFilters] = useState({
    industry: 'All',
    segment: 'All',
    region: 'All',
    riskCategory: 'All',
    rmId: 'All',
  });

  const [rms, setRms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [charts, setCharts] = useState(null);

  // High-Risk table state
  const [highRiskCustomers, setHighRiskCustomers] = useState([]);
  const [tableSearch, setTableSearch] = useState('');
  const [tablePage, setTablePage] = useState(1);
  const [tablePagination, setTablePagination] = useState({ total: 0, totalPages: 1 });
  const [tableLoading, setTableLoading] = useState(false);

  // Load Relationship Managers for filter dropdown
  useEffect(() => {
    settingsApi.getRelationshipManagers()
      .then(res => { if (res?.data) setRms(res.data); })
      .catch(() => {});
  }, []);

  // Fetch summary and charts when filters change
  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumRes, chartRes] = await Promise.all([
        dashboardApi.getSummary(filters),
        dashboardApi.getCharts(filters),
      ]);
      setSummary(sumRes.data);
      setCharts(chartRes.charts);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  // Fetch high risk table
  const fetchHighRiskTable = async () => {
    setTableLoading(true);
    try {
      const res = await dashboardApi.getHighRisk({
        ...filters,
        search: tableSearch,
        page: tablePage,
        limit: 8,
      });
      setHighRiskCustomers(res.data || []);
      setTablePagination(res.pagination || { total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to fetch high-risk table:', err);
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchHighRiskTable();
  }, [filters, tableSearch, tablePage]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setTablePage(1);
  };

  const resetFilters = () => {
    setFilters({
      industry: 'All',
      segment: 'All',
      region: 'All',
      riskCategory: 'All',
      rmId: 'All',
    });
    setTableSearch('');
    setTablePage(1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header & Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800 tracking-tight">Executive Dashboard Filters</h2>
            <span className="text-xs text-slate-400 font-normal">
              (Live calculation from database records)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetFilters}
              className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              Reset Filters
            </button>
            <button
              onClick={() => { fetchData(); fetchHighRiskTable(); }}
              className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 transition shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Analytics
            </button>
          </div>
        </div>

        {/* Filter Selects */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Industry</label>
            <select
              value={filters.industry}
              onChange={(e) => handleFilterChange('industry', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Business Segment</label>
            <select
              value={filters.segment}
              onChange={(e) => handleFilterChange('segment', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Region</label>
            <select
              value={filters.region}
              onChange={(e) => handleFilterChange('region', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Risk Category</label>
            <select
              value={filters.riskCategory}
              onChange={(e) => handleFilterChange('riskCategory', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {RISK_CATEGORIES.map(rc => <option key={rc} value={rc}>{rc}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Relationship Manager</label>
            <select
              value={filters.rmId}
              onChange={(e) => handleFilterChange('rmId', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Managers</option>
              {rms.map(rm => <option key={rm.id} value={rm.id}>{rm.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Executive KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Total Corporate Clients</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {summary?.totalCustomers ?? '...'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Portfolio: ${((summary?.totalPortfolioRevenue || 0) / 1000000000).toFixed(2)}B turnover</span>
          </div>
        </div>

        {/* High & Critical Risk Customers */}
        <div className="bg-white p-4 rounded-xl border border-red-200 shadow-sm bg-gradient-to-br from-white to-red-50/30 hover:shadow-md transition">
          <div className="flex items-center justify-between text-red-600 text-xs font-semibold mb-2">
            <span>High & Critical Risk</span>
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-600 tracking-tight">
            {summary?.highRiskCustomers ?? '...'}
          </div>
          <div className="text-[11px] text-red-500 mt-1">
            Requires immediate RM intervention
          </div>
        </div>

        {/* Medium-Risk Customers */}
        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm bg-gradient-to-br from-white to-amber-50/30 hover:shadow-md transition">
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold mb-2">
            <span>Medium-Risk Customers</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700 tracking-tight">
            {summary?.mediumRiskCustomers ?? '...'}
          </div>
          <div className="text-[11px] text-amber-600 mt-1">
            Early warning watch list
          </div>
        </div>

        {/* Low-Risk Customers */}
        <div className="bg-white p-4 rounded-xl border border-teal-200 shadow-sm bg-gradient-to-br from-white to-teal-50/30 hover:shadow-md transition">
          <div className="flex items-center justify-between text-teal-700 text-xs font-semibold mb-2">
            <span>Low-Risk (Stable)</span>
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-teal-700 tracking-tight">
            {summary?.lowRiskCustomers ?? '...'}
          </div>
          <div className="text-[11px] text-teal-600 mt-1">
            Normal operational baseline
          </div>
        </div>

        {/* Declining Transaction Volumes */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Declining Transactions</span>
            <TrendingDown className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {summary?.decliningTxCustomers ?? '...'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            MoM volume decline &gt; 15%
          </div>
        </div>

        {/* Declining Operating Balances */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Declining Operating Balances</span>
            <Wallet className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {summary?.decliningBalCustomers ?? '...'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Liquidity drain &gt; 15%
          </div>
        </div>

        {/* Active Unresolved Alerts */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Active EWS Alerts</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {summary?.activeUnresolvedAlerts ?? '...'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Unacknowledged early warnings
          </div>
        </div>

        {/* Pending Retention Tasks */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Pending Retention Tasks</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight flex items-baseline gap-2">
            <span>{summary?.pendingRetentionTasks ?? '...'}</span>
            {summary?.overdueRetentionTasks > 0 && (
              <span className="text-xs font-bold text-red-600">
                ({summary.overdueRetentionTasks} Overdue)
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Relationship manager follow-ups
          </div>
        </div>
      </div>

      {/* Historical Outcomes & Campaign Benchmark Banner */}
      <div className="bg-slate-900 text-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 border border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white tracking-wide uppercase">
              Historical Banking Outcomes & Randomized Control Campaign Benchmarks
            </div>
            <div className="text-[11px] text-slate-400">
              Evaluated strictly on historical cohort performance and intention-to-treat trial outcomes
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs">
          <div>
            <span className="text-slate-400 text-[11px] block">Historical Attrition Rate</span>
            <span className="text-base font-bold text-white">{summary?.historicalAttritionRate ?? 4.8}%</span>
          </div>
          <div className="w-px h-8 bg-slate-800"></div>
          <div>
            <span className="text-slate-400 text-[11px] block">Retained Accounts (YTD)</span>
            <span className="text-base font-bold text-teal-400">{summary?.customersRetainedCount ?? 20}</span>
          </div>
          <div className="w-px h-8 bg-slate-800"></div>
          <div>
            <span className="text-slate-400 text-[11px] block">Active RCT Campaigns</span>
            <span className="text-base font-bold text-blue-400">{summary?.activeCampaigns ?? 3} Active</span>
          </div>
        </div>
      </div>

      {/* 3. Recharts Section: 7 Core Banking Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Customer Risk Distribution (Doughnut) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Customer Risk Distribution</h3>
              <p className="text-xs text-slate-400">Categorized by deterministic rule-based severity</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
              Doughnut
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts?.riskDistribution || []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {(charts?.riskDistribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name) => [`${val} Customers`, `Risk: ${name}`]}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Monthly Transaction Volume Trend (Line) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Monthly Transaction Volume Trend</h3>
              <p className="text-xs text-slate-400">12-month rolling aggregate transaction count</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
              Transactions
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts?.txVolumeTrend || []} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(val) => [Number(val).toLocaleString(), 'Total Transactions']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="totalCount"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#2563eb' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Operating Balance Trends (Line) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Corporate Operating Balance Trends</h3>
              <p className="text-xs text-slate-400">Total closing liquidity balance ($ Millions)</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-teal-50 text-teal-700 font-medium">
              $ Millions
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts?.balanceTrend || []} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(val) => [`$${val}M`, 'Closing Balances']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="totalBalanceMillion"
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#0d9488' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: High-Risk Customers by Industry (Bar) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">High-Risk Customers by Industry</h3>
              <p className="text-xs text-slate-400">Concentration of critical and high-risk accounts</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-red-50 text-red-700 font-medium">
              Risk Breakdown
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.industryRisk || []} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="industry"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend verticalAlign="top" height={30} iconType="circle" />
                <Bar dataKey="criticalRisk" name="Critical" fill="#dc2626" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="highRisk" name="High" fill="#ea580c" stackId="a" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 5: Early Warning Indicator Distribution (Bar) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Early Warning Indicator Distribution</h3>
              <p className="text-xs text-slate-400">Most frequently triggered warning conditions across portfolio</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">
              EWS Rules
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={charts?.alertDistribution || []}
                margin={{ top: 10, right: 20, left: 40, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  dataKey="indicator"
                  type="category"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  width={130}
                />
                <Tooltip
                  formatter={(val) => [val, 'Triggered Alerts']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#d97706" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 6: Retention Task Status (Doughnut) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Retention Task Status Distribution</h3>
              <p className="text-xs text-slate-400">Operational progress of relationship manager interventions</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-medium">
              Interventions
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts?.taskStatusDistribution || []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {(charts?.taskStatusDistribution || []).map((entry, index) => (
                    <Cell key={`cell-task-${index}`} fill={TASK_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name) => [`${val} Tasks`, `Status: ${name}`]}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. High-Risk Customer Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-800">High & Critical Risk Customer Watchlist</h3>
            <p className="text-xs text-slate-500">Corporate clients exhibiting severe volume, balance, or complaint anomalies</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search high-risk table..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => navigate('/risk')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition"
            >
              Full Risk Table <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Customer ID</th>
                <th className="py-3 px-4">Company Name</th>
                <th className="py-3 px-4">Industry</th>
                <th className="py-3 px-4 text-right">Tx Volume Decline</th>
                <th className="py-3 px-4 text-right">Balance Decline</th>
                <th className="py-3 px-4 text-center">Risk Score</th>
                <th className="py-3 px-4 text-center">Category</th>
                <th className="py-3 px-4 text-center">Active Warnings</th>
                <th className="py-3 px-4">Relationship Manager</th>
                <th className="py-3 px-4">Recommended Next Step</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {tableLoading ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading high-risk records...
                  </td>
                </tr>
              ) : highRiskCustomers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    No high-risk corporate accounts match current filter criteria.
                  </td>
                </tr>
              ) : (
                highRiskCustomers.map((cust) => (
                  <tr
                    key={cust.customer_id}
                    onClick={() => navigate(`/customers/${cust.customer_id}`)}
                    className="hover:bg-blue-50/40 cursor-pointer transition group"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-slate-600">
                      {cust.customer_id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 group-hover:text-blue-600 transition">
                      {cust.company_name}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {cust.industry}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-red-600">
                      {cust.tx_volume_decline > 0 ? `-${cust.tx_volume_decline}%` : '0.0%'}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-red-600">
                      {cust.balance_decline > 0 ? `-${cust.balance_decline}%` : '0.0%'}
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] bg-red-100 text-red-800">
                        {cust.risk_score}/100
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-semibold">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] ${
                          cust.risk_category === 'Critical'
                            ? 'bg-red-600 text-white font-bold'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {cust.risk_category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        {cust.active_warning_count}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {cust.rm_name || 'Unassigned'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate" title={cust.recommended_action}>
                      {cust.recommended_action || 'Review banking facilities'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/customers/${cust.customer_id}`);
                        }}
                        className="px-2 py-1 text-xs text-blue-600 hover:text-white hover:bg-blue-600 rounded transition font-medium"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
          <span>
            Showing page {tablePage} of {tablePagination.totalPages || 1} ({tablePagination.total} total high-risk accounts)
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={tablePage <= 1}
              onClick={() => setTablePage(p => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>
            <button
              disabled={tablePage >= tablePagination.totalPages}
              onClick={() => setTablePage(p => p + 1)}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
