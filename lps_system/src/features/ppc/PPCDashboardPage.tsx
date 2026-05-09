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
      {/* Sub-navigation */}
      <div className="bg-white border-b border-gray-200 px-6">
        <nav className="flex space-x-1">
          {navItems.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={`
                relative flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                ${currentPath === item.to || currentPath.startsWith(item.to + '/')
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'}
              `}
            >
              <span>{item.icon}</span>
              {item.label}
              {item.badge ? (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
      </div>

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
