import { useState, useEffect, useMemo, useRef } from 'react';
import { getToken } from '../../../lib/storage';
import { API_BASE as API } from '../../../lib/apiConfig';
import {
    Search, Calendar, ChevronDown, CheckCircle2,
    Eye, AlertCircle, Loader2, Car, Trash2, X, Info, AlertTriangle, Database, Package, User, MapPin, Clock, Timer, Zap, LayoutGrid, ArrowLeft, Factory
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../lib/utils';

const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
});

interface ShortageEntry {
    id: number;
    shortage_request_id: number;
    deo_name: string;
    date: string;
    sap_stock: number;
    opening_stock: number;
    todays_stock: number;
    notes: string;
    status: 'PENDING_SUPERVISOR' | 'VERIFIED' | 'REJECTED';
    rejection_reason: string | null;
    verified_at: string | null;
    created_at: string;
    shortage_request: {
        formatted_id: string;
        inventory_item: {
            sap_part_number: string;
            part_description: string;
            vehicle_name: string;
            current_stock: number;
            demand_quantity: number;
        };
        shortage_quantity: number;
        per_day: number;
        line_name?: string;
        master_machine?: string;
        customer_name?: string;
        supervisor_name?: string;
        supervisor_email?: string;
        deo_name?: string;
        deo_email?: string;
        deadline?: string;
        created_at?: string;
        days_remaining?: number;
        is_overdue?: boolean;
    };
}

