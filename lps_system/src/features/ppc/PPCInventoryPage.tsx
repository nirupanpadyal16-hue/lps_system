import React, { useState, useEffect, useRef } from 'react';
import { ppcApi } from '../../api/newRolesApi';
import toast from 'react-hot-toast';

interface InventoryItem {
  id: number;
  serial_number: number;
  demand_id: number;
  demand_formatted_id: string;
  vehicle_name: string;
  sap_part_number: string;
  part_description: string;
  initial_stock: number;
  produced_qty: number;
  current_stock: number;
  demand_quantity: number;
  shortage_quantity: number;
  status: string;
  rm_status: string;
}

const STATUS_COLORS: Record<string, string> = {
  SUFFICIENT: 'bg-green-100 text-green-700',
  SHORTAGE: 'bg-red-100 text-red-700',
  IN_PRODUCTION: 'bg-blue-100 text-blue-700',
  PRODUCTION_DONE: 'bg-emerald-100 text-emerald-800',
  DISPATCHED: 'bg-gray-100 text-gray-600',
};

const PPCInventoryPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [demandFilter, setDemandFilter] = useState('');
  const [uploadResult, setUploadResult] = useState<{ updated: number; not_found: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchInventory = () => {
    setLoading(true);
    ppcApi.getInventory()
      .then(r => setItems(r.data?.data || []))
      .catch(() => toast.error('Failed to load inventory'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchInventory(); }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const res = await ppcApi.uploadStock(file);
      const data = res.data;
      if (data.success) {
        setUploadResult({ updated: data.updated || 0, not_found: data.not_found || [] });
        toast.success(`Updated ${data.updated} inventory items`);
        fetchInventory();
      } else {
        toast.error(data.message || 'Upload failed');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const filtered = items.filter(item => {
    const matchSearch =
      item.sap_part_number?.toLowerCase().includes(search.toLowerCase()) ||
      item.part_description?.toLowerCase().includes(search.toLowerCase()) ||
      item.vehicle_name?.toLowerCase().includes(search.toLowerCase());
    const matchDemand = !demandFilter || item.demand_formatted_id === demandFilter;
    return matchSearch && matchDemand;
  });

  const uniqueDemands = [...new Set(items.map(i => i.demand_formatted_id).filter(Boolean))];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">Upload current stock via Excel to update initial stock levels</p>
        </div>

        {/* Excel Upload Button */}
        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
            id="stock-upload"
          />
          <label
            htmlFor="stock-upload"
            className={`
              cursor-pointer flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all
              ${uploading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md'}
            `}
          >
            {uploading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Uploading...
              </>
            ) : (
              <>📤 Upload Stock Excel</>
            )}
          </label>
        </div>
      </div>

      {/* Upload result banner */}
      {uploadResult && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="font-medium text-green-800">✅ Stock updated for {uploadResult.updated} parts</div>
          {uploadResult.not_found.length > 0 && (
            <div className="mt-2 text-sm text-amber-700">
              ⚠️ {uploadResult.not_found.length} part(s) not found in system:
              <span className="ml-1 font-mono text-xs">{uploadResult.not_found.slice(0, 5).join(', ')}</span>
              {uploadResult.not_found.length > 5 && ` +${uploadResult.not_found.length - 5} more`}
            </div>
          )}
          <p className="mt-1 text-xs text-gray-500">Excel format: Column "SAP PART NUMBER" → "STOCK"</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search part, description, vehicle..."
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
        <span className="flex items-center text-sm text-gray-500">
          {filtered.length} / {items.length} items
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {['#', 'Demand', 'SAP Part No.', 'Description', 'Vehicle', 'Initial Stock', 'Produced', 'Total Stock', 'Demand Qty', 'Shortage', 'Status'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.map(item => (
                <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${item.shortage_quantity > 0 ? 'bg-red-50/30' : ''}`}>
                  <td className="px-3 py-3 text-gray-400 text-xs">{item.serial_number || item.id}</td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                      {item.demand_formatted_id || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs font-medium text-gray-800">{item.sap_part_number}</td>
                  <td className="px-3 py-3 text-gray-600 max-w-xs truncate" title={item.part_description}>
                    {item.part_description || '—'}
                  </td>
                  <td className="px-3 py-3 text-gray-600">{item.vehicle_name || '—'}</td>
                  <td className="px-3 py-3 text-right font-medium text-gray-800">
                    {(item.initial_stock ?? 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-blue-700">
                    +{(item.produced_qty ?? 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-gray-900">
                    {(item.current_stock ?? 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-right text-gray-600">{(item.demand_quantity ?? 0).toLocaleString()}</td>
                  <td className="px-3 py-3 text-right">
                    {item.shortage_quantity > 0 ? (
                      <span className="font-bold text-red-600">-{item.shortage_quantity.toLocaleString()}</span>
                    ) : (
                      <span className="text-green-600">✓ OK</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-600'}`}>
                      {item.status}
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

export default PPCInventoryPage;
