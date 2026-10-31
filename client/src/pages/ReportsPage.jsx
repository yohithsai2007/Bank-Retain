import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Filter,
  RefreshCw,
  Table,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { reportsApi } from '../services/api';

const REPORT_TYPES = [
  { id: 'high-risk', name: 'High-Risk Customers Report', endpoint: 'high-risk' },
  { id: 'alerts', name: 'Early Warning Alerts Report', endpoint: 'alerts' },
  { id: 'campaigns', name: 'Retention Campaign Performance Report', endpoint: 'campaigns' },
  { id: 'customers', name: 'Complete Corporate Customers Registry', endpoint: 'customers' },
  { id: 'transactions-decline', name: 'Transaction Volume & Value Decline Report', endpoint: 'transactions-decline' },
  { id: 'balance-decline', name: 'Operating Balance Outflow & Drainage Report', endpoint: 'balance-decline' },
  { id: 'recommendations', name: 'Retention Recommendations Log', endpoint: 'recommendations' },
  { id: 'tasks', name: 'Relationship Manager Tasks Report', endpoint: 'tasks' },
  { id: 'historical-attrition', name: 'Historical Customer Outcomes & Attrition', endpoint: 'historical-attrition' },
];

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState(REPORT_TYPES[0]);
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      let res;
      if (selectedReport.id === 'high-risk') {
        res = await reportsApi.getHighRisk('json');
      } else if (selectedReport.id === 'alerts') {
        res = await reportsApi.getAlerts('json');
      } else if (selectedReport.id === 'campaigns') {
        res = await reportsApi.getCampaigns('json');
      } else {
        res = await reportsApi.getReport(selectedReport.endpoint, 'json');
      }
      setReportData(res.data || []);
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedReport]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      let blob;
      if (selectedReport.id === 'high-risk') {
        blob = await reportsApi.getHighRisk('csv');
      } else if (selectedReport.id === 'alerts') {
        blob = await reportsApi.getAlerts('csv');
      } else if (selectedReport.id === 'campaigns') {
        blob = await reportsApi.getCampaigns('csv');
      } else {
        blob = await reportsApi.getReport(selectedReport.endpoint, 'csv');
      }

      // Trigger browser download
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedReport.id}_report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert('Failed to export CSV: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const headers = reportData.length > 0 ? Object.keys(reportData[0]) : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Executive Reports & CSV Exports</h2>
          <p className="text-xs text-slate-500">
            Generate and export corporate customer datasets, early warning alerts, risk logs, and campaign statistical files
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          disabled={exporting || loading || reportData.length === 0}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition shadow-xs"
        >
          <Download className="w-4 h-4" />
          {exporting ? 'Generating CSV...' : 'Export Filtered CSV'}
        </button>
      </div>

      {/* Report Selector Pills */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 overflow-x-auto text-xs">
        <span className="font-semibold text-slate-400 mr-2 shrink-0">Report Catalogue:</span>
        {REPORT_TYPES.map(rpt => (
          <button
            key={rpt.id}
            onClick={() => setSelectedReport(rpt)}
            className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition flex items-center gap-1.5 ${
              selectedReport.id === rpt.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{rpt.name}</span>
          </button>
        ))}
      </div>

      {/* Preview Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">{selectedReport.name}</h3>
            <span className="text-slate-400 text-[11px]">
              Displaying preview of first {Math.min(50, reportData.length)} of {reportData.length} records • Real database data
            </span>
          </div>
          <button
            onClick={fetchReport}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition"
            title="Refresh preview"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
              Compiling report records...
            </div>
          ) : reportData.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              No records available for this report type.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  {headers.map(h => (
                    <th key={h} className="py-2.5 px-3 whitespace-nowrap bg-slate-100">
                      {h.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {reportData.slice(0, 50).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    {headers.map(h => (
                      <td key={h} className="py-2 px-3 whitespace-nowrap max-w-xs truncate">
                        {row[h] !== null && row[h] !== undefined ? String(row[h]) : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
          <span>Synthetic Demonstration Records strictly labeled per compliance rules</span>
          <button
            onClick={handleExportCsv}
            className="text-blue-600 font-semibold hover:underline flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" /> Download Full CSV ({reportData.length} rows)
          </button>
        </div>
      </div>
    </div>
  );
}
