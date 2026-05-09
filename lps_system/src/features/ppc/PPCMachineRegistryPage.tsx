import React, { useState, useEffect } from 'react';
import { ppcApi } from '../../api/newRolesApi';
import toast from 'react-hot-toast';

interface RegistryItem {
  id: number;
  demand_id: number;
  demand_formatted_id: string;
  vehicle_name: string;
  sap_part_number: string;
  part_description: string;
  current_stock: number;
  demand_quantity: number;
  shortage_quantity: number;
  machine_group: string;
  rm_status: string;
  master_material_data: Record<string, string>;
  rm_request: RMRequest | null;
}

interface RMRequest {
  id: number;
  formatted_id: string;
  status: string;
  rm_thk_mm: string;
  sheet_width: string;
  sheet_length: string;
  rm_size: string;
  rm_grade: string;
  submitted_at: string;
  rejection_reason: string;
}

interface RMFormData {
  rm_thk_mm: string;
  sheet_width: string;
  sheet_length: string;
  no_of_comp_per_sheet: string;
  rm_size: string;
  rm_grade: string;
  act_rm_sizes: string;
  ppc_notes: string;
}

const RM_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-600',
  RM_SUBMITTED: 'bg-yellow-100 text-yellow-700',
  RM_ACCEPTED: 'bg-green-100 text-green-700',
  RM_REJECTED: 'bg-red-100 text-red-700',
};

const DEMAND_COLORS = [
  'border-l-blue-500 bg-blue-50/30',
  'border-l-purple-500 bg-purple-50/30',
  'border-l-orange-500 bg-orange-50/30',
  'border-l-teal-500 bg-teal-50/30',
  'border-l-pink-500 bg-pink-50/30',
];

