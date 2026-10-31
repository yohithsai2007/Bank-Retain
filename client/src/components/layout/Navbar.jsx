import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Calendar,
  User,
  Shield,
  LogOut,
  ChevronDown,
  Building,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { customerApi, alertApi } from '../../services/api';

const PAGE_TITLES = {
  '/': 'Executive Attrition & Retention Dashboard',
  '/customers': 'Corporate Customer Directory & Portfolio',
  '/analytics': 'Corporate Relationship Analytics',
  '/alerts': 'Early Warning System (EWS)',
  '/risk': 'Transparent Attrition Risk Analysis',
  '/retention': 'Retention Management & Follow-Up Tasks',
  '/campaigns': 'Retention Campaign Analytics (RCT)',
  '/reports': 'Executive Reports & CSV Exports',
  '/data': 'Data Management & CSV Import Workflow',
  '/settings': 'System Scoring Weights & Thresholds Configuration',
};

export default function Navbar({ currentUser, onSwitchUser, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef(null);

  // Notification state
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [showAlertDropdown, setShowAlertDropdown] = useState(false);
  const notifRef = useRef(null);

  // User menu state
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userRef = useRef(null);

  // Current formatted date
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  // Determine current page title
  const currentTitle = PAGE_TITLES[location.pathname] || (
    location.pathname.startsWith('/customers/') ? 'Customer Detailed Portfolio Profile' : 'BankRetain'
  );

  // Close popovers on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowAlertDropdown(false);
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setShowUserDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch quick alerts for notification badge
  useEffect(() => {
    alertApi.getAlerts({ status: 'Active', limit: 5 })
      .then(res => {
        if (res?.data) setActiveAlerts(res.data);
      })
      .catch(() => {});
  }, [location.pathname]);

  // Handle global search debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await customerApi.getCustomers({ search: searchQuery, limit: 5 });
        if (res?.data) {
          setSearchResults(res.data);
          setShowSearchDropdown(true);
        }
      } catch (err) {
        // silent
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectCustomer = (id) => {
    setShowSearchDropdown(false);
    setSearchQuery('');
    navigate(`/customers/${id}`);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20 shadow-sm">
      {/* Title & Path */}
      <div className="flex flex-col">
        <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-tight">
          {currentTitle}
        </h1>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span>Enterprise Portal</span>
          <span>/</span>
          <span className="text-slate-600 font-medium capitalize">
            {location.pathname.replace('/', '') || 'Dashboard'}
          </span>
        </div>
      </div>

      {/* Center & Right Actions */}
      <div className="flex items-center gap-4">
        {/* Global Customer Search */}
        <div className="relative w-72" ref={searchRef}>
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (searchResults.length > 0) setShowSearchDropdown(true); }}
              placeholder="Search customers by name, ID..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* Search Dropdown */}
          {showSearchDropdown && searchResults.length > 0 && (
            <div className="absolute top-full mt-1.5 left-0 w-80 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50">
              <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Matching Corporate Customers
              </div>
              {searchResults.map((cust) => (
                <button
                  key={cust.id}
                  onClick={() => handleSelectCustomer(cust.id)}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-xs transition border-b border-slate-100 last:border-0"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Building className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="truncate">
                      <div className="font-semibold text-slate-800 truncate">{cust.company_name}</div>
                      <div className="text-[10px] text-slate-400">{cust.id} • {cust.industry}</div>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 ml-2 px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      cust.risk_category === 'Critical'
                        ? 'bg-red-100 text-red-700'
                        : cust.risk_category === 'High'
                        ? 'bg-amber-100 text-amber-800'
                        : cust.risk_category === 'Medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-teal-100 text-teal-800'
                    }`}
                  >
                    {cust.risk_score}/100
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date Display */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100/80 px-2.5 py-1.5 rounded-lg border border-slate-200">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{todayFormatted}</span>
        </div>

        {/* Notification Bell with Active Alerts */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowAlertDropdown(!showAlertDropdown)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition relative"
            title="Early Warning Notifications"
          >
            <Bell className="w-5 h-5" />
            {activeAlerts.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                {activeAlerts.length}
              </span>
            )}
          </button>

          {showAlertDropdown && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50">
              <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Early Warning Alerts</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">
                  {activeAlerts.length} Unresolved
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                {activeAlerts.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No active critical alerts at this time.
                  </div>
                ) : (
                  activeAlerts.map((alt) => (
                    <div
                      key={alt.id}
                      onClick={() => {
                        setShowAlertDropdown(false);
                        navigate('/alerts');
                      }}
                      className="p-3 hover:bg-slate-50 cursor-pointer transition text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-800 truncate">{alt.company_name}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            alt.severity === 'Critical'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {alt.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{alt.alert_type}</p>
                      <span className="text-[10px] text-slate-400">{alt.observed_value}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="p-2 border-t border-slate-100 text-center">
                <button
                  onClick={() => {
                    setShowAlertDropdown(false);
                    navigate('/alerts');
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                >
                  View All Early Warning Alerts →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-lg hover:bg-slate-100 transition border border-transparent hover:border-slate-200"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs border border-blue-200 shadow-sm">
              {currentUser?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-800 leading-tight">
                {currentUser?.fullName || 'Sarah Jenkins'}
              </span>
              <span className="text-[10px] text-slate-400 capitalize">
                {currentUser?.role?.replace('_', ' ') || 'Administrator'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 text-xs">
              <div className="px-3 py-2 border-b border-slate-100">
                <div className="font-bold text-slate-800">{currentUser?.fullName}</div>
                <div className="text-[11px] text-slate-400">{currentUser?.email}</div>
                <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  <Shield className="w-3 h-3" />
                  Role: {currentUser?.role}
                </div>
              </div>

              {/* Demo Role Switcher */}
              <div className="p-2 border-b border-slate-100 bg-slate-50">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">
                  Demo Role Switcher
                </div>
                <div className="grid grid-cols-1 gap-1">
                  <button
                    onClick={() => {
                      onSwitchUser({ id: 1, username: 'admin', fullName: 'Sarah Jenkins', email: 'admin@bankretain.internal', role: 'admin' });
                      setShowUserDropdown(false);
                    }}
                    className={`px-2 py-1 text-left rounded text-[11px] transition ${
                      currentUser?.role === 'admin' ? 'bg-blue-600 text-white font-semibold' : 'hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Administrator (Sarah J.)
                  </button>
                  <button
                    onClick={() => {
                      onSwitchUser({ id: 2, username: 'rm_sarah', fullName: 'Marcus Vance', email: 'marcus.v@bankretain.internal', role: 'relationship_manager' });
                      setShowUserDropdown(false);
                    }}
                    className={`px-2 py-1 text-left rounded text-[11px] transition ${
                      currentUser?.role === 'relationship_manager' ? 'bg-blue-600 text-white font-semibold' : 'hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Relationship Manager (Marcus V.)
                  </button>
                  <button
                    onClick={() => {
                      onSwitchUser({ id: 3, username: 'analyst_john', fullName: 'Elena Rostova', email: 'elena.r@bankretain.internal', role: 'analytics_viewer' });
                      setShowUserDropdown(false);
                    }}
                    className={`px-2 py-1 text-left rounded text-[11px] transition ${
                      currentUser?.role === 'analytics_viewer' ? 'bg-blue-600 text-white font-semibold' : 'hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Analytics Viewer (Elena R.)
                  </button>
                </div>
              </div>

              <div className="p-1">
                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out of BankRetain
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
