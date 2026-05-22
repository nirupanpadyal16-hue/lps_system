import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Package, RefreshCw, Plus, Search, Filter, Download,
    CheckCircle2, AlertTriangle, Clock, ArrowRight, ChevronDown,
    X, Loader2, Boxes, Upload, Trash2, LayoutGrid,
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
    status: string;
    action: string;
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
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                <CheckCircle2 size={13} />
                Dispatch Ready
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


// ─── Shortage Request Modal ──────────────────────────────────────────────────

function ShortageRequestModal({ shortageItems, deos, supervisors, onClose, onSuccess }: {
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
                {demands.length === 0 && (
                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl text-orange-700 text-xs font-bold mb-4">
                        No new demands available for import.
                    </div>
                )}
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
    const [filterAction] = useState('ALL');

    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const [] = useState(false);
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
    const [, setUploadResult] = useState<{ updated: number; not_found: string[] } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [modelSearchQuery, setModelSearchQuery] = useState('');
    const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

    const toggleDropdown = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownCoords({
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width
            });
        }
        setIsDropdownOpen(!isDropdownOpen);
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;
            const clickedInsideDropdown = dropdownRef.current && dropdownRef.current.contains(target);
            const clickedInsidePortal = (event.target as Element).closest('.portal-dropdown');
            if (!clickedInsideDropdown && !clickedInsidePortal) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const handleScrollOrResize = (e: Event) => {
            const target = e.target as HTMLElement;
            if (target && target.closest('.portal-dropdown')) {
                return;
            }
            setIsDropdownOpen(false);
        };
        if (isDropdownOpen) {
            window.addEventListener('scroll', handleScrollOrResize, true);
            window.addEventListener('resize', handleScrollOrResize);
        }
        return () => {
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [isDropdownOpen]);

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
            if (invData.success) {
                const mapped = (invData.data || []).map((item: InventoryItem) => {
                    if (item.current_stock >= item.demand_quantity) {
                        return {
                            ...item,
                            status: 'SUFFICIENT',
                            action: 'STOCK_OK',
                            shortage_quantity: 0
                        };
                    }
                    return item;
                });
                setItems(mapped);
            }
            if (demData.success) setDemands(demData.data);
            if (userData.success) {
                const allUsers = userData.data || [];
                setDeos(allUsers.filter((u: any) => u.role === 'DEO'));
                setSupervisors(allUsers.filter((u: any) => u.role === 'Supervisor'));
            }
            if (lineData.success) setLines(lineData.data);
        } catch (err: any) {
            console.error('Fetch error:', err);
            toast.error('Failed to load data. Please check connection.');
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

    const filteredModelOptions = modelOptions.filter(opt => {
        const query = modelSearchQuery.toLowerCase();
        return (opt.formattedDemandId || '').toLowerCase().includes(query) ||
            (opt.vehicleName || '').toLowerCase().includes(query);
    });

    const selectedOption = modelOptions.find(opt => opt.key === filterVehicle);



    // Model-wise filtered items for KPI statistics
    const selectedModelItems = filterVehicle
        ? items.filter(item => {
            const [vName, vDemandId] = filterVehicle.split('|');
            return item.vehicle_name === vName && String(item.demand_id || '') === vDemandId;
        })
        : items;

    // ── Derived stats ─────────────────────────────────────────────────────
    const totalParts = selectedModelItems.length;
    const sufficient = selectedModelItems.filter(i => i.action === 'STOCK_OK').length;
    const shortage = selectedModelItems.filter(i => i.action === 'NEW_DEMAND').length;
    const pendingDeo = selectedModelItems.filter(i => i.status === 'PENDING_DEO' || i.action === 'PENDING_DEO').length;

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

        let matchStatus = true;
        if (filterStatus !== 'ALL') {
            if (filterStatus === 'PENDING') {
                matchStatus = item.status === 'PENDING_DEO' || item.status === 'IN_PRODUCTION' || item.action === 'PENDING_DEO' || item.action === 'IN_PRODUCTION' || item.status === 'WAITING_RM_APPROVAL' || item.action === 'WAITING_RM_APPROVAL';
            } else {
                matchStatus = item.status === filterStatus;
            }
        }

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

            if (isNaN(val) || val < 0) {
                setEditingStockId(null);
                return;
            }

            const res = await fetch(`${API}/admin/inventory/${id}`, {
                method: 'PATCH',
                headers: authHeaders(),
                body: JSON.stringify({
                    current_stock: val
                })
            });

            if (!res.ok) {
                toast.error("Update failed");
                return;
            }

            // UPDATE LOCAL STATE ONLY
            setItems(prev =>
                prev.map(item => {
                    if (item.id !== id) return item;

                    const shortage =
                        val >= item.demand_quantity
                            ? 0
                            : item.demand_quantity - val;

                    return {
                        ...item,
                        current_stock: val,
                        shortage_quantity: shortage,
                        status:
                            val >= item.demand_quantity
                                ? "SUFFICIENT"
                                : "SHORTAGE",
                        action:
                            val >= item.demand_quantity
                                ? "STOCK_OK"
                                : "NEW_DEMAND"
                    };
                })
            );

            toast.success("Stock updated");

        } catch (err) {
            toast.error("Update failed");
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
        <div className="bg-gray-50/50 flex flex-col h-[calc(100vh-96px)] overflow-hidden">

            {/* Header */}
            <div className="bg-white border-b border-slate-100 py-1 px-4 ml-mb-1 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none p-2">Inventory</h1>
                </div>
                <div className="flex items-center gap-4">
                    {/* Compact Stats Bar */}
                    <div className="flex items-center bg-white rounded-2xl border border-slate-100 p-1 shadow-sm overflow-hidden scale-90 origin-right">
                        <div className="px-4 py-1 text-center border-r border-slate-50">
                            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Total Parts Stock</span>
                            <span className="block text-sm font-black text-slate-800 leading-none">{totalParts}</span>
                        </div>
                        <div className="px-4 py-1 text-center border-r border-slate-50 text-emerald-600">
                            <span className="block text-[8px] font-black uppercase tracking-wider mb-0.5 opacity-80">Dispatch Ready</span>
                            <span className="block text-sm font-black leading-none">{sufficient}</span>
                        </div>
                        <div className="px-4 py-1 text-center border-r border-slate-50 text-red-500">
                            <span className="block text-[8px] font-black uppercase tracking-wider mb-0.5 opacity-80">Shortage Count</span>
                            <span className="block text-sm font-black leading-none">{shortage}</span>
                        </div>
                        <div className="px-4 py-1 text-center text-amber-500">
                            <span className="block text-[8px] font-black uppercase tracking-wider mb-0.5 opacity-80">Pending to DEO</span>
                            <span className="block text-sm font-black leading-none">{pendingDeo}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 mx-2 mb-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Search */}
                        <div className="relative group w-full md:w-40 flex-shrink-0">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors pointer-events-none" size={13} />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search part, SAP..."
                                className="w-full bg-white border border-slate-200 focus:border-orange-500 rounded-full h-[42px] pl-9 pr-3 text-slate-700 font-bold text-[11px] tracking-wide placeholder:text-gray-400/85 outline-none transition-all shadow-sm"
                            />
                        </div>

                        {/* Car Model Dropdown */}
                        <div className="relative group w-full md:w-48 flex-shrink-0" ref={dropdownRef}>
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 p-1 bg-orange-50 rounded text-orange-500 pointer-events-none">
                                <Filter size={11} />
                            </div>
                            <button
                                ref={buttonRef}
                                type="button"
                                onClick={toggleDropdown}
                                className="w-full bg-white border border-slate-200 focus:border-orange-500 rounded-full h-[42px] pl-11 pr-8 text-slate-700 font-bold text-[11px] tracking-wide outline-none transition-all shadow-sm cursor-pointer flex items-center justify-between text-left"
                            >
                                <span className="truncate">
                                    {selectedOption
                                        ? `${selectedOption.formattedDemandId} — ${selectedOption.vehicleName}`
                                        : 'Select Car Model...'}
                                </span>
                                <ChevronDown size={14} className="text-gray-400" />
                            </button>

                            {isDropdownOpen && (
                                <div
                                    style={{
                                        position: 'fixed',
                                        top: `${dropdownCoords.top}px`,
                                        left: `${dropdownCoords.left}px`,
                                        width: `${dropdownCoords.width}px`,
                                        minWidth: '260px',
                                    }}
                                    className="bg-white border border-gray-100 rounded-2xl shadow-xl z-50 p-2.5 space-y-2 portal-dropdown"
                                >
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search Vehicle Model..."
                                            value={modelSearchQuery}
                                            onChange={e => setModelSearchQuery(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 rounded-xl text-sm focus:outline-none transition-all font-semibold"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="max-h-60 overflow-y-auto py-1 space-y-1 pr-1 scrollbar-thin scrollbar-thumb-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFilterVehicle('');
                                                setIsDropdownOpen(false);
                                                setModelSearchQuery('');
                                            }}
                                            className={`w-full relative text-center px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${!filterVehicle
                                                ? 'bg-orange-50 text-orange-600 font-extrabold'
                                                : 'hover:bg-orange-50/50 hover:text-orange-600 text-gray-700 font-bold'
                                                }`}
                                        >
                                            ALL VEHICLES
                                            {!filterVehicle && (
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-orange-600" />
                                            )}
                                        </button>
                                        {filteredModelOptions.map(opt => {
                                            const isSelected = filterVehicle === opt.key;
                                            return (
                                                <button
                                                    key={opt.key}
                                                    type="button"
                                                    onClick={() => {
                                                        setFilterVehicle(opt.key);
                                                        setIsDropdownOpen(false);
                                                        setModelSearchQuery('');
                                                    }}
                                                    className={`w-full relative text-center px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${isSelected
                                                        ? 'bg-orange-50 text-orange-600 font-extrabold'
                                                        : 'hover:bg-orange-50/50 hover:text-orange-600 text-gray-700 font-bold'
                                                        }`}
                                                >
                                                    {opt.formattedDemandId} — {opt.vehicleName}
                                                    {isSelected && (
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-orange-600" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                        {filteredModelOptions.length === 0 && (
                                            <p className="text-xs text-gray-400 text-center py-2">No models found</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Status Dropdown */}
                        <div className="relative group w-full md:w-36 flex-shrink-0">
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 p-1 bg-orange-50 rounded text-orange-500 pointer-events-none">
                                <LayoutGrid size={11} />
                            </div>
                            <select
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                                className="w-full bg-white border border-slate-200 focus:border-orange-500 rounded-full h-[42px] pl-11 pr-8 text-slate-700 font-bold text-[11px] tracking-wide outline-none transition-all shadow-sm cursor-pointer appearance-none"
                            >
                                <option value="ALL">All Status</option>
                                <option value="SUFFICIENT">Ready to Dispatch</option>
                                <option value="PENDING">Pending</option>
                                <option value="SHORTAGE">Shortage</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <ChevronDown size={14} />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 md:ml-auto">
                        {/* Import Demand Button */}
                        <button
                            onClick={() => setShowSeedModal(true)}
                            className="flex items-center gap-2 px-3.5 h-[42px] bg-orange-500 hover:bg-orange-600 text-white rounded-full text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap shadow-sm flex-shrink-0"
                        >
                            <Boxes size={14} />
                            IMPORT DEMAND
                        </button>

                        {/* Upload Stock Excel */}
                        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" id="stock-upload" />
                        <label
                            htmlFor="stock-upload"
                            className={`cursor-pointer flex items-center gap-2 rounded-full px-3.5 h-[42px] text-[10px] font-black uppercase tracking-wider transition-all shadow-sm whitespace-nowrap flex-shrink-0 border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20`}
                        >
                            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                            {uploading ? 'UPLOADING...' : 'UPLOAD STOCK EXCEL'}
                        </label>

                        {/* Export Icon Button */}
                        <button
                            onClick={handleExport}
                            className="w-[42px] h-[42px] border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 rounded-full transition-all flex items-center justify-center flex-shrink-0 shadow-sm"
                            title="Export"
                        >
                            <Download size={15} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-2xl mx-2 shadow-sm border border-gray-100 overflow-hidden flex flex-col mb-2">
                <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
                    <table className="w-full text-sm">
                        <thead className='sticky top-0 z-10'>
                            <tr className="border-b-2 border-[#f37021] bg-white shadow-sm">
                                {['Sr.no', 'Vehicle', 'SAP Part No.', 'Current Stock', 'Demand Qty', 'Shortage', 'Status', 'Action'].map(h => (
                                    <th key={h} className="px-4 py-4 text-left text-[11px] font-black text-black uppercase tracking-wider whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={8} className="py-20 text-center"><Loader2 size={32} className="animate-spin text-orange-400 mx-auto mb-4" /><p className="text-gray-400">Loading data...</p></td></tr>
                            ) : paginatedItems.length === 0 ? (
                                <tr><td colSpan={8} className="py-20 text-center">{!filterVehicle ? (<><Filter size={48} className="text-orange-100 mx-auto mb-4" /><p className="text-gray-500 font-black text-xl">Select a Car Model</p></>) : (<><Package size={48} className="text-gray-100 mx-auto mb-4" /><p className="text-gray-400">No matching items</p></>)}</td></tr>
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
                                                    ✓ Ready to Dispatch
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
                                                        : item.status === 'COMPLETED' || item.status === 'DISPATCHED' || item.status === 'PRODUCTION_DONE'
                                                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                                    }`}
                                            >
                                                {item.status === 'SUFFICIENT'
                                                    ? 'Ready to Dispatch'
                                                    : item.status === 'COMPLETED' || item.status === 'DISPATCHED' || item.status === 'PRODUCTION_DONE'
                                                        ? 'Dispatched'
                                                        : item.status}
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
