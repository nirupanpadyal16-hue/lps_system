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
    skApi.getNotifications().then(r => setUnread(r.data?.unread_count || 0)).catch(() => { });
    skApi.getRMQueue('SUBMITTED').then(r => setPendingRM(r.data?.data?.length || 0)).catch(() => { });
    skApi.getDispatchQueue().then(r => setDispatchReady(r.data?.data?.length || 0)).catch(() => { });
  }, [location.pathname]);

  const navItems = [
    { to: '/storekeeper/rm-queue', label: 'RM Queue', icon: '📋', badge: pendingRM },
    { to: '/storekeeper/dispatch', label: 'Dispatch', icon: '🚚', badge: dispatchReady },
    { to: '/storekeeper/dispatch-history', label: 'History', icon: '📜' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header Banner */}


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