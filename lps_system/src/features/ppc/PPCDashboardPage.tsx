import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { ppcApi } from '../../api/newRolesApi';
import PPCDemandPage from './PPCDemandPage';
import PPCInventoryPage from './PPCInventoryPage';
import PPCMachineRegistryPage from './PPCMachineRegistryPage';
import PPCRMRequestsPage from './PPCRMRequestsPage';

const PPCDashboardPage: React.FC = () => {
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    ppcApi.getNotifications().then(r => {
      setUnread(r.data?.unread_count || 0);
    }).catch(() => {});
  }, [location.pathname]);

  const navItems = [
    { to: '/ppc/demand', label: 'New Demand', icon: '📋' },
    { to: '/ppc/inventory', label: 'Inventory', icon: '📦' },
    { to: '/ppc/machine-registry', label: 'Machine Registry', icon: '🏭' },
    { to: '/ppc/rm-requests', label: 'RM Requests', icon: '📄', badge: unread },
  ];

  const currentPath = location.pathname;

  return (
    <div className="flex flex-col h-full">
      {/* Page content */}
      <div className="flex-1 overflow-auto">
        <Routes>
          <Route index element={<Navigate to="demand" replace />} />
          <Route path="demand/*" element={<PPCDemandPage />} />
          <Route path="inventory/*" element={<PPCInventoryPage />} />
          <Route path="machine-registry/*" element={<PPCMachineRegistryPage />} />
          <Route path="rm-requests/*" element={<PPCRMRequestsPage />} />
        </Routes>
      </div>
    </div>
  );
};

export default PPCDashboardPage;
