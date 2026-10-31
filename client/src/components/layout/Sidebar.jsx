import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  LineChart,
  AlertTriangle,
  ShieldAlert,
  UserCheck,
  Target,
  FileSpreadsheet,
  Database,
  Settings,
  ChevronLeft,
  ChevronRight,
  Landmark,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Corporate Customers', path: '/customers', icon: Building2 },
  { name: 'Relationship Analytics', path: '/analytics', icon: LineChart },
  { name: 'Early Warning System', path: '/alerts', icon: AlertTriangle },
  { name: 'Attrition Risk Analysis', path: '/risk', icon: ShieldAlert },
  { name: 'Retention Management', path: '/retention', icon: UserCheck },
  { name: 'Campaign Analytics', path: '/campaigns', icon: Target },
  { name: 'Reports & Exports', path: '/reports', icon: FileSpreadsheet },
  { name: 'Data Management', path: '/data', icon: Database },
  { name: 'System Settings', path: '/settings', icon: Settings },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  return (
    <aside
      className={`bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 ease-in-out border-r border-slate-800 z-30 select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shrink-0 shadow-lg shadow-blue-500/20">
            <Landmark className="w-6 h-6" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-white font-bold tracking-tight text-lg leading-tight truncate">
                Bank<span className="text-blue-400">Retain</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider truncate">
                Corporate Retention
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group relative ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.name}</span>}
              {collapsed && (
                <div className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition whitespace-nowrap z-50">
                  {item.name}
                </div>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* System Classification Banner */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        {!collapsed ? (
          <div className="text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-teal-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
              Rule-Based Analytics Engine
            </div>
            <p className="text-[10px] leading-tight text-slate-500">
              Deterministic scoring • No machine learning • ISO-compliant audit logs
            </p>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" title="System Active"></span>
          </div>
        )}
      </div>
    </aside>
  );
}
