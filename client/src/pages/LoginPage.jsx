import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, Lock, User, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { authApi } from '../services/api';

export default function LoginPage({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (u, p) => {
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(u || username, p || password);
      if (res.token) {
        localStorage.setItem('bankretain_token', res.token);
      }
      onLoginSuccess(res.user);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleLogin();
  };

  const handleQuickDemoLogin = (userType) => {
    if (userType === 'admin') {
      setUsername('admin');
      setPassword('Admin@123');
      handleLogin('admin', 'Admin@123');
    } else if (userType === 'rm') {
      setUsername('rm_sarah');
      setPassword('Rm@123');
      handleLogin('rm_sarah', 'Rm@123');
    } else if (userType === 'analyst') {
      setUsername('analyst_john');
      setPassword('Analyst@123');
      handleLogin('analyst_john', 'Analyst@123');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-blue-600 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="w-14 h-14 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
          <Landmark className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">
          Bank<span className="text-blue-500">Retain</span>
        </h2>
        <p className="text-xs text-slate-400 font-medium">
          Corporate Banking Customer Attrition Analytics & Retention Management System
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 py-8 px-6 shadow-2xl rounded-2xl border border-slate-800 space-y-6 sm:px-10 text-xs">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Corporate User ID / Email</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  placeholder="admin"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition shadow-lg shadow-blue-600/30 text-xs"
            >
              {loading ? 'Authenticating...' : 'Sign In to Banking Console'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Login Box */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block text-center">
              Quick Demonstration Access
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('admin')}
                className="w-full py-2 px-3 bg-slate-800/80 hover:bg-slate-800 text-slate-200 rounded-lg text-left flex items-center justify-between transition border border-slate-700/60"
              >
                <div>
                  <div className="font-bold text-white">Sarah Jenkins</div>
                  <div className="text-[10px] text-slate-400">Executive Administrator (All access)</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">Admin</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('rm')}
                className="w-full py-2 px-3 bg-slate-800/80 hover:bg-slate-800 text-slate-200 rounded-lg text-left flex items-center justify-between transition border border-slate-700/60"
              >
                <div>
                  <div className="font-bold text-white">Marcus Vance</div>
                  <div className="text-[10px] text-slate-400">Senior Relationship Manager</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">RM</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('analyst')}
                className="w-full py-2 px-3 bg-slate-800/80 hover:bg-slate-800 text-slate-200 rounded-lg text-left flex items-center justify-between transition border border-slate-700/60"
              >
                <div>
                  <div className="font-bold text-white">Elena Rostova</div>
                  <div className="text-[10px] text-slate-400">Portfolio Analytics Viewer</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-400">Analyst</span>
              </button>
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-500 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>256-bit encrypted • Role-based access control</span>
          </div>
        </div>
      </div>
    </div>
  );
}
