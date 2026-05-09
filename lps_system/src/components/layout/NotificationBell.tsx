import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { getUser, getToken } from '../../lib/storage';
import { API_BASE } from '../../lib/apiConfig';

const ROLE_API: Record<string, string> = {
  Supervisor: `${API_BASE}/supervisor/notifications`,
  Store_Keeper: `${API_BASE}/storekeeper/notifications`,
  PPC_Planner: `${API_BASE}/ppc/notifications`,
  Admin: `${API_BASE}/supervisor/notifications`,
};

const ROLE_MARK_READ: Record<string, string> = {
  Supervisor: `${API_BASE}/supervisor/notifications/mark-all-read`,
  Store_Keeper: `${API_BASE}/storekeeper/notifications/mark-all-read`,
  Admin: `${API_BASE}/supervisor/notifications/mark-all-read`,
};

const NotificationBell: React.FC = () => {
  const user = getUser();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    const role = user?.role;
    if (!role || !ROLE_API[role]) return;
    try {
      const res = await fetch(ROLE_API[role], {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.data || []);
        setUnread(data.unread_count || 0);
      }
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    const url = ROLE_MARK_READ[user?.role || ''];
    if (!url) return;
    try {
      await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
      setUnread(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch { /* silent */ }
  };

  if (!ROLE_API[user?.role || '']) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(o => !o); }}
        className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
        title="Notifications"
      >
        <Bell size={20} className="text-gray-600" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-black animate-pulse">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-[200] w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-black text-sm text-gray-800">Notifications</h3>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">No notifications</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50/30' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.is_read && <div className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />}
                    <div className={!n.is_read ? '' : 'ml-4'}>
                      <div className="text-xs font-bold text-gray-800">{n.title}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">{n.message}</div>
                      <div className="text-[10px] text-gray-400 mt-1">
                        {n.created_at ? new Date(n.created_at).toLocaleString('en-IN') : ''}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
