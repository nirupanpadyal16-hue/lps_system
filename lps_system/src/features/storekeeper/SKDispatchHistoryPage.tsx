import React, { useState, useEffect } from 'react';
import { skApi } from '../../api/newRolesApi';
import toast from 'react-hot-toast';

const SKDispatchHistoryPage: React.FC = () => {
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    skApi.getDispatches()
      .then(r => setDispatches(r.data?.data || []))
      .catch(() => toast.error('Failed to load dispatch history'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = dispatches.filter(d =>
    d.formatted_id?.toLowerCase().includes(search.toLowerCase()) ||
    d.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.challan_number?.toLowerCase().includes(search.toLowerCase()) ||
    d.demand_formatted_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dispatch History</h1>
          <p className="text-sm text-gray-500 mt-1">All completed dispatch records</p>
        </div>
        <input
          type="text"
          placeholder="Search by dispatch ID, client, challan..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📜</p>
          <p>No dispatch records found</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Dispatch ID', 'Demand', 'Client', 'Qty Dispatched', 'Vehicles', 'Challan No.', 'Date', 'By', 'Status'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.map(d => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-3 font-mono font-bold text-emerald-700">{d.formatted_id}</td>
                  <td className="px-3 py-3 font-mono text-blue-700 text-xs">{d.demand_formatted_id || '—'}</td>
                  <td className="px-3 py-3 font-medium text-gray-800">{d.client_name || '—'}</td>
                  <td className="px-3 py-3 text-right font-semibold text-gray-800">{(d.quantity_dispatched || 0).toLocaleString()}</td>
                  <td className="px-3 py-3 text-right text-gray-600">{d.vehicle_count || '—'}</td>
                  <td className="px-3 py-3 font-mono text-xs text-gray-600">{d.challan_number || '—'}</td>
                  <td className="px-3 py-3 text-gray-500 text-xs">
                    {d.dispatch_date ? new Date(d.dispatch_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-3 py-3 text-gray-500 text-xs">{d.store_keeper_name || '—'}</td>
                  <td className="px-3 py-3">
                    <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">
                      {d.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SKDispatchHistoryPage;
