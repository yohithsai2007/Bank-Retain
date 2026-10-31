import React, { useState } from 'react';
import {
  Database,
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  ArrowRight,
  Download,
} from 'lucide-react';
import { dataApi } from '../services/api';

const SAMPLE_CUSTOMERS_CSV = `id,company_name,registration_number,industry,business_segment,region,relationship_start_date,annual_revenue
CUST-9001,Pinnacle Heavy Engineering AG,REG-2024-9001,Manufacturing,Enterprise,North America,2022-01-15,185000000
CUST-9002,Global BioPharm Solutions Ltd,REG-2024-9002,Healthcare & Pharma,Mid-Corporate,EMEA,2023-04-10,95000000
CUST-9003,Starlight Telecom Infrastructure,REG-2024-9003,Technology & Telecom,Commercial,APAC,2024-02-01,34000000`;

const SAMPLE_TX_CSV = `customer_id,month_year,total_count,total_value
CUST-9001,2026-10,1200,8500000
CUST-9002,2026-10,450,3200000
CUST-9003,2026-10,310,1400000`;

const SAMPLE_BAL_CSV = `customer_id,month_year,closing_balance
CUST-9001,2026-10,14200000
CUST-9002,2026-10,5800000
CUST-9003,2026-10,2100000`;

export default function DataManagementPage() {
  const [importType, setImportType] = useState('customers');
  const [csvContent, setCsvContent] = useState('');
  const [step, setStep] = useState(1); // 1: Input/Select, 2: Preview & Validation, 3: Completed Summary

  const [previewData, setPreviewData] = useState(null);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const loadSample = (type) => {
    setImportType(type);
    if (type === 'customers') setCsvContent(SAMPLE_CUSTOMERS_CSV);
    else if (type === 'transactions') setCsvContent(SAMPLE_TX_CSV);
    else if (type === 'balances') setCsvContent(SAMPLE_BAL_CSV);
    setPreviewData(null);
    setStep(1);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvContent(event.target.result);
      setPreviewData(null);
      setStep(1);
    };
    reader.readAsText(file);
  };

  const handlePreview = async () => {
    setErrorMessage('');
    if (!csvContent.trim()) {
      setErrorMessage('Please select a CSV file or paste valid CSV content.');
      return;
    }

    setValidating(true);
    try {
      const res = await dataApi.previewCsv(csvContent, importType);
      setPreviewData(res);
      setStep(2);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to preview CSV content.');
    } finally {
      setValidating(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!previewData) return;
    setImporting(true);
    setErrorMessage('');

    // Convert raw preview lines into mapped object records
    const lines = csvContent.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
    const headers = previewData.headers;
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h.trim()] = parts[idx] || '';
      });
      rows.push(obj);
    }

    try {
      const res = await dataApi.executeImport({
        importType,
        rows,
      });
      setImportResult(res.summary);
      setStep(3);
    } catch (err) {
      setErrorMessage(err.message || 'Import transaction failed.');
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setCsvContent('');
    setPreviewData(null);
    setImportResult(null);
    setErrorMessage('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Data Management & CSV Import Workflow</h2>
          <p className="text-xs text-slate-500">
            Transactional 8-step pipeline: preview, schema validation, duplicate detection, and database transactional commit
          </p>
        </div>
      </div>

      {/* Workflow Step Tracker */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between text-xs">
        <div className={`flex items-center gap-2 font-bold ${step >= 1 ? 'text-blue-600' : 'text-slate-400'}`}>
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">1</span>
          <span>Select & Paste CSV</span>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-300" />
        <div className={`flex items-center gap-2 font-bold ${step >= 2 ? 'text-blue-600' : 'text-slate-400'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>2</span>
          <span>Preview & Validate Schema</span>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-300" />
        <div className={`flex items-center gap-2 font-bold ${step === 3 ? 'text-teal-600' : 'text-slate-400'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 3 ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-400'}`}>3</span>
          <span>Transactional Commit Summary</span>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STEP 1: Input / File / Type Selection */}
      {step === 1 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <label className="block font-bold text-slate-800 text-sm mb-1">Choose Import Entity Target:</label>
              <div className="flex items-center gap-2">
                {[
                  { id: 'customers', label: 'Corporate Customers' },
                  { id: 'transactions', label: 'Monthly Transactions' },
                  { id: 'balances', label: 'Operating Balances' },
                  { id: 'complaints', label: 'Service Complaints' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setImportType(item.id); setCsvContent(''); }}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                      importType === item.id ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Sample Template Loader */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">Load Sample:</span>
              <button
                onClick={() => loadSample(importType)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold transition"
              >
                Load {importType} template
              </button>
            </div>
          </div>

          {/* Upload or Paste */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Upload CSV File</label>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 transition">
                <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <label className="cursor-pointer">
                  <span className="text-blue-600 font-semibold hover:underline">Click to browse file</span>
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                </label>
                <p className="text-[11px] text-slate-400 mt-1">Accepts standard .csv format with header line</p>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Or Paste CSV Content Directly</label>
              <textarea
                rows={7}
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                placeholder="id,company_name,industry,business_segment..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handlePreview}
              disabled={validating || !csvContent.trim()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold flex items-center gap-2 transition shadow-xs"
            >
              {validating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              Preview & Validate CSV Data
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Preview, Validation & Schema Confirmation */}
      {step === 2 && previewData && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">CSV Preview & Schema Inspection</h3>
              <p className="text-slate-400 text-[11px]">
                Detected {previewData.headers.length} columns and {previewData.totalRows} data rows for entity '{previewData.importType}'
              </p>
            </div>
            <button
              onClick={() => setStep(1)}
              className="text-xs text-slate-500 hover:text-slate-800 underline"
            >
              Back to Input
            </button>
          </div>

          {/* Table Preview */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-72 overflow-y-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  {previewData.headers.map(h => (
                    <th key={h} className="py-2 px-3 whitespace-nowrap bg-slate-100">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {previewData.previewRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 font-mono text-[11px]">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2 px-3 whitespace-nowrap">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-[11px] leading-relaxed">
            <strong>Database Transaction Protection:</strong> The backend will execute this import in an atomic SQL transaction. If an invalid row or foreign key failure occurs, existing records will be protected and detailed row-by-row error logs will be provided.
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteImport}
              disabled={importing}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg font-bold flex items-center gap-2 transition shadow-xs"
            >
              {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirm & Execute Database Import
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Completed Summary */}
      {step === 3 && importResult && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">CSV Import Completed Successfully!</h3>
              <p className="text-slate-500">Atomic database transaction committed.</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-slate-400 block font-semibold text-[11px]">Total Rows Processed</span>
              <span className="text-xl font-bold text-slate-800">{importResult.totalProcessed}</span>
            </div>
            <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl">
              <span className="text-teal-800 block font-semibold text-[11px]">Successfully Imported</span>
              <span className="text-xl font-bold text-teal-700">{importResult.validCount}</span>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-slate-400 block font-semibold text-[11px]">Skipped / Errors</span>
              <span className="text-xl font-bold text-slate-700">{importResult.errorCount}</span>
            </div>
          </div>

          {/* Errors list if any */}
          {importResult.errors && importResult.errors.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <h4 className="font-bold text-amber-900">Import Exceptions Logged:</h4>
              <ul className="list-disc pl-5 text-amber-800 space-y-1 text-[11px]">
                {importResult.errors.map((err, idx) => (
                  <li key={idx}>Row {err.row}: {err.error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleReset}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs"
            >
              Perform Another Import
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
