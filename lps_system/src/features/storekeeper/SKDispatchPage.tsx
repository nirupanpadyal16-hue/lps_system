import React, { useState, useEffect } from 'react';
import { skApi } from '../../api/newRolesApi';
import toast from 'react-hot-toast';

const SKDispatchPage: React.FC = () => {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDemand, setSelectedDemand] = useState<any | null>(null);
  const [form, setForm] = useState({
    quantity_dispatched: '',
    vehicle_count: '',
    client_name: '',
    challan_number: '',
    dispatch_notes: '',
  });
  const [dispatching, setDispatching] = useState(false);

  const fetchQueue = () => {
    setLoading(true);
    skApi.getDispatchQueue()
      .then(r => setQueue(r.data?.data || []))
      .catch(() => toast.error('Failed to load dispatch queue'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchQueue(); }, []);

  const openDispatch = (entry: any) => {
    const d = entry.demand;
    setSelectedDemand(entry);
    setForm({
      quantity_dispatched: entry.parts?.reduce((s: number, p: any) => s + (p.demand_quantity || 0), 0)?.toString() || '',
      vehicle_count: d?.quantity?.toString() || '',
      client_name: d?.customer || '',
      challan_number: '',
      dispatch_notes: '',
    });
  };

  const handleDispatch = async () => {
    if (!selectedDemand) return;
    if (!form.client_name.trim()) { toast.error('Client name is required'); return; }
    setDispatching(true);
    try {
      await skApi.createDispatch({
        demand_id: selectedDemand.demand?.id,
        inventory_item_ids: selectedDemand.parts?.map((p: any) => p.id) || [],
        quantity_dispatched: parseFloat(form.quantity_dispatched) || 0,
        vehicle_count: parseInt(form.vehicle_count) || 0,
        client_name: form.client_name,
        challan_number: form.challan_number,
        dispatch_notes: form.dispatch_notes,
      });
      toast.success('Parts dispatched successfully!');
      setSelectedDemand(null);
      fetchQueue();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Dispatch failed');
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ready for Dispatch</h1>
        <p className="text-sm text-gray-500 mt-1">Parts that are fully manufactured and ready to be dispatched to the client</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : queue.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🚚</p>
          <p>No items ready for dispatch yet</p>
          <p className="text-xs mt-2">Parts will appear here when production is complete</p>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map((entry, i) => (
            <div key={i} className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-mono text-sm font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      {entry.demand?.formatted_id}
                    </span>
                    <span className="text-base font-semibold text-gray-800">{entry.demand?.model_name}</span>
                    <span className="text-sm text-gray-500">Qty: {entry.demand?.quantity}</span>
                    <span className="text-sm text-gray-500">Client: {entry.demand?.customer}</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="text-xs divide-y divide-gray-200">
                      <thead>
                        <tr className="text-gray-400">
                          <th className="pr-4 py-1 text-left">SAP Part</th>
                          <th className="pr-4 py-1 text-right">Produced</th>
                          <th className="pr-4 py-1 text-right">Required</th>
                          <th className="py-1 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(entry.parts || []).map((part: any) => (
                          <tr key={part.id}>
                            <td className="pr-4 py-1 font-mono font-medium text-gray-800">{part.sap_part_number}</td>
                            <td className="pr-4 py-1 text-right text-blue-700 font-semibold">{(part.produced_qty || 0).toLocaleString()}</td>
                            <td className="pr-4 py-1 text-right text-gray-600">{(part.demand_quantity || 0).toLocaleString()}</td>
                            <td className="py-1">
                              <span className="bg-emerald-100 text-emerald-700 text-xs rounded-full px-2 py-0.5">
                                {part.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <button
                  onClick={() => openDispatch(entry)}
                  className="ml-4 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 shadow-sm transition-all"
                >
                  🚚 Dispatch
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dispatch Modal */}
      {selectedDemand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 rounded-t-2xl text-white">
              <h2 className="text-lg font-bold">Create Dispatch Record</h2>
              <p className="text-emerald-100 text-sm mt-0.5">
                {selectedDemand.demand?.formatted_id} · {selectedDemand.demand?.model_name}
              </p>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              {[
                { key: 'client_name', label: 'Client Name *', placeholder: 'e.g. Maruti Suzuki', span: 2 },
                { key: 'quantity_dispatched', label: 'Qty Dispatched', placeholder: 'Total qty', type: 'number' },
                { key: 'vehicle_count', label: 'Vehicle Count', placeholder: 'No. of vehicles', type: 'number' },
                { key: 'challan_number', label: 'Challan / Doc Number', placeholder: 'e.g. CH-2025-001' },
                { key: 'dispatch_notes', label: 'Notes', placeholder: 'Any delivery notes...', span: 2, textarea: true },
              ].map(field => (
                <div key={field.key} className={field.span === 2 ? 'col-span-2' : ''}>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{field.label}</label>
                  {field.textarea ? (
                    <textarea
                      value={form[field.key as keyof typeof form]}
                      onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                      rows={2}
                      placeholder={field.placeholder}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  ) : (
                    <input
                      type={field.type || 'text'}
                      value={form[field.key as keyof typeof form]}
                      onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => setSelectedDemand(null)}
                className="flex-1 rounded-lg border border-gray-300 text-gray-600 py-2 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDispatch}
                disabled={dispatching}
                className="flex-1 rounded-lg bg-emerald-600 text-white py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {dispatching && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                🚚 Confirm Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SKDispatchPage;
