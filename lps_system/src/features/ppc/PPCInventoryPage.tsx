import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Package, RefreshCw, Plus, Search, Filter, Download,
    CheckCircle2, AlertTriangle, Clock, ArrowRight, ChevronDown,
    X, Loader2, Boxes, AlertCircle, CheckCircle, Upload, Trash2
} from 'lucide-react';
import { getToken } from '../../lib/storage';
import { API_BASE as API } from '../../lib/apiConfig';
import toast from 'react-hot-toast';

// ─── Types ──────────────────────────────────────────────────────────────────

interface InventoryItem {
    id: number;
    serial_number: number;
    car_model_id: number;
    demand_id: number | null;
    vehicle_name: string;
    sap_part_number: string;
    part_description: string;
    current_stock: number;
    demand_quantity: number;
    shortage_quantity: number;
    status: 'SUFFICIENT' | 'SHORTAGE' | 'PENDING_DEO' | 'IN_PRODUCTION' | 'COMPLETED';
    action: 'STOCK_OK' | 'NEW_DEMAND' | 'PENDING_DEO' | 'GO_TO_PRODUCTION' | 'COMPLETED';
    machine_group?: string;
    created_at: string;
    updated_at: string;
}

interface Demand {
    id: number;
    formatted_id: string;
    model_name: string;
    quantity: number;
}

interface DEOUser {
    id: number;
    name: string;
    username: string;
}

interface SupervisorUser {
    id: number;
    name: string;
}

interface ProductionLine {
    id: number;
    name: string;
    isActive?: boolean;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
});

// ─── Action Badge Component ───────────────────────────────────────────────────

function ActionBadge({ action, onSendToRegistry, sending }: { action: string; onSendToRegistry?: () => void; sending?: boolean }) {
    if (action === 'GO_TO_PRODUCTION') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                <CheckCircle2 size={13} />
                Go to Production
            </span>
        );
    }
    if (action === 'STOCK_OK') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                <CheckCircle2 size={13} />
                Stock OK
            </span>
        );
    }
    if (action === 'COMPLETED' || action === 'READY_FOR_DISPATCH') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                <CheckCircle2 size={13} />
                {action === 'READY_FOR_DISPATCH' ? 'Ready for Dispatch' : 'Completed'}
            </span>
        );
    }
    if (action === 'PENDING_DEO' || action === 'WAITING_RM_APPROVAL' || action === 'IN_PRODUCTION') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold animate-pulse">
                <Clock size={13} />
                {action === 'IN_PRODUCTION' ? 'In Production' : 'In Machine Registry'}
            </span>
        );
    }
    // NEW_DEMAND — one-click: sends shortage request directly to Machine Registry
    return (
        <button
            onClick={onSendToRegistry}
            disabled={sending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-xs font-bold transition-all shadow-sm hover:shadow-md active:scale-95"
        >
            {sending ? <Loader2 size={13} className="animate-spin" /> : <AlertTriangle size={13} />}
            {sending ? 'Sending...' : 'Send to Registry'}
            {!sending && <ArrowRight size={12} />}
        </button>
    );
}

// ─── Add Part Modal ───────────────────────────────────────────────────────────