const PPCMachineRegistryPage: React.FC = () => {
  const [items, setItems] = useState<RegistryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<RegistryItem | null>(null);
  const [rmForm, setRMForm] = useState<RMFormData>({
    rm_thk_mm: '', sheet_width: '', sheet_length: '',
    no_of_comp_per_sheet: '', rm_size: '', rm_grade: '',
    act_rm_sizes: '', ppc_notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [demandFilter, setDemandFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchRegistry = () => {
    setLoading(true);
    ppcApi.getMachineRegistry()
      .then(r => setItems(r.data?.data || []))
      .catch(() => toast.error('Failed to load machine registry'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRegistry(); }, []);

  const openRMForm = (item: RegistryItem) => {
    setSelectedItem(item);
    // Priority: existing RM request > master material data
    const rm = item.rm_request;
    const md = item.master_material_data || {};

    setRMForm({
      rm_thk_mm: rm?.rm_thk_mm || md['RM Thk mm'] || '',
      sheet_width: rm?.sheet_width || md['Sheet Width'] || '',
      sheet_length: rm?.sheet_length || md['Sheet Length'] || '',
      no_of_comp_per_sheet: rm?.no_of_comp_per_sheet || md['No of comp per sheet'] || '',
      rm_size: rm?.rm_size || md['RM SIZE'] || '',
      rm_grade: rm?.rm_grade || md['RM Grade'] || '',
      act_rm_sizes: rm?.act_rm_sizes || md['Act RM Sizes'] || '',
      ppc_notes: rm?.ppc_notes || '',
    });
  };

  const handleSubmitRM = async () => {
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      await ppcApi.submitRM(selectedItem.id, rmForm);
      toast.success(`RM data submitted to Store Keeper for ${selectedItem.sap_part_number}`);
      setSelectedItem(null);
      fetchRegistry();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Build demand color map
  const uniqueDemands = [...new Set(items.map(i => i.demand_formatted_id).filter(Boolean))];
  const demandColorMap = Object.fromEntries(uniqueDemands.map((d, i) => [d, DEMAND_COLORS[i % DEMAND_COLORS.length]]));

  const filtered = items.filter(item => {
    const matchSearch =
      item.sap_part_number?.toLowerCase().includes(search.toLowerCase()) ||
      item.part_description?.toLowerCase().includes(search.toLowerCase());
    const matchDemand = !demandFilter || item.demand_formatted_id === demandFilter;
    return matchSearch && matchDemand;
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Machine Registry — RM Check</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review and submit RM material data for each part. Color-coded by Demand ID.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {uniqueDemands.map(d => (
            <span key={d} className={`text-xs font-semibold px-2 py-1 rounded-full border-l-4 ${demandColorMap[d]}`}>
              {d}
            </span>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search part number, description..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={demandFilter}
          onChange={e => setDemandFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Demands</option>
          {uniqueDemands.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <span className="flex items-center text-sm text-gray-500">{filtered.length} parts</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🏭</p>
          <p>No active demand parts found</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {['Demand', 'SAP Part No.', 'Description', 'Machine', 'Stock', 'Required', 'RM Status', 'Action'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.map(item => (
                <tr key={item.id} className={`border-l-4 transition-colors hover:bg-gray-50 ${demandColorMap[item.demand_formatted_id] || ''}`}>
                  <td className="px-3 py-3">
                    <span className="font-mono text-xs font-bold text-blue-700">{item.demand_formatted_id}</span>
                    <div className="text-xs text-gray-400">{item.vehicle_name}</div>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs font-medium">{item.sap_part_number}</td>
                  <td className="px-3 py-3 text-gray-600 max-w-xs truncate text-xs" title={item.part_description}>
                    {item.part_description || '—'}
                  </td>
                  <td className="px-3 py-3">
                    {item.machine_group ? (
                      <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                        {item.machine_group}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3 text-right font-medium">{(item.current_stock ?? 0).toLocaleString()}</td>
                  <td className="px-3 py-3 text-right text-gray-600">{(item.demand_quantity ?? 0).toLocaleString()}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${RM_STATUS_COLORS[item.rm_status] || 'bg-gray-100 text-gray-500'}`}>
                      {item.rm_status || 'PENDING'}
                    </span>
                    {item.rm_request?.rejection_reason && (
                      <div className="mt-1 text-xs text-red-500 truncate max-w-[120px]" title={item.rm_request.rejection_reason}>
                        ✗ {item.rm_request.rejection_reason}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => openRMForm(item)}
                      disabled={item.rm_status === 'RM_SUBMITTED'}
                      className={`
                        px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                        ${item.rm_status === 'RM_SUBMITTED'
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : item.rm_status === 'RM_REJECTED'
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'}
                      `}
                    >
                      {item.rm_status === 'RM_SUBMITTED' ? 'Submitted' : item.rm_status === 'RM_REJECTED' ? 'Resubmit' : 'Check RM'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* RM Check Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">RM Data Check</h2>
                  <p className="text-blue-200 text-sm mt-0.5">
                    {selectedItem.sap_part_number} · {selectedItem.demand_formatted_id}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-blue-200 hover:text-white text-xl font-bold"
                >✕</button>
              </div>
            </div>

            {/* Part info strip */}
            <div className="bg-blue-50 px-5 py-3 border-b border-blue-100 text-sm">
              <span className="text-gray-600">{selectedItem.part_description}</span>
              {selectedItem.machine_group && (
                <span className="ml-3 text-xs font-medium text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                  🏭 {selectedItem.machine_group}
                </span>
              )}
            </div>

            <div className="p-5 grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
              {[
                { key: 'rm_thk_mm', label: 'RM Thickness (mm)' },
                { key: 'rm_grade', label: 'RM Grade' },
                { key: 'rm_size', label: 'RM Size' },
                { key: 'act_rm_sizes', label: 'Actual RM Sizes' },
                { key: 'sheet_width', label: 'Sheet Width' },
                { key: 'sheet_length', label: 'Sheet Length' },
                { key: 'no_of_comp_per_sheet', label: 'Components / Sheet' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
                  <input
                    type="text"
                    value={rmForm[key as keyof RMFormData]}
                    onChange={e => setRMForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Enter ${label}`}
                  />
                </div>
              ))}
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1">PPC Notes</label>
                <textarea
                  value={rmForm.ppc_notes}
                  onChange={e => setRMForm(f => ({ ...f, ppc_notes: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any notes for Store Keeper..."
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
              <p className="text-xs text-gray-400">
                ⓘ This data is saved separately — master data is not modified.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitRM}
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  Submit to Store Keeper →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PPCMachineRegistryPage;
