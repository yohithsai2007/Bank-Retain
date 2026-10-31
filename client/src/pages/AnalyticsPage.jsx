import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingDown,
  Wallet,
  Activity,
  AlertTriangle,
  Building,
  RefreshCw,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { customerApi, analyticsApi } from '../services/api';

export default function AnalyticsPage() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // Analytics data for selected customer
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [txData, setTxData] = useState([]);
  const [balData, setBalData] = useState([]);
  const [prodData, setProdData] = useState(null);
  const [compData, setCompData] = useState(null);

  // Load customer list
  useEffect(() => {
    customerApi.getCustomers({ limit: 50, sortBy: 'risk_score', sortDir: 'DESC' })
      .then(res => {
        if (res?.data && res.data.length > 0) {
          setCustomers(res.data);
          setSelectedCustomerId(res.data[0].id);
        }
      })
      .catch(err => console.error('Error fetching customers:', err))
      .finally(() => setLoadingCustomers(false));
  }, []);

  // Fetch analytics for selected customer
  useEffect(() => {
    if (!selectedCustomerId) return;
    setLoadingAnalytics(true);

    Promise.all([
      analyticsApi.getTransactions(selectedCustomerId),
      analyticsApi.getBalances(selectedCustomerId),
      analyticsApi.getProducts(selectedCustomerId),
      analyticsApi.getComplaints(selectedCustomerId),
    ])
      .then(([tRes, bRes, pRes, cRes]) => {
        setTxData(tRes.data || []);
        setBalData(bRes.data || []);
        setProdData(pRes.data || null);
        setCompData(cRes.data || null);
      })
      .catch(err => console.error('Failed to load analytics:', err))
      .finally(() => setLoadingAnalytics(false));
  }, [selectedCustomerId]);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Corporate Relationship Analytics</h2>
          <p className="text-xs text-slate-500">
            Multi-dimensional behavioural tracking: transaction volumes, capital outflows, moving averages, and product utility
          </p>
        </div>

        {/* Customer Selector Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-600">Select Corporate Client:</label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            disabled={loadingCustomers}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.company_name} ({c.id}) • {c.risk_category} Risk
              </option>
            ))}
          </select>
          {selectedCustomer && (
            <button
              onClick={() => navigate(`/customers/${selectedCustomerId}`)}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            >
              Full Profile <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {loadingAnalytics ? (
        <div className="py-20 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          Loading client behavioural analytics...
        </div>
      ) : (
        <>
          {/* Analytical Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <span className="text-slate-400 block font-medium">Industry Sector</span>
              <span className="text-sm font-bold text-slate-800 mt-1 block">{selectedCustomer?.industry}</span>
              <span className="text-[10px] text-slate-500">{selectedCustomer?.business_segment}</span>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <span className="text-slate-400 block font-medium">Turnover Volume</span>
              <span className="text-sm font-bold text-slate-800 mt-1 block">
                ${(Number(selectedCustomer?.annual_revenue || 0) / 1000000).toFixed(1)}M Annual
              </span>
              <span className="text-[10px] text-slate-500">Credit Rating: {selectedCustomer?.credit_rating}</span>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <span className="text-slate-400 block font-medium">Product Utilization</span>
              <span className="text-sm font-bold text-slate-800 mt-1 block">
                {prodData?.summary?.averageUtilizationPct || 0}% Avg
              </span>
              <span className="text-[10px] text-slate-500">{prodData?.summary?.totalProducts || 0} active products held</span>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <span className="text-slate-400 block font-medium">Service Complaints</span>
              <span className="text-sm font-bold text-slate-800 mt-1 block">
                {compData?.metrics?.openComplaints || 0} Open
              </span>
              <span className="text-[10px] text-slate-500">Avg Resolution: {compData?.metrics?.averageResolutionHours || '0'} hrs</span>
            </div>
          </div>

          {/* Section A: Transaction MoM Percentage Change & Decline Analysis */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">A. Transaction Volume & Turnaround Contraction</h3>
                <p className="text-xs text-slate-400">Month-over-month percentage changes and rolling 3-month simple moving averages (SMA-3)</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">
                Formula: ((Previous - Current) / Previous) * 100
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={txData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month_year" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                  <Legend verticalAlign="top" height={36} />
                  <Line type="monotone" dataKey="total_count" name="Observed Volume" stroke="#2563eb" strokeWidth={2.5} />
                  <Line type="monotone" dataKey="sma3Count" name="3-Month SMA (Baseline)" stroke="#64748b" strokeDasharray="4 4" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Section B: Operating Balances & Outflow Tracking */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">B. Operating Balance Drainage & Sustained Decline Periods</h3>
                <p className="text-xs text-slate-400">Tracking monthly liquidity depletion against 3-month and 6-month moving average baselines</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-teal-50 text-teal-700 font-bold">
                Sustained Capital Outflow Analysis
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={balData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month_year" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(val) => [`$${Number(val).toLocaleString()}`, 'Balance']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Line type="monotone" dataKey="closing_balance" name="Closing Balance ($)" stroke="#0d9488" strokeWidth={2.5} />
                  <Line type="monotone" dataKey="sma_3_month" name="SMA-3 ($)" stroke="#f59e0b" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="sma_6_month" name="SMA-6 ($)" stroke="#6366f1" strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Section C: Inbound vs Outbound and Cross-Border Payments */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="font-bold text-slate-800 text-sm">Domestic vs Cross-Border Payments Distribution</h4>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={txData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month_year" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                    <Legend verticalAlign="top" height={30} />
                    <Bar dataKey="domestic_count" name="Domestic Wires" fill="#3b82f6" stackId="a" />
                    <Bar dataKey="international_count" name="International FX" fill="#8b5cf6" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="font-bold text-slate-800 text-sm">Inbound Collections vs Outbound Disbursements</h4>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={txData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month_year" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                    <Legend verticalAlign="top" height={30} />
                    <Bar dataKey="inbound_count" name="Inbound Wires" fill="#10b981" />
                    <Bar dataKey="outbound_count" name="Outbound Disbursements" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
