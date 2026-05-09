import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { skApi } from '../../api/newRolesApi';
import SKRMQueuePage from './SKRMQueuePage';
import SKDispatchPage from './SKDispatchPage';
import SKDispatchHistoryPage from './SKDispatchHistoryPage';

const SKDashboardPage: React.FC = () => {
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [pendingRM, setPendingRM] = useState(0);
  const [dispatchReady, setDispatchReady] = useState(0);

  useEffect(() => {
    skApi.getNotifications().then(r => setUnread(r.data?.unread_count || 0)).catch(() => {});
    skApi.getRMQueue('SUBMITTED').then(r => setPendingRM(r.data?.data?.length || 0)).catch(() => {});
    skApi.getDispatchQueue().then(r => setDispatchReady(r.data?.data?.length || 0)).catch(() => {});
  }, [location.pathname]);

  const navItems = [
    { to: '/storekeeper/rm-queue', label: 'RM Queue', icon: '📋', badge: pendingRM },
    { to: '/storekeeper/dispatch', label: 'Dispatch', icon: '🚚', badge: dispatchReady },
    { to: '/storekeeper/dispatch-history', label: 'History', icon: '📜' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Store Keeper Dashboard</h1>
            <p className="text-emerald-100 text-sm mt-0.5">Manage RM acceptance and production dispatch</p>
          </div>
          <div className="flex items-center gap-6 text-center">
            <div className="bg-white/20 rounded-xl px-4 py-2">
              <div className="text-2xl font-bold">{pendingRM}</div>
              <div className="text-xs text-emerald-100">Pending RM</div>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-2">
              <div className="text-2xl font-bold">{dispatchReady}</div>
              <div className="text-xs text-emerald-100">Ready to Dispatch</div>
            </div>
            {unread > 0 && (
              <div className="bg-red-500 rounded-xl px-4 py-2">
                <div className="text-2xl font-bold">{unread}</div>
                <div className="text-xs text-red-100">Notifications</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="bg-white border-b border-gray-200 px-6">
        <nav className="flex space-x-1">
          {navItems.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={`
                relative flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                ${location.pathname === item.to || location.pathname.startsWith(item.to + '/')
                  ? 'border-emerald-600 text-emerald-700'
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
          <Route index element={<Navigate to="rm-queue" replace />} />
          <Route path="rm-queue/*" element={<SKRMQueuePage />} />
          <Route path="dispatch/*" element={<SKDispatchPage />} />
          <Route path="dispatch-history/*" element={<SKDispatchHistoryPage />} />
        </Routes>
      </div>
    </div>
  );
};

export default SKDashboardPage;
