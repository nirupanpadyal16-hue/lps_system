import { useState, useEffect } from 'react';
import {
    AlertTriangle, Clock, CheckCircle2, Package,
    Loader2, X, ChevronRight, Timer
} from 'lucide-react';
import { getToken } from '../../lib/storage';
import { API_BASE as API } from '../../lib/apiConfig';

const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
});

interface ShortageRequest {
    id: number;
    formatted_id: string;
    inventory_item: {
        sap_part_number: string;
        part_description: string;
        vehicle_name: string;
        current_stock: number;
        demand_quantity: number;
    } | null;
    shortage_quantity: number;
    deadline: string | null;
    days_remaining: number | null;
    is_overdue: boolean;
    status: 'PENDING' | 'IN_PROGRESS' | 'DEO_FILLED' | 'COMPLETED' | 'REJECTED';
    sap_stock: number | null;
    opening_stock: number | null;
    todays_stock: number | null;
    deo_notes: string | null;
    deo_filled_at: string | null;
    total_days: number;
    per_day: number;
}

function TimelineBar({ daysRemaining, isOverdue }: { daysRemaining: number | null; isOverdue: boolean }) {
    if (daysRemaining === null) return <span className="text-xs text-gray-400">No deadline</span>;
    if (isOverdue) {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full animate-pulse">
                <Timer size={12} /> OVERDUE by {Math.abs(daysRemaining)} day(s)
            </span>
        );
    }
    const color = daysRemaining <= 2 ? 'text-red-600 bg-red-50' : daysRemaining <= 5 ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50';
    return (
        <span className={`inline-flex items-center gap-1 text-xs font-bold ${color} px-2 py-1 rounded-full`}>
            <Clock size={12} /> {daysRemaining} day(s) remaining
        </span>
    );
}

