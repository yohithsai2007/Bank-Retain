import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AlertsPage from './pages/AlertsPage';
import RiskPage from './pages/RiskPage';
import RetentionPage from './pages/RetentionPage';
import CampaignsPage from './pages/CampaignsPage';
import ReportsPage from './pages/ReportsPage';
import DataManagementPage from './pages/DataManagementPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import { authApi } from './services/api';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('bankretain_user');
    return saved ? JSON.parse(saved) : {
      id: 1,
      username: 'admin',
      fullName: 'Sarah Jenkins',
      email: 'admin@bankretain.internal',
      role: 'admin',
    };
  });

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    localStorage.setItem('bankretain_user', JSON.stringify(user));
  };

  const handleSwitchUser = (user) => {
    setCurrentUser(user);
    localStorage.setItem('bankretain_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    localStorage.removeItem('bankretain_token');
    localStorage.removeItem('bankretain_user');
    setCurrentUser(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login Route */}
        <Route
          path="/login"
          element={
            currentUser ? (
              <Navigate to="/" replace />
            ) : (
              <LoginPage onLoginSuccess={handleLoginSuccess} />
            )
          }
        />

        {/* Protected Application Routes wrapped in enterprise layout */}
        <Route
          element={
            currentUser ? (
              <AppLayout
                currentUser={currentUser}
                onSwitchUser={handleSwitchUser}
                onLogout={handleLogout}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/risk" element={<RiskPage />} />
          <Route path="/retention" element={<RetentionPage />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/data" element={<DataManagementPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
