import { useState, useEffect, useCallback } from 'react';
import {
    Package, RefreshCw, Plus, Search, Filter, Download,
    CheckCircle2, AlertTriangle, Clock, ArrowRight, ChevronDown,
    X, Loader2, Boxes, AlertCircle, CheckCircle
} from 'lucide-react';
import { getToken } from '../../../lib/storage';
import { API_BASE as API } from '../../../lib/apiConfig';

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
    // status: 'SUFFICIENT' | 'SHORTAGE' | 'PENDING_DEO' | 'IN_PRODUCTION';
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

function ActionBadge({ action, onNewDemand }: { action: string; onNewDemand?: () => void }) {
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
    if (action === 'COMPLETED') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                <CheckCircle2 size={13} />
                Completed
            </span>
        );
    }
    if (action === 'PENDING_DEO') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold animate-pulse">
                <Clock size={13} />
                Got to Production
            </span>
        );
    }
    // NEW_DEMAND
    return (
        <button
            onClick={onNewDemand}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-all shadow-sm hover:shadow-md active:scale-95"
        >
            <AlertTriangle size={13} />
            New Demand
            <ArrowRight size={12} />
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
    // Full lists: show all DEOs/Supervisors
    const filteredDeos = deos;
    const filteredSupervisors = supervisors;
    const loadingStaff = false;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!deadline) { setError('Please set a deadline (timeline).'); return; }
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

            // Format success message with machine assignments
            if (data.data && data.data.length > 0) {
                const assigned = data.data.filter((r: any) => r.machine_name);
                if (assigned.length > 0) {
                    const msg = assigned.map((r: any) => `${r.inventory_item?.sap_part_number || r.formatted_id}: Assigned to ${r.machine_name}`).join('\n');
                    alert(`Demand Created Successfully!\n\nAutomated Machine Assignments:\n${msg}`);
                } else {
                    alert(`Demand Created Successfully!\nNo available machines were found for auto-assignment.`);
                }
            } else {
                alert("Demand Created Successfully!");
            }

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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                            <AlertTriangle size={18} className="text-red-500" /> Create Part Demand
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">Only shortage parts listed — parts with sufficient stock are excluded</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
                </div>

                {/* Shortage parts list */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                        {shortageItems.length} Part(s) with Shortage
                    </p>
                    {shortageItems.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                            <div>
                                <p className="text-xs font-bold text-gray-800">{item.sap_part_number}</p>
                                <p className="text-xs text-gray-500">{item.part_description}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-400">Stock / Demand</p>
                                <p className="text-sm font-black text-red-600">
                                    {item.current_stock} / {item.demand_quantity}
                                    <span className="ml-1 text-xs font-semibold text-red-400">(Need {item.shortage_quantity} more)</span>
                                </p>
                                {item.machine_group ? (
                                    <p className="text-[10px] font-bold text-orange-500 mt-1 uppercase bg-orange-100 px-2 py-1 rounded inline-block">
                                        <CheckCircle size={10} className="inline mr-1 mb-0.5" />
                                        Auto-Assigned Machine: {item.machine_group}
                                    </p>
                                ) : (
                                    <p className="text-[10px] font-bold text-red-500 mt-1 uppercase bg-red-100 px-2 py-1 rounded inline-block">
                                        No Machine Mapped! Check Master Data.
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="p-6 border-t border-gray-100 space-y-4 flex-shrink-0">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                                Deadline / Timeline <span className="text-red-400">*</span>
                            </label>
                            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                                Assign DEO <span className="text-red-400">*</span>
                            </label>
                            <select value={deoId} onChange={e => setDeoId(e.target.value)}
                                disabled={loadingStaff}
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50">
                                <option value="">{loadingStaff ? 'Loading...' : 'Select DEO...'}</option>
                                {filteredDeos.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                                Assign Supervisor <span className="text-red-400">*</span>
                            </label>
                            <select value={supervisorId} onChange={e => setSupervisorId(e.target.value)}
                                disabled={loadingStaff}
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50">
                                <option value="">{loadingStaff ? 'Loading...' : filteredSupervisors.length === 0 && lineId ? 'No Supervisor on this line' : 'Select Supervisor...'}</option>
                                {filteredSupervisors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                    </div>
                    {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={saving}
                            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold disabled:opacity-60">
                            {saving ? 'Creating...' : `Create Demand for ${shortageItems.length} Part(s)`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Seed from Demand Modal ──────────────────────────────────────────────────

function SeedModal({ demands, onClose, onSuccess }: {
    demands: Demand[];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [demandId, setDemandId] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
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
            setResult(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                        <Boxes size={18} className="text-orange-500" /> Import from Demand
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-500">Auto-populates inventory from MasterData parts linked to the selected demand. Current stock is pulled from the latest DEO entries.</p>
                    <select value={demandId} onChange={e => setDemandId(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                        <option value="">Select demand...</option>
                        {demands.map(d => (
                            <option key={d.id} value={d.id}>{d.formatted_id} — {d.model_name} (Qty: {d.quantity})</option>
                        ))}
                    </select>
                    {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                    {result && (
                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                            <p className="text-emerald-700 font-bold text-sm flex items-center gap-2">
                                <CheckCircle2 size={16} /> Import successful!
                            </p>
                            <p className="text-xs text-emerald-600 mt-1">Created: {result.created} | Updated: {result.updated} | Model: {result.model} | Order Qty: {result.order_quantity}</p>
                        </div>
                    )}
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50">
                            {result ? 'Close' : 'Cancel'}
                        </button>
                        {!result && (
                            <button onClick={handleSeed} disabled={loading}
                                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2">
                                {loading ? <><Loader2 size={14} className="animate-spin" /> Importing...</> : 'Import Parts'}
                            </button>
                        )}
                        {result && (
                            <button onClick={() => { onSuccess(); onClose(); }}
                                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold">
                                View Inventory
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Inventory Page ──────────────────────────────────────────────────────

export default function InventoryPage() {
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

    // Inline edit state
    const [editingStockId, setEditingStockId] = useState<number | null>(null);
    const [editStockValue, setEditStockValue] = useState<string>('');

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

    // ── Derived stats ─────────────────────────────────────────────────────
    const totalParts = items.length;
    const sufficient = items.filter(i => i.action === 'STOCK_OK').length;
    const shortage = items.filter(i => i.action === 'NEW_DEMAND').length;
    const pendingDEO = items.filter(i => i.action === 'PENDING_DEO').length;
    const completed = items.filter(i => i.status === 'COMPLETED' || i.status === 'IN_PRODUCTION').length;

    const demandIdMap = Object.fromEntries(demands.map(d => [d.id, d.formatted_id]));

    // Unique options for the car model dropdown (Model + Demand ID)
    const modelOptions = Array.from(
        new Map(
            items.map(i => {
                const dId = i.demand_id;
                const fId = dId ? demandIdMap[dId] : 'No Demand';
                const key = `${i.vehicle_name}|${dId || ''}`;
                return [key, { key, vehicleName: i.vehicle_name, demandId: dId, formattedDemandId: fId }];
            })
        ).values()
    ).sort((a, b) => a.vehicleName.localeCompare(b.vehicleName));

    // ── Filtering ─────────────────────────────────────────────────────────
    const filtered = items.filter(item => {
        if (!filterVehicle) return false; // PERFORMANCE: Show no data until model is selected

        const q = search.toLowerCase();
        const matchSearch = !q || item.sap_part_number?.toLowerCase().includes(q)
            || item.part_description?.toLowerCase().includes(q)
            || item.vehicle_name?.toLowerCase().includes(q);

        const [vName, vDemandId] = filterVehicle.split('|');
        const matchVehicle = item.vehicle_name === vName && String(item.demand_id || '') === vDemandId;

        const matchStatus = filterStatus === 'ALL' ||
            (filterStatus === 'IN_PRODUCTION' ? (item.status === 'IN_PRODUCTION' || item.status === 'COMPLETED') : item.status === filterStatus);
        const matchAction = filterAction === 'ALL' || item.action === filterAction;

        return matchSearch && matchVehicle && matchStatus && matchAction;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filtered.length / pageSize);
    const paginatedItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => {
        setCurrentPage(1); // Reset to first page when filters change
    }, [filterVehicle, filterStatus, filterAction, search]);

    // ── Filter Available Demands ──────────────────────────────────────────
    // Get unique demand IDs already present in inventory
    const importedDemandIds = new Set(items.map(i => i.demand_id).filter(id => id !== null));
    // Filter demands list to exclude those already imported
    const availableDemands = demands.filter(d => !importedDemandIds.has(d.id));

    // ── Filter Active Lines ──────────────────────────────────────────────
    const activeLines = lines.filter(l => l.isActive !== false);

    // ── Batch shortage handler ─────────────────────────────────────────────
    const handleBatchNewDemand = () => {
        const allShortage = filtered.filter(i => i.action === 'NEW_DEMAND');
        if (allShortage.length > 0) setShortageModalItems(allShortage);
    };

    // ── Export to CSV ─────────────────────────────────────────────────────
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
            if (isNaN(val) || val < 0) {
                setEditingStockId(null);
                return;
            }

            const res = await fetch(`${API}/admin/inventory/${id}`, {
                method: 'PATCH',
                headers: authHeaders(),
                body: JSON.stringify({ current_stock: val })
            });

            if (res.ok) {
                fetchAll();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setEditingStockId(null);
        }
    };

    return (
        <div className=" bg-gray-50/50">
            {/* Header */}
            <div className="mb-2 bg-white p-2">
                <div className="flex items-center justify-between px-2">
                    <h1 className="text-2xl font-black text-gray-900">Inventory</h1>
                    <button onClick={fetchAll} disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-semibold transition-all">
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    </button>
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
                    <div key={card.label} className={`${card.bg} border ${card.border} rounded-2xl p-2.5 flex items-center gap-3`}>
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center shadow-sm`}>
                            <card.icon size={15} className="text-white" />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">{card.label}</p>
                            <p className={`text-xl font-black ${card.text}`}>{card.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 mx-2 mb-2">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    {/* Search */}
                    <div className="relative flex-1 min-w-48 max-w-sm">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search part, SAP number, vehicle..."
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                        />
                    </div>

                    {/* Car Model Slicer */}
                    <div className="relative">
                        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <select
                            value={filterVehicle}
                            onChange={e => setFilterVehicle(e.target.value)}
                            className="pl-8 pr-8 py-2 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-400 appearance-none bg-orange-50/50 min-w-[200px]"
                        >
                            <option value="">Select Car Model...</option>
                            {modelOptions.map(opt => (
                                <option key={opt.key} value={opt.key}>
                                    {opt.formattedDemandId} — {opt.vehicleName}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    {/* Status filter */}
                    <div className="relative">
                        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                            className="pl-8 pr-8 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 appearance-none bg-white min-w-[120px]"
                        >
                            <option value="ALL">All Status</option>
                            <option value="SUFFICIENT">Sufficient</option>
                            <option value="SHORTAGE">Shortage</option>
                            <option value="PENDING_DEO">Pending</option>
                            <option value="IN_PRODUCTION">Completed</option>
                        </select>
                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    {/* Action buttons */}
                    {shortage > 0 && (
                        <button
                            onClick={handleBatchNewDemand}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-all shadow-sm whitespace-nowrap"
                        >
                            <AlertCircle size={15} />
                            Create Demand
                        </button>
                    )}
                    <button onClick={() => setShowSeedModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold transition-all whitespace-nowrap">
                        <Boxes size={15} /> Import Demand
                    </button>
                    <button onClick={handleExport}
                        className="group flex items-center gap-2 px-3 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-semibold transition-all whitespace-nowrap">
                        <Download size={15} />
                        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out">
                            Export
                        </span>
                    </button>

                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl mx-2 shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto h-[calc(100vh-280px)] overflow-y-auto">
                    <table className="w-full ">
                        <thead className='sticky top-0 z-[50]'>
                            <tr className="border-b-2 border-[#f37021] bg-white">
                                {['SN', 'Vehicle', 'SAP Part No.', 'Part Description', 'Current Stock', 'Demand Qty', 'Shortage', 'Status', 'Action'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 ">
                            {loading ? (
                                <tr><td colSpan={10} className="py-16 text-center">
                                    <Loader2 size={28} className="animate-spin text-orange-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-400">Loading inventory...</p>
                                </td></tr>
                            ) : paginatedItems.length === 0 ? (
                                <tr><td colSpan={10} className="py-16 text-center">
                                    {!filterVehicle ? (
                                        <>
                                            <Filter size={36} className="text-orange-200 mx-auto mb-3" />
                                            <p className="text-gray-500 font-black text-lg">Select a Car Model</p>
                                            <p className="text-xs text-gray-400 mt-1">Please select a model from the dropdown to view inventory data</p>
                                        </>
                                    ) : (
                                        <>
                                            <Package size={36} className="text-gray-200 mx-auto mb-3" />
                                            <p className="text-gray-400 font-semibold">No inventory items found for this selection</p>
                                        </>
                                    )}
                                </td></tr>
                            ) : paginatedItems.map((item, idx) => {
                                const isShortage = item.action === 'NEW_DEMAND';
                                const isPending = item.action === 'PENDING_DEO';
                                const rowBg = isShortage ? 'bg-red-50/40 hover:bg-red-50' : isPending ? 'bg-amber-50/30 hover:bg-amber-50/60' : 'hover:bg-gray-50/80';
                                const stockPct = item.demand_quantity > 0 ? Math.min((item.current_stock / item.demand_quantity) * 100, 100) : 100;
                                const serialNum = (currentPage - 1) * pageSize + idx + 1;

                                return (
                                   <tr key={item.id} className={`transition-colors ${rowBg}`}>
    
    {/* SERIAL NUMBER */}
    <td className="px-4 py-3 text-xs font-black text-gray-900 bg-gray-50/50 whitespace-nowrap">
        {serialNum}
    </td>

    {/* VEHICLE */}
    <td className="px-4 py-2 min-w-[160px]">
        <div className="flex flex-col">
            <span className="text-sm font-black text-gray-800 whitespace-nowrap">
                {item.vehicle_name}
            </span>

            {item.demand_id && demandIdMap[item.demand_id] && (
                <span className="text-[10px] font-black text-gray-400 mt-0.5 whitespace-nowrap">
                    {demandIdMap[item.demand_id]}
                </span>
            )}
        </div>
    </td>

    {/* SAP PART NUMBER */}
    <td className="px-4 py-2 max-w-[180px]">
        <span className="block truncate whitespace-nowrap overflow-hidden font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
            {item.sap_part_number}
        </span>
    </td>

    {/* PART DESCRIPTION */}
    <td className="px-4 py-2 max-w-[250px]">
        <div className="truncate whitespace-nowrap overflow-hidden text-xs text-gray-600">
            {item.part_description || '—'}
        </div>
    </td>

    {/* CURRENT STOCK */}
    <td className="px-4 py-2">
        <div className="flex flex-col gap-1">

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
                    className={`text-sm border py-0.5 px-2 rounded font-black cursor-pointer hover:underline ${
                        isShortage ? 'text-red-600' : 'text-emerald-600'
                    }`}
                    onClick={() => {
                        setEditingStockId(item.id);
                        setEditStockValue(item.current_stock.toString());
                    }}
                    title="Click to edit"
                >
                    {item.current_stock}
                </span>
            )}

            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${
                        isShortage ? 'bg-red-400' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${stockPct}%` }}
                />
            </div>
        </div>
    </td>

    {/* DEMAND QTY */}
    <td className="px-4 py-2 text-sm font-bold text-gray-700 whitespace-nowrap">
        {item.demand_quantity}
    </td>

    {/* SHORTAGE */}
    <td className="px-4 py-2 whitespace-nowrap">
        {item.shortage_quantity > 0 ? (
            <span className="text-sm font-black text-red-600">
                −{item.shortage_quantity}
            </span>
        ) : (
            <span className="text-sm font-bold text-emerald-500">
                +{Math.abs(item.current_stock - item.demand_quantity)}
            </span>
        )}
    </td>

    {/* STATUS */}
    <td className="px-4 py-2 whitespace-nowrap">
        {item.status === 'SUFFICIENT' && (
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase">
                Sufficient
            </span>
        )}

        {item.status === 'SHORTAGE' && (
            <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full uppercase">
                Shortage
            </span>
        )}

        {item.status === 'PENDING_DEO' && (
            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full uppercase">
                Pending
            </span>
        )}

        {(item.status === 'COMPLETED' || item.status === 'IN_PRODUCTION') && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full uppercase">
                Completed
            </span>
        )}
    </td>

    {/* ACTION */}
    <td className="px-4 py-2 whitespace-nowrap">
        <ActionBadge
            action={item.action}
            onNewDemand={() => setShortageModalItems([item])}
        />
    </td>
</tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 0 && (
                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-white sticky bottom-0">
                        <div className="flex items-center gap-4">
                            <p className="text-xs text-gray-400">
                                Showing <span className="font-bold text-gray-600">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-bold text-gray-600">{Math.min(currentPage * pageSize, filtered.length)}</span> of <span className="font-bold text-gray-600">{filtered.length}</span> parts
                            </p>
                        </div>

                        {/* Pagination Controls */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-50 disabled:opacity-50 transition-all"
                            >
                                Previous
                            </button>

                            <div className="flex items-center gap-1 mx-2">
                                {[...Array(totalPages)].map((_, i) => {
                                    const page = i + 1;
                                    // Show first, last, and pages around current
                                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === page ? 'bg-orange-500 text-white shadow-md' : 'hover:bg-gray-100 text-gray-600'}`}
                                            >
                                                {page}
                                            </button>
                                        );
                                    }
                                    if (page === currentPage - 2 || page === currentPage + 2) {
                                        return <span key={page} className="text-gray-300 text-xs px-1">...</span>;
                                    }
                                    return null;
                                })}
                            </div>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-50 disabled:opacity-50 transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showAddModal && (
                <AddPartModal demands={availableDemands} onClose={() => setShowAddModal(false)} onSuccess={fetchAll} />
            )}
            {showSeedModal && (
                <SeedModal demands={availableDemands} onClose={() => setShowSeedModal(false)} onSuccess={fetchAll} />
            )}
            {shortageModalItems && (
                <ShortageRequestModal
                    shortageItems={shortageModalItems}
                    deos={deos}
                    supervisors={supervisors}
                    lines={activeLines}
                    onClose={() => setShortageModalItems(null)}
                    onSuccess={fetchAll}
                />
            )}
        </div>
    );
}
