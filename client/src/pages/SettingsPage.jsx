import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Save,
  RefreshCw,
  Sliders,
  History,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { settingsApi } from '../services/api';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [version, setVersion] = useState('v1.0');

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await settingsApi.getSettings();
      setRules(res.data?.scoringRules || []);
      setCategories(res.data?.categories || []);
      setAuditLogs(res.data?.auditLogs || []);
      setVersion(res.data?.scoringVersion || 'v1.0');
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handlePointChange = (code, val) => {
    const pts = parseInt(val, 10) || 0;
    setRules(prev => prev.map(r => r.rule_code === code ? { ...r, current_points: pts } : r));
  };

  const handleThresholdChange = (code, val) => {
    const th = parseFloat(val) || 0;
    setRules(prev => prev.map(r => r.rule_code === code ? { ...r, threshold_value: th } : r));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    // Calculate total weights
    const totalWeights = rules.reduce((acc, r) => acc + (parseInt(r.current_points, 10) || 0), 0);
    if (totalWeights > 100) {
      setErrorMsg(`Total scoring weights (${totalWeights} pts) exceed the maximum allowable 100 points.`);
      return;
    }

    setSaving(true);
    try {
      const nextVersion = version === 'v1.0' ? 'v1.1' : `v1.${parseInt(version.split('.')[1] || '1', 10) + 1}`;
      await settingsApi.updateSettings({
        rules,
        newVersion: nextVersion,
      });
      setSuccessMsg(`Risk scoring configuration successfully updated and saved under version ${nextVersion}!`);
      fetchSettings();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const totalPoints = rules.reduce((acc, r) => acc + (parseInt(r.current_points, 10) || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">System Settings & Scoring Configuration</h2>
          <p className="text-xs text-slate-500">
            Configure early warning thresholds, risk points allocation, and policy boundaries with complete audit logging
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-teal-50 border border-teal-200 text-teal-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Rules Configuration Form */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 text-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Transparent Risk Scoring Rules & Weights</h3>
            <span className="text-[11px] text-slate-400">
              Active Framework Version: <strong className="text-slate-700 font-mono">{version}</strong> • Cumulative Points Cap: 100 pts
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 text-[11px] block">Sum of Active Weights</span>
            <span className={`text-base font-bold ${totalPoints > 100 ? 'text-red-600' : 'text-slate-800'}`}>
              {totalPoints} / 100 pts
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            Loading scoring configuration...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Rule Code & Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Threshold Condition</th>
                    <th className="py-2.5 px-3 text-right">Threshold Value</th>
                    <th className="py-2.5 px-3 text-right">Points Weight (0-50)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rules.map(r => (
                    <tr key={r.rule_code} className="hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{r.rule_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{r.rule_code}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{r.description}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {r.category}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-mono">
                        {r.threshold_operator} {r.threshold_value} {r.rule_code.includes('DECLINE') ? '%' : ''}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <input
                          type="number"
                          step="0.5"
                          value={r.threshold_value}
                          onChange={(e) => handleThresholdChange(r.rule_code, e.target.value)}
                          className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded font-semibold text-right"
                        />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={r.current_points}
                          onChange={(e) => handlePointChange(r.rule_code, e.target.value)}
                          className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded font-bold text-red-600 text-right"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-3">
              <span className="text-[11px] text-slate-400">
                Rule adjustments will apply to all subsequent customer evaluations and risk audits.
              </span>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold flex items-center gap-2 transition shadow-xs"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Validating & Saving...' : 'Save Configuration Changes'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Category Boundaries Display */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 text-xs">
        <h3 className="font-bold text-slate-800 text-sm">Standard Risk Category Boundaries</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {categories.map(c => (
            <div key={c.name} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <span className="font-bold text-sm block" style={{ color: c.color }}>{c.name} Risk</span>
              <span className="text-xl font-bold text-slate-900 mt-1 block">
                {c.min} – {c.max} pts
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">Inclusive boundary interval</span>
            </div>
          ))}
        </div>
      </div>

      {/* Policy Audit Logs */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            <h3 className="font-bold text-slate-800 text-sm">Regulatory Policy Audit Log</h3>
          </div>
          <span className="text-[11px] text-slate-400">Last 10 policy changes</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                <th className="py-2 px-3">Timestamp</th>
                <th className="py-2 px-3">Authorized User</th>
                <th className="py-2 px-3">Action</th>
                <th className="py-2 px-3">Framework Version</th>
                <th className="py-2 px-3">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-400">
                    No recent configuration modifications recorded. Initial policy baseline active.
                  </td>
                </tr>
              ) : (
                auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono text-slate-500">{log.created_at}</td>
                    <td className="py-2 px-3 font-semibold text-slate-800">{log.full_name || 'System Admin'}</td>
                    <td className="py-2 px-3 font-mono text-blue-600">{log.action}</td>
                    <td className="py-2 px-3 font-bold text-slate-700">{log.entity_id}</td>
                    <td className="py-2 px-3 font-mono text-slate-400">{log.ip_address}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