function FillModal({ request, onClose, onSuccess }: {
    request: ShortageRequest;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [form, setForm] = useState({ sap_stock: '', opening_stock: '', todays_stock: '', notes: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const res = await fetch(`${API}/deo/shortage-requests/${request.id}/fill`, {
                method: 'PATCH',
                headers: authHeaders(),
                body: JSON.stringify({
                    sap_stock: Number(form.sap_stock),
                    opening_stock: Number(form.opening_stock),
                    todays_stock: Number(form.todays_stock),
                    notes: form.notes
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

    const item = request.inventory_item;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-black text-gray-900">Fill Stock Data</h2>
                        <p className="text-xs text-gray-400">{request.formatted_id} — {item?.sap_part_number}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
                </div>
                <div className="p-6">
                    {/* Part summary */}
                    {/* Part summary & Metrics */}
                    <div className="grid grid-cols-2 gap-4 mb-5">
                        <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 h-full flex flex-col justify-between">
                            <div>
                                <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">Part Details</p>
                                <p className="font-bold text-gray-800 leading-tight">{item?.part_description || item?.sap_part_number}</p>
                                <p className="text-xs text-gray-500 mt-1">Vehicle: {item?.vehicle_name}</p>
                                <p className="text-xs text-gray-500">Need Total: {request.shortage_quantity} units</p>
                            </div>
                            <div className="mt-3">
                                <TimelineBar daysRemaining={request.days_remaining} isOverdue={request.is_overdue} />
                            </div>
                        </div>

                        {/* Daily Metrics Panel */}
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Daily Metrics</p>

                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-semibold text-gray-600">Timeline</span>
                                <span className="text-sm font-bold text-gray-800">{request.total_days} Days</span>
                            </div>
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-xs font-semibold text-gray-600">Target Per Day</span>
                                <span className="text-sm font-black text-blue-600">{request.per_day} units</span>
                            </div>

                            <div className="pt-3 border-t border-slate-200">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-semibold text-gray-600">Est. Coverage</span>
                                    {(() => {
                                        const tStock = Number(form.todays_stock) || 0;
                                        const pDay = request.per_day || 1;
                                        const coverage = (tStock / pDay).toFixed(1);
                                        const isGood = Number(coverage) >= 5;
                                        return (
                                            <span className={`text-sm font-black ${isGood ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {coverage} Days
                                            </span>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: 'SAP Stock', key: 'sap_stock' },
                                { label: 'Opening Stock', key: 'opening_stock' },
                                { label: "Today's Stock", key: 'todays_stock' },
                            ].map(({ label, key }) => (
                                <div key={key}>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">{label} *</label>
                                    <input
                                        type="number" min="0" step="any"
                                        value={(form as any)[key]}
                                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                                        required
                                    />
                                </div>
                            ))}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Notes</label>
                            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                                placeholder="e.g. Parts arrived from warehouse, lot #123..."
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
                        </div>
                        {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                        <div className="flex gap-3">
                            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50">Cancel</button>
                            <button type="submit" disabled={saving}
                                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold disabled:opacity-60">
                                {saving ? 'Submitting...' : 'Submit to Supervisor'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function DEOShortageRequests() {
    const [requests, setRequests] = useState<ShortageRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [fillRequest, setFillRequest] = useState<ShortageRequest | null>(null);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/deo/shortage-requests`, { headers: authHeaders() });
            const data = await res.json();
            if (data.success) setRequests(data.data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRequests(); }, []);

    const activeTasks = requests.filter(r => ['PENDING', 'IN_PROGRESS', 'REJECTED'].includes(r.status));
    const completed = requests.filter(r => r.status === 'COMPLETED');

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-orange-400" />
            </div>
        );
    }

    if (requests.length === 0) {
        return (
            <div className="text-center py-12">
                <Package size={36} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-semibold">No shortage requests assigned</p>
                <p className="text-xs text-gray-300 mt-1">Admin will assign parts that need stock replenishment</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
                {[
                    { label: 'Active Shortage Tasks', count: activeTasks.length, color: 'text-amber-600 bg-amber-50 border-amber-200', icon: AlertTriangle },
                    { label: 'Fully Completed', count: completed.length, color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
                ].map(s => (
                    <div key={s.label} className={`flex items-center gap-3 p-3 rounded-xl border ${s.color}`}>
                        <s.icon size={18} />
                        <div>
                            <p className="text-xs font-semibold opacity-70">{s.label}</p>
                            <p className="text-xl font-black">{s.count}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Active requests */}
            {activeTasks.length > 0 && (
                <div>
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Active Tasks — Daily Entries Required</h3>
                    <div className="space-y-3">
                        {activeTasks.map(req => (
                            <div key={req.id}
                                className={`p-4 rounded-xl border-2 ${req.status === 'REJECTED' ? 'border-red-300 bg-red-50' : req.is_overdue ? 'border-amber-300 bg-amber-50' : 'border-blue-200 bg-blue-50/50'}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-mono text-xs font-bold text-gray-500">{req.formatted_id}</span>
                                            <TimelineBar daysRemaining={req.days_remaining} isOverdue={req.is_overdue} />
                                            {req.status === 'REJECTED' && <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">REJECTED BY SUPERVISOR</span>}
                                            {req.status === 'IN_PROGRESS' && <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">IN PROGRESS</span>}
                                        </div>
                                        <p className="font-bold text-gray-800 text-sm">{req.inventory_item?.sap_part_number}</p>
                                        <p className="text-xs text-gray-500">{req.inventory_item?.part_description}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            Vehicle: <span className="font-semibold">{req.inventory_item?.vehicle_name}</span>
                                            {' · '}Need Total: <span className="font-bold text-red-600">{req.shortage_quantity} units</span>
                                            {' · '}Target <span className="font-bold text-blue-600">{req.per_day} / day</span>
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setFillRequest(req)}
                                        className={`flex items-center gap-1.5 px-4 py-2 text-white rounded-xl text-sm font-bold whitespace-nowrap transition-all ${req.status === 'REJECTED' ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'}`}>
                                        {req.status === 'REJECTED' ? 'Fix Rejection' : 'Log Daily Stock'} <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Completed */}
            {completed.length > 0 && (
                <div>
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Completed</h3>
                    <div className="space-y-2">
                        {completed.slice(0, 3).map(req => (
                            <div key={req.id} className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="font-mono text-xs font-bold text-emerald-500">{req.formatted_id}</span>
                                        <p className="font-bold text-gray-800 text-sm">{req.inventory_item?.sap_part_number}</p>
                                    </div>
                                    <CheckCircle2 size={18} className="text-emerald-500" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {fillRequest && (
                <FillModal request={fillRequest} onClose={() => setFillRequest(null)} onSuccess={fetchRequests} />
            )}
        </div>
    );
}
