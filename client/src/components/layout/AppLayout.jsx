import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function AppLayout({ currentUser, onSwitchUser, onLogout }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Dark Navy Collapsible Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          currentUser={currentUser}
          onSwitchUser={onSwitchUser}
          onLogout={onLogout}
        />

        {/* Page Viewport */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50/70">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
