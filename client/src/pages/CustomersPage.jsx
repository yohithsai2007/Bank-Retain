import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  ExternalLink,
  Edit2,
  Archive,
  RefreshCw,
  AlertTriangle,
  X,
  CheckCircle,
} from 'lucide-react';
import { customerApi, settingsApi } from '../services/api';

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

export default function CustomersPage() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rms, setRms] = useState([]);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('All');
  const [region, setRegion] = useState('All');
  const [segment, setSegment] = useState('All');
  const [riskCategory, setRiskCategory] = useState('All');
  const [sortBy, setSortBy] = useState('risk_score');
  const [sortDir, setSortDir] = useState('DESC');

  // Pagination
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Add / Edit Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    companyName: '',
    registrationNumber: '',
    industry: 'Manufacturing',
    businessSegment: 'Commercial',
    region: 'North America',
    relationshipStartDate: new Date().toISOString().split('T')[0],
    annualRevenue: '',
    creditRating: 'BBB',
    rmId: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load RMs
  useEffect(() => {
    settingsApi.getRelationshipManagers()
      .then(res => { if (res?.data) setRms(res.data); })
      .catch(() => {});
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await customerApi.getCustomers({
        search,
        industry,
        region,
        segment,
        riskCategory,
        sortBy,
        sortDir,
        page,
        limit: 15,
      });
      setCustomers(res.data || []);
      setPagination(res.pagination || { total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, industry, region, segment, riskCategory, sortBy, sortDir, page]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortDir('DESC');
    }
  };

  // Open modal for add
  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      companyName: '',
      registrationNumber: `REG-2026-${Math.floor(100000 + Math.random() * 900000)}`,
      industry: 'Manufacturing',
      businessSegment: 'Commercial',
      region: 'North America',
      relationshipStartDate: new Date().toISOString().split('T')[0],
      annualRevenue: '25000000',
      creditRating: 'BBB',
      rmId: rms[0]?.id || '',
      contactPerson: 'Director of Treasury',
      contactEmail: 'treasury@corporate.com',
      contactPhone: '+1-555-0199',
    });
    setFormError('');
    setShowAddModal(true);
  };

  // Open modal for edit
  const handleOpenEdit = (cust, e) => {
    e.stopPropagation();
    setEditingCustomer(cust);
    setFormData({
      companyName: cust.company_name,
      registrationNumber: cust.registration_number,
      industry: cust.industry,
      businessSegment: cust.business_segment,
      region: cust.region,
      relationshipStartDate: cust.relationship_start_date,
      annualRevenue: cust.annual_revenue,
      creditRating: cust.credit_rating,
      rmId: cust.rm_id || '',
      contactPerson: cust.contact_person,
      contactEmail: cust.contact_email,
      contactPhone: cust.contact_phone,
    });
    setFormError('');
    setShowAddModal(true);
  };

  // Handle archive
  const handleArchive = async (id, name, e) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to archive corporate client '${name}' (${id})?`)) {
      try {
        await customerApi.archiveCustomer(id);
        fetchCustomers();
      } catch (err) {
        alert(err.message || 'Failed to archive customer.');
      }
    }
  };

  // Submit Add / Edit
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formData.companyName.trim()) {
      setFormError('Company name is required.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingCustomer) {
        await customerApi.updateCustomer(editingCustomer.id, {
          companyName: formData.companyName,
          industry: formData.industry,
          businessSegment: formData.businessSegment,
          region: formData.region,
          rmId: formData.rmId || null,
          annualRevenue: parseFloat(formData.annualRevenue || 0),
          creditRating: formData.creditRating,
          contactPerson: formData.contactPerson,
          contactEmail: formData.contactEmail,
          contactPhone: formData.contactPhone,
        });
      } else {
        await customerApi.createCustomer({
          ...formData,
          annualRevenue: parseFloat(formData.annualRevenue || 0),
          rmId: formData.rmId ? parseInt(formData.rmId, 10) : null,
        });
      }
      setShowAddModal(false);
      fetchCustomers();
    } catch (err) {
      setFormError(err.message || 'Failed to save customer.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Corporate Customer Directory</h2>
          <p className="text-xs text-slate-500">
            Portfolio registry with transparent rule-based risk assessments and relationship metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchCustomers}
            className="p-2 text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-sm"
            title="Refresh customer list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition shadow-sm shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            Add Corporate Client
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by company name, ID, registration..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Industry */}
          <div>
            <select
              value={industry}
              onChange={(e) => { setIndustry(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {INDUSTRIES.map(i => <option key={i} value={i}>{i === 'All' ? 'All Industries' : i}</option>)}
            </select>
          </div>

          {/* Region */}
          <div>
            <select
              value={region}
              onChange={(e) => { setRegion(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {REGIONS.map(r => <option key={r} value={r}>{r === 'All' ? 'All Regions' : r}</option>)}
            </select>
          </div>

          {/* Risk Category */}
          <div>
            <select
              value={riskCategory}
              onChange={(e) => { setRiskCategory(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
            >
              {RISK_CATEGORIES.map(rc => <option key={rc} value={rc}>{rc === 'All' ? 'All Risk Categories' : `${rc} Risk`}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th
                  onClick={() => handleSort('id')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-200/60 transition"
                >
                  <div className="flex items-center gap-1">
                    Customer ID <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('company_name')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-200/60 transition"
                >
                  <div className="flex items-center gap-1">
                    Company Name <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Industry & Segment</th>
                <th className="py-3 px-4">Region</th>
                <th
                  onClick={() => handleSort('annual_revenue')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-200/60 transition text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    Annual Turnover <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('risk_score')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-200/60 transition text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    Risk Score <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Risk Category</th>
                <th className="py-3 px-4 text-center">Active EWS</th>
                <th className="py-3 px-4">Relationship Manager</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading corporate customer database...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No corporate customers match the active filters.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/customers/${c.id}`)}
                    className="hover:bg-blue-50/40 cursor-pointer transition group"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-slate-600">
                      {c.id}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 group-hover:text-blue-600 transition">
                      <div>{c.company_name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{c.registration_number}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="font-medium">{c.industry}</div>
                      <div className="text-[10px] text-slate-400">{c.business_segment}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {c.region}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-800">
                      ${(Number(c.annual_revenue || 0) / 1000000).toFixed(1)}M
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-800">
                        {c.risk_score}/100
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-semibold">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          c.risk_category === 'Critical'
                            ? 'bg-red-100 text-red-700'
                            : c.risk_category === 'High'
                            ? 'bg-orange-100 text-orange-800'
                            : c.risk_category === 'Medium'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-teal-100 text-teal-800'
                        }`}
                      >
                        {c.risk_category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {c.active_alerts_count > 0 ? (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {c.active_alerts_count}
                        </span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {c.rm_name || 'Unassigned'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleOpenEdit(c, e)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 transition"
                          title="Edit corporate details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleArchive(c.id, c.company_name, e)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 transition"
                          title="Archive customer relationship"
                        >
                          <Archive className="w-3.5 h-3.5" />
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
            Page {page} of {pagination.totalPages || 1} ({pagination.total} registered corporate accounts)
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

      {/* Add / Edit Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  {editingCustomer ? `Edit Client: ${editingCustomer.company_name}` : 'Register New Corporate Client'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Company Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. Apex Manufacturing AG"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Registration / Tax ID</label>
                  <input
                    type="text"
                    value={formData.registrationNumber}
                    onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Industry Sector</label>
                  <select
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {INDUSTRIES.filter(i => i !== 'All').map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Business Segment</label>
                  <select
                    value={formData.businessSegment}
                    onChange={(e) => setFormData({ ...formData, businessSegment: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {SEGMENTS.filter(s => s !== 'All').map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Commercial Region</label>
                  <select
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {REGIONS.filter(r => r !== 'All').map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Annual Turnover / Revenue ($)</label>
                  <input
                    type="number"
                    value={formData.annualRevenue}
                    onChange={(e) => setFormData({ ...formData, annualRevenue: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="25000000"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Relationship Manager</label>
                  <select
                    value={formData.rmId}
                    onChange={(e) => setFormData({ ...formData, rmId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {rms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.region})</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Key Finance Contact Person</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1.5 transition shadow-sm"
                >
                  {submitting ? 'Saving...' : editingCustomer ? 'Update Client' : 'Register Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