function AddPartModal({ demands, onClose, onSuccess }: {
    demands: Demand[];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [form, setForm] = useState({
        demand_id: '', vehicle_name: '', sap_part_number: '',
        part_description: '', current_stock: '', demand_quantity: ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleDemandChange = (id: string) => {
        const d = demands.find(d => String(d.id) === id);
        setForm(f => ({
            ...f,
            demand_id: id,
            vehicle_name: d?.model_name || '',
            demand_quantity: d ? String(d.quantity) : ''
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const res = await fetch(`${API}/admin/inventory`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({
                    demand_id: form.demand_id ? Number(form.demand_id) : null,
                    vehicle_name: form.vehicle_name,
                    sap_part_number: form.sap_part_number,
                    part_description: form.part_description,
                    current_stock: Number(form.current_stock),
                    demand_quantity: Number(form.demand_quantity),
                })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                        <Plus size={18} className="text-orange-500" /> Add Inventory Part
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Link to Demand (auto-fills vehicle & qty)</label>
                        <select
                            value={form.demand_id}
                            onChange={e => handleDemandChange(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                        >
                            <option value="">Select a demand (optional)</option>
                            {demands.map(d => (
                                <option key={d.id} value={d.id}>{d.formatted_id} — {d.model_name} (Qty: {d.quantity})</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Vehicle Name</label>
                            <input value={form.vehicle_name} onChange={e => setForm(f => ({ ...f, vehicle_name: e.target.value }))}
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">SAP Part Number</label>
                            <input value={form.sap_part_number} onChange={e => setForm(f => ({ ...f, sap_part_number: e.target.value }))}
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Part Description</label>
                        <input value={form.part_description} onChange={e => setForm(f => ({ ...f, part_description: e.target.value }))}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Current Stock</label>
                            <input type="number" min="0" value={form.current_stock} onChange={e => setForm(f => ({ ...f, current_stock: e.target.value }))}
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Demand Quantity</label>
                            <input type="number" min="0" value={form.demand_quantity} onChange={e => setForm(f => ({ ...f, demand_quantity: e.target.value }))}
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" required />
                        </div>
                    </div>
                    {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={saving}
                            className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold disabled:opacity-60">
                            {saving ? 'Adding...' : 'Add Part'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Shortage Request Modal ──────────────────────────────────────────────────

function ShortageRequestModal({ shortageItems, deos, supervisors, lines, onClose, onSuccess }: {
    shortageItems: InventoryItem[];
    deos: DEOUser[];
    supervisors: SupervisorUser[];
    lines: ProductionLine[];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [deadline, setDeadline] = useState('');
    const [deoId, setDeoId] = useState('');
    const [supervisorId, setSupervisorId] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const filteredDeos = deos;
    const filteredSupervisors = supervisors;
    const loadingStaff = false;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!deadline) { setError('Please set a deadline.'); return; }
        if (!supervisorId) { setError('Please assign a Supervisor.'); return; }
        setSaving(true);
        setError('');
        try {
            const res = await fetch(`${API}/admin/shortage-requests`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({
                    inventory_item_ids: shortageItems.map(i => i.id),
                    deadline,
                    deo_id: Number(deoId),
                    supervisor_id: Number(supervisorId)
                })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            onSuccess();
            onClose();
            toast.success('Demand created successfully');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                            <AlertTriangle size={18} className="text-red-500" /> Create Part Demand
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">Only shortage parts listed</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {shortageItems.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                            <div>
                                <p className="text-xs font-bold text-gray-800">{item.sap_part_number}</p>
                                <p className="text-xs text-gray-500">{item.part_description}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-black text-red-600">
                                    {item.current_stock} / {item.demand_quantity}
                                    <span className="ml-1 text-xs font-semibold text-red-400">(Need {item.shortage_quantity})</span>
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
                <form onSubmit={handleSubmit} className="p-6 border-t border-gray-100 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Deadline</label>
                            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Assign DEO</label>
                            <select value={deoId} onChange={e => setDeoId(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                                <option value="">Select DEO...</option>
                                {filteredDeos.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Assign Supervisor</label>
                            <select value={supervisorId} onChange={e => setSupervisorId(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                                <option value="">Select Supervisor...</option>
                                {filteredSupervisors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold disabled:opacity-60">
                            {saving ? 'Creating...' : 'Create Demand'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Seed Modal ───────────────────────────────────────────────────────────────

function SeedModal({ demands, onClose, onSuccess }: {
    demands: Demand[];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [demandId, setDemandId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSeed = async () => {
        if (!demandId) { setError('Please select a demand.'); return; }
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API}/admin/inventory/seed-from-demand/${demandId}`, {
                method: 'POST', headers: authHeaders()
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            toast.success('Imported successfully');
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <h2 className="text-lg font-black text-gray-900 mb-4">Import from Demand</h2>
                <select value={demandId} onChange={e => setDemandId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 mb-4">
                    <option value="">Select demand...</option>
                    {demands.map(d => (
                        <option key={d.id} value={d.id}>{d.formatted_id} — {d.model_name}</option>
                    ))}
                </select>
                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold">Cancel</button>
                    <button onClick={handleSeed} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white font-bold">
                        {loading ? 'Importing...' : 'Import Parts'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main PPC Inventory Page ──────────────────────────────────────────────────

export default function PPCInventoryPage() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [demands, setDemands] = useState<Demand[]>([]);
    const [deos, setDeos] = useState<DEOUser[]>([]);
    const [supervisors, setSupervisors] = useState<SupervisorUser[]>([]);
    const [lines, setLines] = useState<ProductionLine[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterVehicle, setFilterVehicle] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterAction, setFilterAction] = useState('ALL');

    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const [showAddModal, setShowAddModal] = useState(false);
    const [showSeedModal, setShowSeedModal] = useState(false);
    const [shortageModalItems, setShortageModalItems] = useState<InventoryItem[] | null>(null);
    const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    // Track which items are being sent to machine registry
    const [sendingItemIds, setSendingItemIds] = useState<Set<number>>(new Set());

    // Inline edit state
    const [editingStockId, setEditingStockId] = useState<number | null>(null);
    const [editStockValue, setEditStockValue] = useState<string>('');

    // Upload logic
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<{ updated: number; not_found: string[] } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [invRes, demRes, userRes, lineRes] = await Promise.all([
                fetch(`${API}/admin/inventory?_t=${Date.now()}`, { headers: authHeaders() }),
                fetch(`${API}/admin/demands?_t=${Date.now()}`, { headers: authHeaders() }),
                fetch(`${API}/admin/identity/users?limit=100&_t=${Date.now()}`, { headers: authHeaders() }),
                fetch(`${API}/admin/lines?_t=${Date.now()}`, { headers: authHeaders() }),
            ]);
            const [invData, demData, userData, lineData] = await Promise.all([
                invRes.json(), demRes.json(), userRes.json(), lineRes.json()
            ]);
            if (invData.success) setItems(invData.data);
            if (demData.success) setDemands(demData.data);
            if (userData.success) {
                const allUsers = userData.data || [];
                setDeos(allUsers.filter((u: any) => u.role === 'DEO'));
                setSupervisors(allUsers.filter((u: any) => u.role === 'Supervisor'));
            }
            if (lineData.success) setLines(lineData.data);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        setUploadResult(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch(`${API}/ppc/inventory/upload-stock`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${getToken()}` },
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                setUploadResult({ updated: data.updated || 0, not_found: data.not_found || [] });
                toast.success(`Updated ${data.updated} items`);
                fetchAll();
            } else {
                toast.error(data.message || 'Upload failed');
            }
        } catch (err) {
            toast.error('Upload failed');
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    // ── Derived stats ─────────────────────────────────────────────────────
    const totalParts = items.length;
    const sufficient = items.filter(i => i.action === 'STOCK_OK').length;
    const shortage = items.filter(i => i.action === 'NEW_DEMAND').length;
    const pendingDEO = items.filter(i => i.action === 'PENDING_DEO').length;
    const completed = items.filter(i => i.status === 'COMPLETED' || i.status === 'IN_PRODUCTION').length;

    const demandIdMap = Object.fromEntries(demands.map(d => [d.id, d.formatted_id]));

    const modelOptions = Array.from(
        new Map(
            items.map(i => {
                const dId = i.demand_id;
                const fId = dId ? demandIdMap[dId] : 'No Demand';
                const key = `${i.vehicle_name}|${dId || ''}`;
                return [key, { key, vehicleName: i.vehicle_name, demandId: dId, formattedDemandId: fId }];
            })
        ).values()
    ).sort((a, b) => (a.vehicleName || '').localeCompare(b.vehicleName || ''));

    const seededDemandIds = new Set(items.map(i => i.demand_id).filter(id => id !== null));
    const availableDemands = demands.filter(d => !seededDemandIds.has(d.id));

    const filtered = items.filter(item => {
        if (!filterVehicle) return false;
        const q = search.toLowerCase();
        const matchSearch = !q || item.sap_part_number?.toLowerCase().includes(q)
            || item.part_description?.toLowerCase().includes(q)
            || item.vehicle_name?.toLowerCase().includes(q);
        const [vName, vDemandId] = filterVehicle.split('|');
        const matchVehicle = item.vehicle_name === vName && String(item.demand_id || '') === vDemandId;
        const matchStatus = filterStatus === 'ALL' || item.status === filterStatus;
        const matchAction = filterAction === 'ALL' || item.action === filterAction;
        return matchSearch && matchVehicle && matchStatus && matchAction;
    });

    const totalPages = Math.ceil(filtered.length / pageSize);
    const paginatedItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => { setCurrentPage(1); }, [filterVehicle, filterStatus, filterAction, search]);

    const handleExport = () => {
        const header = 'SN,Vehicle,SAP Part No.,Description,Current Stock,Demand Qty,Shortage,Status,Action\n';
        const rows = filtered.map(i =>
            `${i.serial_number},"${i.vehicle_name}","${i.sap_part_number}","${i.part_description}",${i.current_stock},${i.demand_quantity},${i.shortage_quantity},${i.status},${i.action}`
        ).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const handleSaveStock = async (id: number) => {
        try {
            const val = Number(editStockValue);
            if (isNaN(val) || val < 0) { setEditingStockId(null); return; }
            const res = await fetch(`${API}/admin/inventory/${id}`, {
                method: 'PATCH',
                headers: authHeaders(),
                body: JSON.stringify({ current_stock: val })
            });
            if (res.ok) fetchAll();
        } finally {
            setEditingStockId(null);
        }
    };

    const handleDeleteItem = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`${API}/ppc/inventory/${itemToDelete.id}`, {
                method: 'DELETE',
                headers: authHeaders()
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Item deleted successfully');
                setItemToDelete(null);
                fetchAll();
            } else {
                toast.error(data.message || 'Delete failed');
            }
        } catch (err) {
            toast.error('Delete failed');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSendToMachineRegistry = async (item: InventoryItem) => {
        setSendingItemIds(prev => new Set(prev).add(item.id));
        try {
            const res = await fetch(`${API}/admin/shortage-requests`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ inventory_item_ids: [item.id] })
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`${item.sap_part_number} sent to Machine Registry ✓`);
                fetchAll();
            } else {
                toast.error(data.message || 'Failed to send to registry');
            }
        } catch {
            toast.error('Failed to send to registry');
        } finally {
            setSendingItemIds(prev => {
                const next = new Set(prev);
                next.delete(item.id);
                return next;
            });
        }
    };

    return (
        <div className=" bg-gray-50/50 min-h-screen">
            {/* Header */}
            <div className="mb-2 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between px-2">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900">Inventory</h1>

                    </div>
                    <div className="flex items-center justify-between px-2">
                        <button onClick={fetchAll} disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-semibold transition-all">
                            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" id="stock-upload" />
                        <label htmlFor="stock-upload" className={`cursor-pointer flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all shadow-sm ${uploading ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                            {uploading ? 'Uploading...' : '📤 Upload Stock Excel'}
                        </label>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-2 px-2">
                {[
                    { label: 'Total Parts', value: totalParts, icon: Boxes, color: 'from-slate-500 to-slate-600', bg: 'bg-white', border: 'border-slate-200', text: 'text-slate-700' },
                    { label: 'Stock OK', value: sufficient, icon: CheckCircle2, color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
                    { label: 'Shortage', value: shortage, icon: AlertTriangle, color: 'from-red-500 to-red-600', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
                    { label: 'Pending DEO', value: pendingDEO, icon: Clock, color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
                    { label: 'Completed', value: completed, icon: CheckCircle, color: 'from-teal-500 to-teal-600', bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700' },
                ].map(card => (
                    <div key={card.label} className={`${card.bg} border ${card.border} rounded-2xl p-3 flex items-center gap-4`}>
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-sm`}><card.icon size={18} className="text-white" /></div>
                        <div><p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">{card.label}</p><p className={`text-2xl font-black ${card.text}`}>{card.value}</p></div>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 mx-2 mb-2">
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
                    <div className="relative flex-1 min-w-48 max-w-sm">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search part, SAP number, vehicle..." className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                    <div className="relative">
                        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <select value={filterVehicle} onChange={e => setFilterVehicle(e.target.value)} className="pl-8 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-400 appearance-none bg-orange-50/50 min-w-[220px]">
                            <option value="">Select Car Model...</option>
                            {modelOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.formattedDemandId} — {opt.vehicleName}</option>)}
                        </select>
                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                    <div className="relative">
                        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="pl-8 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 appearance-none bg-white min-w-[140px]">
                            <option value="ALL">All Status</option>
                            <option value="SUFFICIENT">Sufficient</option>
                            <option value="SHORTAGE">Shortage</option>
                            <option value="PENDING_DEO">Pending</option>
                            <option value="IN_PRODUCTION">Completed</option>
                        </select>
                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                    <button onClick={() => setShowSeedModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold transition-all whitespace-nowrap"><Boxes size={15} /> Import Demand</button>
                    <button onClick={handleExport} className="group flex items-center gap-2 px-4 py-2.5 border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-semibold transition-all whitespace-nowrap"><Download size={15} /> Export</button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl mx-2 shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className='sticky top-0 z-10'>
                            <tr className="border-b-2 border-[#f37021] bg-white shadow-sm">
                                {['SN', 'Vehicle', 'SAP Part No.', 'Part Description', 'Current Stock', 'Demand Qty', 'Shortage', 'Status', 'Action'].map(h => (
                                    <th key={h} className="px-4 py-4 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={9} className="py-20 text-center"><Loader2 size={32} className="animate-spin text-orange-400 mx-auto mb-4" /><p className="text-gray-400">Loading data...</p></td></tr>
                            ) : paginatedItems.length === 0 ? (
                                <tr><td colSpan={9} className="py-20 text-center">{!filterVehicle ? (<><Filter size={48} className="text-orange-100 mx-auto mb-4" /><p className="text-gray-500 font-black text-xl">Select a Car Model</p></>) : (<><Package size={48} className="text-gray-100 mx-auto mb-4" /><p className="text-gray-400">No matching items</p></>)}</td></tr>
                            ) : paginatedItems.map((item, idx) => {
                                const isShortage = item.action === 'NEW_DEMAND';
                                const rowBg = isShortage ? 'bg-red-50/30 hover:bg-red-50/60' : 'hover:bg-gray-50/80';
                                const serialNum = (currentPage - 1) * pageSize + idx + 1;
                                const stockPct = item.demand_quantity > 0 ? Math.min((item.current_stock / item.demand_quantity) * 100, 100) : 100;
                                return (
                                    <tr key={item.id} className={`transition-colors ${rowBg}`}>

                                        {/* SERIAL NUMBER */}
                                        <td className="px-4 py-4 text-xs font-black text-gray-900 bg-gray-50/30 whitespace-nowrap">
                                            {serialNum}
                                        </td>

                                        {/* VEHICLE */}
                                        <td className="px-4 py-4 min-w-[160px]">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-gray-800 whitespace-nowrap">
                                                    {item.vehicle_name}
                                                </span>

                                                {item.demand_id && demandIdMap[item.demand_id] && (
                                                    <span className="text-[10px] font-black text-gray-400 whitespace-nowrap">
                                                        {demandIdMap[item.demand_id]}
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* SAP PART NUMBER */}
                                        <td className="px-4 py-4 max-w-[180px]">
                                            <span className="block truncate whitespace-nowrap overflow-hidden font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                                                {item.sap_part_number}
                                            </span>
                                        </td>

                                        {/* PART DESCRIPTION */}
                                        <td className="px-4 py-4 max-w-[250px]">
                                            <div className="truncate whitespace-nowrap overflow-hidden text-xs text-gray-600">
                                                {item.part_description || '—'}
                                            </div>
                                        </td>

                                        {/* CURRENT STOCK */}
                                        <td className="px-4 py-4">
                                            <div className="flex flex-col gap-1.5 min-w-[100px]">

                                                {editingStockId === item.id ? (
                                                    <input
                                                        type="number"
                                                        value={editStockValue}
                                                        onChange={e => setEditStockValue(e.target.value)}
                                                        onBlur={() => handleSaveStock(item.id)}
                                                        onKeyDown={e => e.key === 'Enter' && handleSaveStock(item.id)}
                                                        autoFocus
                                                        className="w-20 px-2 py-1 text-sm border focus:outline-none focus:ring-2 focus:ring-orange-400 rounded-lg"
                                                    />
                                                ) : (
                                                    <span
                                                        className={`text-sm border py-0.5 px-2 rounded font-black cursor-pointer hover:underline ${isShortage ? 'text-red-600' : 'text-emerald-600'
                                                            }`}
                                                        onClick={() => {
                                                            setEditingStockId(item.id);
                                                            setEditStockValue(item.current_stock.toString());
                                                        }}
                                                    >
                                                        {item.current_stock}
                                                    </span>
                                                )}

                                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-50">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${isShortage ? 'bg-red-500' : 'bg-emerald-500'
                                                            }`}
                                                        style={{ width: `${stockPct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>

                                        {/* DEMAND QTY */}
                                        <td className="px-4 py-4 text-sm font-bold text-gray-700 whitespace-nowrap">
                                            {item.demand_quantity}
                                        </td>

                                        {/* SHORTAGE */}
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            {item.shortage_quantity > 0 ? (
                                                <span className="text-sm font-black text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                                                    −{item.shortage_quantity}
                                                </span>
                                            ) : (
                                                <span className="text-sm font-bold text-emerald-600">
                                                    ✓ OK
                                                </span>
                                            )}
                                        </td>

                                        {/* STATUS */}
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <span
                                                className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border ${item.status === 'SUFFICIENT'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : item.status === 'SHORTAGE'
                                                            ? 'bg-red-50 text-red-700 border-red-200'
                                                            : 'bg-blue-50 text-blue-700 border-blue-200'
                                                    }`}
                                            >
                                                {item.status}
                                            </span>
                                        </td>

                                        {/* ACTION */}
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <ActionBadge 
                                                    action={item.action} 
                                                    onSendToRegistry={() => handleSendToMachineRegistry(item)}
                                                    sending={sendingItemIds.has(item.id)}
                                                />
                                                <button
                                                    onClick={() => setItemToDelete(item)}
                                                    className="p-2 hover:bg-rose-50 text-gray-400 hover:text-rose-500 rounded-lg transition-colors"
                                                    title="Delete Item"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filtered.length > 0 && (
                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-white shadow-inner">
                        <p className="text-xs text-gray-400 font-medium">Showing <span className="font-bold text-gray-700">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-bold text-gray-700">{Math.min(currentPage * pageSize, filtered.length)}</span> of <span className="font-bold text-gray-700">{filtered.length}</span> results</p>
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 disabled:opacity-40 transition-all">Previous</button>
                            <div className="flex items-center gap-1 mx-2">
                                {[...Array(totalPages)].map((_, i) => {
                                    const page = i + 1;
                                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                                        return <button key={page} onClick={() => setCurrentPage(page)} className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${currentPage === page ? 'bg-orange-500 text-white shadow-lg' : 'hover:bg-gray-100 text-gray-600'}`}>{page}</button>;
                                    }
                                    if (page === currentPage - 2 || page === currentPage + 2) return <span key={page} className="text-gray-300">...</span>;
                                    return null;
                                })}
                            </div>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 disabled:opacity-40 transition-all">Next</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showSeedModal && <SeedModal demands={availableDemands} onClose={() => setShowSeedModal(false)} onSuccess={fetchAll} />}
            {shortageModalItems && <ShortageRequestModal shortageItems={shortageModalItems} deos={deos} supervisors={supervisors} lines={lines} onClose={() => setShortageModalItems(null)} onSuccess={fetchAll} />}

            {/* Delete Confirmation Modal */}
            <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity ${itemToDelete ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className={`bg-white rounded-[32px] shadow-2xl w-full max-w-md p-8 text-center transition-transform duration-300 ${itemToDelete ? 'scale-100' : 'scale-95'}`}>
                    <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto mb-6">
                        <AlertTriangle size={36} />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 uppercase mb-2">Confirm Deletion</h3>
                    <p className="text-gray-500 text-sm font-bold px-4 mb-8">
                        Are you sure you want to delete <span className="text-rose-600 font-black">{itemToDelete?.sap_part_number}</span>? This will also remove all associated production and shortage records.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => setItemToDelete(null)}
                            disabled={isDeleting}
                            className="py-4 bg-gray-50 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-gray-100 hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleDeleteItem}
                            disabled={isDeleting}
                            className="py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all flex items-center justify-center gap-2"
                        >
                            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