function TimelineBar({ daysRemaining, isOverdue }: { daysRemaining: number | null; isOverdue: boolean }) {
    if (daysRemaining === null) return <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">No deadline</span>;

    if (isOverdue) {
        return (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-rose-600 bg-rose-50 px-4 py-1.5 rounded-full border border-rose-100 animate-pulse uppercase tracking-widest whitespace-nowrap">
                <Timer size={14} /> OVERDUE by {Math.abs(daysRemaining)} day(s)
            </span>
        );
    }

    const color = daysRemaining <= 2
        ? 'text-rose-600 bg-rose-50 border-rose-100'
        : daysRemaining <= 5
            ? 'text-amber-600 bg-amber-50 border-amber-100'
            : 'text-emerald-600 bg-emerald-50 border-emerald-100';

    return (
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-black ${color} px-4 py-1.5 rounded-full border uppercase tracking-widest whitespace-nowrap`}>
            <Clock size={14} /> {daysRemaining} day(s) remaining
        </span>
    );
}

const DetailsModal = ({ entry, onClose }: { entry: ShortageEntry, onClose: () => void }) => {
    const req = entry.shortage_request;
    const startDate = entry.created_at ? new Date(entry.created_at).toISOString().split('T')[0] : '—';
    const endDate = req?.deadline || '—';

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl relative border border-slate-200 flex flex-col"
            >
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex gap-4 items-center">
                        <div className="bg-orange-600 p-2 rounded-xl text-white shadow-lg shadow-orange-600/20 flex-shrink-0">
                            <Car size={16} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <h2 className="text-[9px] font-black text-slate-900 uppercase tracking-widest whitespace-nowrap">ASSIGNMENT DETAILS</h2>
                            <div className="flex items-center gap-3">
                                <h3 className="text-[14px] font-black text-black uppercase whitespace-nowrap leading-none">{req?.inventory_item?.vehicle_name || 'Generic'}</h3>
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest whitespace-nowrap leading-none">{req?.formatted_id}</p>
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest whitespace-nowrap leading-none flex-shrink-0">
                                    {req?.inventory_item?.sap_part_number}
                                </p>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto custom-scrollbar">
                    <div className="space-y-4">
                        <div className="bg-orange-50/30 rounded-3xl p-6 border border-orange-100/50">
                            <div className="text-[10px] font-bold text-black uppercase tracking-widest mb-4 flex items-center gap-2">
                                <MapPin size={12} />
                                <span>Production Context</span>
                            </div>
                            <div className="space-y-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-500 flex-shrink-0 border border-slate-100">
                                        <LayoutGrid size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest mb-1">Production Line</p>
                                        <p className="text-[14px] font-black text-black uppercase tracking-tight">
                                            {req?.line_name || 'NO LINE ASSIGNED'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-500 flex-shrink-0 border border-slate-100">
                                        <Database size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest mb-1">Customer / Division</p>
                                        <p className="text-[14px] font-black text-black uppercase italic tracking-tight">
                                            {req?.customer_name || 'CIE AUTOMOTIVE'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-orange-50/30 rounded-3xl p-6 border border-orange-100/50">
                            <div className="text-[10px] font-black text-black uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Clock size={12} />
                                <span>Timeline Details</span>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Start Date</span>
                                    <span className="text-xs font-black text-black tabular-nums">{startDate}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Target End</span>
                                    <span className="text-xs font-black text-black tabular-nums">{endDate}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-orange-50/30 rounded-3xl p-6 border border-orange-100/50">
                            <div className="text-[10px] font-black text-black uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Package size={11} />
                                <span>Assigned Personnel</span>
                            </div>

                            <div className="space-y-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 flex-shrink-0 border border-orange-200">
                                        <User size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[7.5px] font-black text-orange-500 uppercase tracking-widest mb-1">Supervisor</p>
                                        <p className="text-[14px] font-black text-black uppercase tracking-tight truncate">
                                            {req?.supervisor_name || 'Unassigned'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 flex-shrink-0 border border-indigo-200">
                                        <User size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[7.5px] font-black text-indigo-500 uppercase tracking-widest mb-1">Data Entry Operator</p>
                                        <p className="text-[14px] font-black text-black uppercase tracking-tight truncate">
                                            {entry.deo_name || 'Unassigned'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-emerald-50/30 rounded-3xl p-6 border border-emerald-100/50">
                            <div className="text-[10px] font-black text-black uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Database size={12} className="text-emerald-600" />
                                <span>Submitted Stock Data</span>
                            </div>
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-white/60 p-3 rounded-xl border border-emerald-100/50">
                                        <p className="text-[7px] font-black text-emerald-600 uppercase tracking-widest mb-1">SAP Stock</p>
                                        <p className="text-[12px] font-black text-slate-900">{entry.sap_stock ?? '—'}</p>
                                    </div>
                                    <div className="bg-white/60 p-3 rounded-xl border border-emerald-100/50">
                                        <p className="text-[7px] font-black text-emerald-600 uppercase tracking-widest mb-1">Opening</p>
                                        <p className="text-[12px] font-black text-slate-900">{entry.opening_stock ?? '—'}</p>
                                    </div>
                                    <div className="bg-white/60 p-3 rounded-xl border border-emerald-100/50">
                                        <p className="text-[7px] font-black text-emerald-600 uppercase tracking-widest mb-1">Today's</p>
                                        <p className="text-[12px] font-black text-slate-900">{entry.todays_stock ?? '—'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-7 pb-6 pt-2 flex justify-center">
                    <button
                        onClick={onClose}
                        className="w-full py-4.5 bg-orange-600 text-white rounded-full font-black text-[11px] uppercase tracking-[0.25em] shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                    >
                        <Zap size={18} fill="white" />
                        Dismiss Detailed View
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const VerifyModal = ({ entry, onClose, onSuccess }: {
    entry: ShortageEntry;
    onClose: () => void;
    onSuccess: () => void;
}) => {
    const [rejecting, setRejecting] = useState(false);
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    const handleAction = async (status: 'VERIFIED' | 'REJECTED') => {
        if (status === 'REJECTED' && !reason.trim()) {
            setError('Please provide a rejection reason');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API}/supervisor/shortage-entries/${entry.id}/verify`, {
                method: 'PATCH',
                headers: authHeaders(),
                body: JSON.stringify({ status, reason })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            setShowSuccess(true);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 2000);
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const req = entry.shortage_request;
    const item = req?.inventory_item;
    const needTotal = (req?.shortage_quantity && req.shortage_quantity > 0) ? req.shortage_quantity : (item?.demand_quantity || 0);
    const perDay = (req?.per_day && req.per_day > 0) ? req.per_day : needTotal;
    const tStock = entry.todays_stock || 0;
    const coverage = (perDay > 0 ? (tStock / perDay).toFixed(1) : '0.0');
    const isGood = Number(coverage) >= 5;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[98vh] border border-slate-200"
            >
                <AnimatePresence>
                    {showSuccess && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-[120] bg-slate-900/20 backdrop-blur-sm flex flex-col items-center justify-center p-4"
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 10, opacity: 0 }}
                                animate={{ scale: 1, y: 0, opacity: 1 }}
                                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                                className="bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center justify-center max-w-[320px] w-full border border-slate-100 text-center"
                            >
                                <motion.div
                                    initial={{ scale: 0, rotate: -45 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
                                    className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white mb-4 shadow-xl shadow-emerald-500/20"
                                >
                                    <CheckCircle2 size={32} />
                                </motion.div>
                                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight mb-1">VERIFIED SUCCESSFULLY</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Record has been finalized
                                </p>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">VERIFY SUBMITTED DATA</h2>
                        <p className="text-[10px] text-slate-900 font-black uppercase tracking-widest mt-1">{req?.formatted_id} | {item?.sap_part_number}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 flex flex-col min-h-0 bg-white">
                    <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest leading-none whitespace-nowrap">PART DETAILS:</p>
                                <h3 className="font-black text-black text-[10px] uppercase leading-tight tracking-tight">
                                    {item?.part_description || item?.sap_part_number}
                                </h3>
                            </div>
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                <div className="flex gap-6">
                                    <p className="font-bold tracking-tight">
                                        <span className="text-[9px] text-slate-900 font-black uppercase tracking-widest block mb-0.5">Machine</span>
                                        <span className="text-xs text-black font-black uppercase">{req?.line_name || 'Generic'}</span>
                                    </p>
                                    <p className="font-bold tracking-tight">
                                        <span className="text-[9px] text-slate-900 font-black uppercase tracking-widest block mb-0.5">Vehicle</span>
                                        <span className="text-xs text-black font-black uppercase">{item?.vehicle_name || 'Generic'}</span>
                                    </p>
                                    <p className="font-bold tracking-tight">
                                        <span className="text-[9px] text-slate-900 font-black uppercase tracking-widest block mb-0.5">Need Total</span>
                                        <span className="text-xs text-black font-black uppercase">{needTotal} units</span>
                                    </p>
                                </div>
                                <TimelineBar daysRemaining={req?.days_remaining ?? null} isOverdue={req?.is_overdue ?? false} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">Daily Metrics</p>
                            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div className="flex flex-col p-2">
                                    <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest mb-1.5">Target Per Day</span>
                                    <span className="text-xs font-black text-black uppercase tracking-tight">{perDay} units</span>
                                </div>
                                <div className="flex flex-col p-2 border-x border-slate-200/50">
                                    <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest mb-1.5">Today's Stock</span>
                                    <span className="text-xs font-black text-orange-600 uppercase tracking-tight">{tStock} units</span>
                                </div>
                                <div className="flex flex-col p-2">
                                    <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest mb-1.5">Est. Coverage</span>
                                    <span className={`text-xs font-black tracking-tight ${isGood ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {coverage} Days
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            {[
                                { label: 'SAP STOCK', value: entry.sap_stock },
                                { label: 'OPENING STOCK', value: entry.opening_stock },
                            ].map(({ label, value }) => (
                                <div key={label}>
                                    <label className="block text-[10px] font-black text-slate-900 mb-2 uppercase tracking-widest">{label}</label>
                                    <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-900 shadow-sm">
                                        {value ?? '—'}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-black mb-2.5 uppercase tracking-widest">DEO NOTES</label>
                            <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-900 shadow-sm min-h-[60px]">
                                {entry.notes || 'No notes provided'}
                            </div>
                        </div>

                        {rejecting && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-3 p-5 bg-rose-50 rounded-3xl border border-rose-100"
                            >
                                <label className="block text-xs font-bold text-rose-600 uppercase tracking-widest">REJECTION REASON</label>
                                <textarea
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    rows={2}
                                    placeholder="Please explain why this data is being rejected..."
                                    className="w-full bg-white border border-rose-200 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500 transition-all resize-none shadow-sm font-black placeholder:text-rose-300"
                                    required
                                />
                            </motion.div>
                        )}

                        {error && (
                            <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 flex items-center gap-2 text-rose-600">
                                <AlertTriangle size={14} />
                                <p className="text-[10px] font-black uppercase tracking-tight">{error}</p>
                            </div>
                        )}
                    </div>

                    <div className="p-7 py-5 border-t border-gray-100 flex gap-4">
                        {!rejecting ? (
                            <>
                                <button onClick={() => setRejecting(true)}
                                    className="flex-1 py-3.5 rounded-full border border-rose-200 text-xs font-black text-rose-500 hover:bg-rose-50 transition-all uppercase tracking-widest flex items-center justify-center gap-2">
                                    <Trash2 size={14} /> REJECT
                                </button>
                                <button onClick={() => handleAction('VERIFIED')} disabled={loading}
                                    className="flex-1 py-3.5 rounded-full bg-[#f37021] hover:bg-orange-700 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-orange-600/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                                    {loading ? <Loader2 className="animate-spin" size={14} /> : (
                                        <>
                                            <Zap size={14} fill="white" />
                                            VERIFY & APPROVE
                                        </>
                                    )}
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setRejecting(false)}
                                    className="flex-1 py-3.5 rounded-full border border-slate-200 text-xs font-black text-slate-500 hover:bg-slate-50 transition-all uppercase tracking-widest">
                                    BACK
                                </button>
                                <button onClick={() => handleAction('REJECTED')} disabled={loading}
                                    className="flex-1 py-3.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-rose-600/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                                    {loading ? <Loader2 className="animate-spin" size={14} /> : (
                                        <>
                                            <AlertCircle size={14} />
                                            CONFIRM REJECTION
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default function SupervisorShortageVerify() {
    const [entries, setEntries] = useState<ShortageEntry[]>([]);
    const [lineGroupsMaster, setLineGroupsMaster] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLine, setSelectedLine] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedDate, setSelectedDate] = useState('');
    const [activeEntry, setActiveEntry] = useState<ShortageEntry | null>(null);
    const [activeModalType, setActiveModalType] = useState<'details' | 'verify' | 'view' | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const fetchLineGroups = async () => {
        try {
            const res = await fetch(`${API}/admin/machines/status`, { headers: authHeaders() });
            const data = await res.json();
            if (data.success) {
                setLineGroupsMaster(data.data);
            }
        } catch (err) {
            console.error("Failed to fetch line groups:", err);
        }
    };

    const fetchEntries = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        try {
            const res = await fetch(`${API}/supervisor/shortage-entries`, { headers: authHeaders() });
            const data = await res.json();
            if (data.success) {
                setEntries(data.data);
            }
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    useEffect(() => {
        fetchLineGroups();
        fetchEntries();
        const interval = setInterval(() => {
            fetchLineGroups();
            fetchEntries(true);
        }, 15000);
        return () => clearInterval(interval);
    }, []);

    const latestEntries = useMemo(() => {
        // Dedup and sort
        const map = new Map<string, ShortageEntry>();
        for (const entry of entries) {
            const key = `${entry.shortage_request_id}-${entry.date}`;
            const existing = map.get(key);
            if (!existing || entry.id > existing.id) {
                map.set(key, entry);
            }
        }
        return Array.from(map.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [entries]);

    const lineGroups = useMemo(() => {
        const groups: Record<string, {
            name: string;
            totalShortages: number;
            pendingCount: number;
            sub_machines: any[];
            total_machines_master?: number | null;
        }> = {};

        // 1. Initialize with all master groups
        lineGroupsMaster.forEach(lg => {
            groups[lg.name] = {
                name: lg.name,
                totalShortages: 0,
                pendingCount: 0,
                sub_machines: lg.sub_machines || [],
                total_machines_master: lg.total_machines
            };
        });

        // 2. Add shortage counts from entries
        latestEntries.forEach(entry => {
            // Exclude verified items from main grid metrics unless specifically viewing verified logs
            if (entry.status === 'VERIFIED' && statusFilter !== 'verified') return;

            const req = entry.shortage_request;
            const rawLine = req?.master_machine || req?.line_name || 'Generic';
            const individualLines = rawLine.split(',').map(s => s.trim()).filter(Boolean);

            individualLines.forEach(lineName => {
                if (!groups[lineName]) {
                    groups[lineName] = {
                        name: lineName,
                        totalShortages: 0,
                        pendingCount: 0,
                        sub_machines: [],
                        total_machines_master: null
                    };
                }
                groups[lineName].totalShortages++;
                if (entry.status === 'PENDING_SUPERVISOR') {
                    groups[lineName].pendingCount++;
                }
            });
        });

        return Object.values(groups).sort((a, b) => b.pendingCount - a.pendingCount);
    }, [latestEntries, lineGroupsMaster, statusFilter]);

    const displayItems = useMemo(() => {
        if (!selectedLine) return [];
        
        const group = lineGroups.find(lg => lg.name === selectedLine);
        const allSubMachines = group ? group.sub_machines : [];

        const lineEntries = latestEntries.filter(entry => {
            const req = entry.shortage_request;
            const rawLine = req?.master_machine || req?.line_name || 'Generic';
            return rawLine.split(',').map(s => s.trim()).includes(selectedLine);
        });

        if (allSubMachines.length === 0) {
            return lineEntries.map(e => ({
                machineName: e.shortage_request?.line_name || 'Generic',
                entry: e
            }));
        }

        const result: { machineName: string; entry: ShortageEntry | null }[] = [];
        const assignedEntryIds = new Set<number>();
        
        allSubMachines.forEach((sub: any) => {
            const machineEntries = lineEntries.filter(e => 
                e.shortage_request?.line_name?.trim().toUpperCase() === sub.name?.trim().toUpperCase()
            );
            
            if (machineEntries.length > 0) {
                // If multiple entries for the same machine, add all (though usually it's 1 active)
                machineEntries.forEach(e => {
                    result.push({ machineName: sub.name, entry: e });
                    assignedEntryIds.add(e.id);
                });
            } else {
                result.push({ machineName: sub.name, entry: null });
            }
        });

        // Add any generic entries for this group that didn't match a specific sub-machine
        lineEntries.forEach(e => {
            if (!assignedEntryIds.has(e.id)) {
                result.push({ 
                    machineName: e.shortage_request?.line_name || 'Generic', 
                    entry: e 
                });
            }
        });

        return result;
    }, [selectedLine, lineGroups, latestEntries]);

    const filteredEntries = useMemo(() => {
        return latestEntries.filter(entry => {
            if (selectedLine) {
                const req = entry.shortage_request;
                const rawLine = req?.master_machine || req?.line_name || 'Generic';
                const individualLines = rawLine.split(',').map(s => s.trim());
                if (!individualLines.includes(selectedLine)) return false;
            }

            const query = searchQuery.toLowerCase();
            const partMatch = entry.shortage_request?.inventory_item?.sap_part_number?.toLowerCase().includes(query) ||
                entry.shortage_request?.inventory_item?.part_description?.toLowerCase().includes(query) ||
                entry.shortage_request?.formatted_id?.toLowerCase().includes(query);
            if (searchQuery && !partMatch) return false;

            if (statusFilter === 'all') {
                // "Active Status" by default excludes verified logs to prevent clutter
                if (entry.status === 'VERIFIED') return false;
            } else {
                if (statusFilter === 'pending' && entry.status !== 'PENDING_SUPERVISOR') return false;
                if (statusFilter === 'verified' && entry.status !== 'VERIFIED') return false;
                if (statusFilter === 'rejected' && entry.status !== 'REJECTED') return false;
            }

            if (selectedDate && !entry.date.includes(selectedDate)) return false;

            return true;
        });
    }, [latestEntries, selectedLine, searchQuery, statusFilter, selectedDate]);

    // Reset to page 1 when filters or selectedLine change
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedLine, searchQuery, statusFilter, selectedDate]);

    const currentList = selectedLine ? displayItems : lineGroups;
    const paginatedItems = currentList.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const totalPages = Math.ceil(currentList.length / pageSize);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 size={40} className="animate-spin text-[#f37021]" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col space-y-1 animate-in fade-in duration-700 overflow-hidden text-slate-900 bg-gray-50/30 p-2">
            {/* Header */}
            <div className="flex xl:flex-row xl:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl mb-2 p-4 shadow-sm">
                <div className="flex flex-col gap-1">
                    <h1 className="text-[24px] font-black text-slate-900 tracking-tight leading-none flex items-center gap-2">
                        {selectedLine ? `Shortages: ${selectedLine}` : 'Shortage Dashboard'}
                    </h1>
                </div>

                <div className="flex items-center bg-gray-50 rounded-2xl border border-slate-200 p-1 shadow-inner">
                    <div className="px-4 py-1 text-center border-r border-slate-200 min-w-[80px]">
                        <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">TOTAL</span>
                        <span className="block text-lg font-black text-slate-800 leading-none">{latestEntries.length}</span>
                    </div>
                    <div className="px-4 py-1 text-center border-r border-slate-200 text-amber-500 min-w-[80px]">
                        <span className="block text-[8px] font-bold uppercase tracking-wider opacity-60">PENDING</span>
                        <span className="block text-lg font-black leading-none">{latestEntries.filter(e => e.status === 'PENDING_SUPERVISOR').length}</span>
                    </div>
                    <div className="px-4 py-1 text-center text-emerald-500 min-w-[80px]">
                        <span className="block text-[8px] font-bold uppercase tracking-wider opacity-60">VERIFIED</span>
                        <span className="block text-lg font-black leading-none">{latestEntries.filter(e => e.status === 'VERIFIED').length}</span>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-1 mb-3">
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {selectedLine && (
                        <button
                            onClick={() => setSelectedLine(null)}
                            className="h-[42px] px-6 bg-white border border-slate-200 rounded-full text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
                        >
                            <ArrowLeft size={16} /> Back
                        </button>
                    )}

                    <div className="relative group w-full md:w-48">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1 bg-orange-50 rounded text-orange-500 group-focus-within:text-orange-600 pointer-events-none">
                            <LayoutGrid size={11} />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full bg-white border border-slate-200 focus:border-orange-500 rounded-full h-[42px] pl-12 pr-10 text-slate-700 font-bold text-[11px] tracking-wide outline-none transition-all shadow-sm cursor-pointer appearance-none uppercase"
                        >
                            <option value="all">Active Status</option>
                            <option value="pending">Pending</option>
                            <option value="verified">Verified</option>
                            <option value="rejected">Rejected</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <ChevronDown size={14} />
                        </div>
                    </div>

                    <div className="relative group w-full md:w-72">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={14} />
                        <input
                            type="text"
                            placeholder="Search shortages..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-slate-200 focus:border-orange-500 rounded-full h-[42px] pl-14 pr-6 text-slate-700 font-bold text-[11px] tracking-wide placeholder:text-slate-300 outline-none transition-all shadow-sm uppercase"
                        />
                    </div>
                </div>

                <div className="relative group flex-shrink-0">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1 bg-indigo-50/50 rounded text-indigo-400 group-focus-within:text-orange-500 pointer-events-none">
                        <Calendar size={12} />
                    </div>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-white border border-slate-200 focus:border-orange-500 rounded-full h-[42px] pl-12 pr-5 text-slate-700 font-bold text-[11px] tracking-wide outline-none transition-all shadow-sm w-[180px] uppercase cursor-pointer"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-hidden bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <AnimatePresence mode="wait">
                        {!selectedLine ? (
                            <motion.table
                                key="summary"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="w-full text-sm text-left border-collapse"
                            >
                                <thead className="bg-white text-slate-900 border-b-2 border-orange-500 uppercase text-[11px] font-black tracking-widest sticky top-0 z-[50]">
                                    <tr>
                                        <th className="px-6 py-4 whitespace-nowrap">Sr.No</th>
                                        <th className="px-6 py-4 whitespace-nowrap">Line Name</th>
                                        <th className="px-6 py-4 text-center whitespace-nowrap">Total Machines</th>
                                        <th className="px-6 py-4 text-center whitespace-nowrap">Active Shortages</th>
                                        <th className="px-6 py-4 text-center whitespace-nowrap">Status</th>
                                        <th className="px-6 py-4 text-right whitespace-nowrap">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedItems.map((lg: any, idx) => {
                                        const serialNum = (currentPage - 1) * pageSize + idx + 1;
                                        return (
                                            <tr key={lg.name} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setSelectedLine(lg.name)}>
                                                <td className="px-6 py-4">
                                                    <span className="text-[11px] font-black text-slate-900">{serialNum}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform border border-orange-100 shadow-sm font-black text-[12px]">
                                                            {lg.name?.[0]?.toUpperCase()}
                                                        </div>
                                                        <span className="text-[13px] font-black text-slate-900 tracking-tight">{lg.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="px-3 py-1 bg-slate-50 text-slate-900 rounded-full text-[10px] font-black border border-slate-100">
                                                        {lg.total_machines_master || lg.sub_machines.length} Machines
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-[11px] font-black text-orange-600 uppercase tracking-tight">
                                                        {lg.totalShortages} Total
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={cn(
                                                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                                        lg.pendingCount === 0 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                                                    )}>
                                                        {lg.pendingCount === 0 ? 'ALL VERIFIED' : `${lg.pendingCount} PENDING`}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button className="px-5 h-8 bg-white border border-slate-200 text-orange-600 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ml-auto shadow-sm group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-500 transition-all">
                                                        <Eye size={12} />
                                                        View
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </motion.table>
                        ) : (
                            <motion.table
                                key="details"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="w-full text-sm text-left border-collapse"
                            >
                                <thead className="bg-white text-slate-900 border-b-2 border-orange-500 uppercase text-[11px] font-black tracking-widest sticky top-0 z-[50]">
                                    <tr>
                                        <th className="px-6 py-4 whitespace-nowrap">Sr.NO</th>
                                        <th className="px-6 py-4 whitespace-nowrap">Sub Machine</th>
                                        <th className="px-6 py-4 whitespace-nowrap">Part Number</th>
                                        <th className="px-6 py-4 text-center whitespace-nowrap">Demand Date</th>
                                        <th className="px-6 py-4 text-center whitespace-nowrap">Coverage Day</th>
                                        <th className="px-6 py-4 text-center whitespace-nowrap">SAP Stock</th>
                                        <th className="px-6 py-4 text-center whitespace-nowrap">Opening</th>
                                        <th className="px-6 py-4 text-center whitespace-nowrap">Today's</th>
                                        <th className="px-6 py-4 text-center whitespace-nowrap">Target</th>
                                        <th className="px-6 py-4 text-center whitespace-nowrap">Status</th>
                                        <th className="px-6 py-4 text-right whitespace-nowrap">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedItems.map((item: any, idx) => {
                                        const entry = item.entry;
                                        const req = entry?.shortage_request;
                                        const invItem = req?.inventory_item;
                                        const needTotal = (req?.shortage_quantity && req.shortage_quantity > 0) ? req.shortage_quantity : (invItem?.demand_quantity || 0);
                                        const perDay = (req?.per_day && req.per_day > 0) ? req.per_day : needTotal;
                                        const coverage = (entry && perDay > 0 ? (entry.todays_stock / perDay).toFixed(1) : "—");
                                        const machineName = item.machineName;
                                        const serialNum = (currentPage - 1) * pageSize + idx + 1;

                                        return (
                                            <tr key={entry ? entry.id : `empty-${idx}`} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <span className="text-[11px] font-black text-slate-900">{serialNum}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 px-3 py-1 bg-orange-50/50 rounded-full border border-orange-100/50 w-fit">
                                                        <Zap size={10} className="text-orange-500" />
                                                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{machineName}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">
                                                        {invItem?.sap_part_number || '—'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider">
                                                        {entry ? new Date(entry.date).toLocaleDateString() : '—'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={cn(
                                                        "text-[10px] font-black tabular-nums px-2 py-1 rounded border",
                                                        coverage === "—" ? "text-slate-300 border-transparent" :
                                                            Number(coverage) >= 5 ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-rose-600 bg-rose-50 border-rose-100"
                                                    )}>
                                                        {coverage} {coverage !== "—" && "Days"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-[11px] font-black text-slate-900 tabular-nums">{entry?.sap_stock ?? '—'}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-[11px] font-black text-slate-900 tabular-nums">{entry?.opening_stock ?? '—'}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-[11px] font-black text-orange-600 tabular-nums">{entry?.todays_stock ?? '—'}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-[11px] font-black text-indigo-600 tabular-nums">{entry ? needTotal : '—'}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {entry ? (
                                                        <span className={cn(
                                                            "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border",
                                                            entry.status === 'PENDING_SUPERVISOR' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                                entry.status === 'VERIFIED' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                                    "bg-rose-50 text-rose-600 border-rose-100"
                                                        )}>
                                                            {entry.status === 'PENDING_SUPERVISOR' ? 'SUBMITTED' : entry.status}
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border bg-slate-50 text-slate-400 border-slate-200">
                                                            IDLE
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {entry && (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => { setActiveEntry(entry); setActiveModalType('details'); }}
                                                                className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-indigo-600 hover:border-indigo-400 flex items-center justify-center transition-all shadow-sm"
                                                                title="View Assignment Info"
                                                            >
                                                                <Info size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => { setActiveEntry(entry); setActiveModalType(entry.status === 'PENDING_SUPERVISOR' ? 'verify' : 'view'); }}
                                                                className={cn(
                                                                    "w-8 h-8 rounded-lg flex items-center justify-center text-white transition-all shadow-md",
                                                                    entry.status === 'PENDING_SUPERVISOR' ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20" : "bg-slate-400 hover:bg-slate-500"
                                                                )}
                                                                title={entry.status === 'PENDING_SUPERVISOR' ? "Verify" : "View Submission"}
                                                            >
                                                                {entry.status === 'PENDING_SUPERVISOR' ? <CheckCircle2 size={14} /> : <Eye size={14} />}
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </motion.table>
                        )}
                    </AnimatePresence>
                </div>

                {/* Pagination Footer */}
                {currentList.length > 0 && (
                    <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white">
                        <div className="flex items-center gap-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Showing <span className="text-slate-900">{(currentPage - 1) * pageSize + 1}</span> to <span className="text-slate-900">{Math.min(currentPage * pageSize, currentList.length)}</span> of <span className="text-slate-900">{currentList.length}</span> {selectedLine ? 'machines' : 'lines'}
                            </p>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 disabled:opacity-50 transition-all text-slate-600"
                            >
                                Prev
                            </button>

                            <div className="flex items-center gap-1 mx-2">
                                {[...Array(totalPages)].map((_, i) => {
                                    const page = i + 1;
                                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${currentPage === page ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'hover:bg-slate-100 text-slate-600'}`}
                                            >
                                                {page}
                                            </button>
                                        );
                                    }
                                    if (page === currentPage - 2 || page === currentPage + 2) {
                                        return <span key={page} className="text-slate-300 text-[10px] px-1">...</span>;
                                    }
                                    return null;
                                })}
                            </div>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 disabled:opacity-50 transition-all text-slate-600"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {activeEntry && activeModalType === 'details' && (
                <DetailsModal entry={activeEntry} onClose={() => { setActiveEntry(null); setActiveModalType(null); }} />
            )}

            {activeEntry && (activeModalType === 'verify' || activeModalType === 'view') && (
                <VerifyModal
                    entry={activeEntry}
                    onClose={() => { setActiveEntry(null); setActiveModalType(null); }}
                    onSuccess={() => fetchEntries(true)}
                />
            )}
        </div>
    );
}