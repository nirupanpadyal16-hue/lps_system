import { useState, useEffect, useMemo, useRef } from 'react';
import { getToken } from '../../../lib/storage';
import { API_BASE as API } from '../../../lib/apiConfig';
import {
    Search, Calendar, ChevronDown, CheckCircle2,
    Eye, AlertCircle, Loader2, Car, Trash2, ListFilter, X, Info, AlertTriangle, Database, Package, User, MapPin, Clock, Timer, Zap, LayoutGrid, ArrowLeft, Factory
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SupervisorCalendar } from './components/SupervisorCalendar';
import { cn } from '../../../lib/utils';

const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
});

interface ShortageEntry {
    id: number;
    shortage_request_id: number
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

// ─────────────────────────────────────────────────────────────────────────────
// MODAL 1: Assignment Details (full context – line, personnel, timeline)
// ─────────────────────────────────────────────────────────────────────────────
const AssignmentDetailsModal = ({ entry, onClose }: { entry: ShortageEntry, onClose: () => void }) => {
    const req = entry.shortage_request;
    const startDate = entry.created_at ? new Date(entry.created_at).toISOString().split('T')[0] : '—';
    const endDate = req?.deadline || '—';

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]">
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

                <div className="p-2 grid grid-cols-2 gap-2 flex-1 overflow-y-auto custom-scrollbar">
                    <div className="space-y-2">
                        <div className="bg-orange-50/30 rounded-3xl p-6 border border-orange-100/50">
                            <div className="text-[10px] font-bold text-black uppercase tracking-widest mb-2 flex items-center gap-2">
                                <MapPin size={12} />
                                <span>Production Context</span>
                            </div>
                            <div className="space-y-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500 flex-shrink-0">
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
                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100">
                                        <Database size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest mb-1">Customer / Division</p>
                                        <p className="text-[14px] font-black text-black uppercase italic font-serif tracking-tight">
                                            {req?.customer_name || 'CIE AUTOMOTIVE'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-orange-50/30 rounded-3xl p-6 border border-orange-100/50">
                            <div className="text-[10px] font-black text-black uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Clock size={12} />
                                <span>Timeline Details</span>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-black text-ind-text3 uppercase tracking-widest">Start Date</span>
                                    <span className="text-xs font-black text-ind-text tabular-nums">{startDate}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-black text-ind-text3 uppercase tracking-widest">Target End</span>
                                    <span className="text-xs font-black text-ind-text tabular-nums">{endDate}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="bg-orange-50/30 rounded-3xl p-6 border border-orange-100/50">
                            <div className="text-[10px] font-black text-black uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Package size={11} />
                                <span>Assigned Personnel</span>
                            </div>

                            <div className="space-y-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500 flex-shrink-0">
                                        <User size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[7.5px] font-black text-orange-400 uppercase tracking-widest mb-1">Supervisor</p>
                                        <p className="text-[14px] font-black text-black uppercase tracking-tight truncate">
                                            {req?.supervisor_name || 'Unassigned'}
                                        </p>
                                        {req?.supervisor_email && (
                                            <p className="text-[10px] font-black text-slate-900 flex items-center gap-1.5 mt-1.5 overflow-hidden text-ellipsis">
                                                <Info size={11} className="text-orange-400" />
                                                {req?.supervisor_email}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 flex-shrink-0">
                                        <User size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[7.5px] font-black text-indigo-400 uppercase tracking-widest mb-1">Data Entry Operator</p>
                                        <p className="text-[14px] font-black text-black uppercase tracking-tight truncate">
                                            {entry.deo_name || 'Unassigned'}
                                        </p>
                                        {req?.deo_email && (
                                            <p className="text-[10px] font-black text-slate-900 flex items-center gap-1.5 mt-1.5 overflow-hidden text-ellipsis">
                                                <Info size={11} className="text-indigo-400" />
                                                {req?.deo_email}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-emerald-50/30 rounded-3xl p-6 border border-emerald-100/50">
                            <div className="text-[10px] font-black text-black uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Database size={12} className="text-emerald-600" />
                                <span>Submitted Stock Data</span>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="grid grid-cols-3 gap-2">
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
                                {entry.notes && (
                                    <div className="bg-white/60 p-3 rounded-xl border border-emerald-100/50">
                                        <p className="text-[7px] font-black text-emerald-600 uppercase tracking-widest mb-1">Notes</p>
                                        <p className="text-[10px] font-bold text-slate-700 italic">"{entry.notes}"</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-7 pb-6 pt-0 bg-ind-bg/5 flex justify-center">
                    <button
                        onClick={onClose}
                        className="w-full py-4.5 bg-ind-primary text-white rounded-full font-black text-[11px] uppercase tracking-[0.25em] shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                    >
                        <Zap size={18} fill="white" />
                        Dismiss Detailed View
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const TimelineBar = ({ daysRemaining, isOverdue }: { daysRemaining: number | null; isOverdue: boolean }) => {
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
};

const SubmittedDataModal = ({
    entry,
    onClose,
    onVerify,
    onReject,
    isVerifyMode
}: {
    entry: ShortageEntry;
    onClose: () => void;
    onVerify?: (id: number) => void;
    onReject?: (id: number) => void;
    isVerifyMode?: boolean;
}) => {
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
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">VIEW SUBMITTED DATA</h2>
                        <p className="text-[10px] text-slate-900 font-black uppercase tracking-widest mt-1">{req?.formatted_id} | {item?.sap_part_number}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 flex flex-col min-h-0 bg-white">
                    <div className="p-6 space-y-2 overflow-y-auto custom-scrollbar flex-1">
                        <div className="flex flex-col gap-3">
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
                                        <p className="font-bold tracking-tight">
                                            <span className="text-[9px] text-indigo-600 font-black uppercase tracking-widest block mb-0.5">SAP Current</span>
                                            <span className="text-xs text-indigo-700 font-black uppercase">{item?.current_stock || 0}</span>
                                        </p>
                                    </div>
                                    <TimelineBar daysRemaining={req?.days_remaining ?? null} isOverdue={req?.is_overdue ?? false} />
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">Daily Metrics</p>
                                <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="flex flex-col p-2 text-center sm:text-left">
                                        <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest mb-1.5">Timeline</span>
                                        <span className="text-xs font-black text-black uppercase tracking-tight">1 Days</span>
                                    </div>
                                    <div className="flex flex-col p-2 border-x border-slate-200/50 text-center sm:text-left">
                                        <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest mb-1.5">Target Per Day</span>
                                        <span className="text-xs font-black text-black uppercase tracking-tight">{perDay} units</span>
                                    </div>
                                    <div className="flex flex-col p-2 text-center sm:text-left">
                                        <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest mb-1.5">Est. Coverage</span>
                                        <span className={`text-xs font-black tracking-tight ${isGood ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {coverage} Days
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr className="border-slate-100" />

                        <div className="space-y-6">
                            <div className="grid grid-cols-3 gap-5">
                                {[
                                    { label: 'SAP STOCK', value: entry.sap_stock },
                                    { label: 'OPENING STOCK', value: entry.opening_stock },
                                    { label: "TODAY'S STOCK", value: entry.todays_stock },
                                ].map(({ label, value }) => (
                                    <div key={label}>
                                        <label className="block text-[10px] font-black text-slate-900 mb-2 uppercase tracking-widest">{label}</label>
                                        <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-900 shadow-sm min-h-[56px] flex items-center">
                                            {value ?? '—'}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-black mb-2.5 uppercase tracking-widest">NOTES</label>
                                <div className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-900 shadow-sm min-h-[80px]">
                                    {entry.notes || 'No notes provided'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-7 py-5 border-t border-gray-100 flex gap-4">
                        <button onClick={onClose}
                            className="flex-1 py-3.5 rounded-full border border-slate-200 text-xs font-black text-slate-500 hover:bg-slate-50 transition-all uppercase tracking-widest">
                            CANCEL
                        </button>
                        {isVerifyMode ? (
                            <>
                                <button onClick={() => { if (onReject) onReject(entry.id); }}
                                    className="px-6 py-3.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-black text-xs uppercase tracking-[0.2em] border border-rose-100 transition-all flex items-center justify-center gap-2">
                                    <X size={14} strokeWidth={3} /> REJECT
                                </button>
                                <button onClick={() => { if (onVerify) onVerify(entry.id); }}
                                    className="flex-1 py-3.5 rounded-full bg-[#f37021] hover:bg-orange-700 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2">
                                    <Zap size={14} fill="white" /> VERIFY ENTRY
                                </button>
                            </>
                        ) : (
                            <button onClick={onClose}
                                className="flex-1 py-3.5 rounded-full bg-[#f37021] hover:bg-orange-700 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2">
                                CLOSE VIEW
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT (unchanged logic, only replaced inline expand with modals)
// ─────────────────────────────────────────────────────────────────────────────
export default function SupervisorShortageVerify() {
    const [entries, setEntries] = useState<ShortageEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Status');
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState('');
    const [showCal, setShowCal] = useState(false);
    const [detailModalEntry, setDetailModalEntry] = useState<ShortageEntry | null>(null);
    const [detailModalType, setDetailModalType] = useState<'assignment' | 'view' | 'verify' | null>(null);

    // Reject & confirm modals
    const [rejectModal, setRejectModal] = useState<{ entryId: number } | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [confirmModal, setConfirmModal] = useState<{ entryId: number; status: 'VERIFIED' | 'REJECTED'; reason: string } | null>(null);
    const [alertModal, setAlertModal] = useState<string | null>(null);
    const rejectInputRef = useRef<HTMLTextAreaElement>(null);


    const fetchEntries = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/supervisor/shortage-entries`, { headers: authHeaders() });
            const data = await res.json();
            if (data.success) {
                setEntries(data.data);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEntries();
        const interval = setInterval(() => fetchEntries(), 30000);
        return () => clearInterval(interval);
    }, []);

    const handleVerify = async (id: number, status: 'VERIFIED' | 'REJECTED', reason: string = '') => {
        setVerifying(id);
        try {
            const res = await fetch(`${API}/supervisor/shortage-entries/${id}/verify`, {
                method: 'PATCH',
                headers: authHeaders(),
                body: JSON.stringify({ status, reason })
            });
            const data = await res.json();
            if (data.success) {
                fetchEntries();
                setDetailModalEntry(null);
            } else {
                setAlertModal(data.message || 'Operation failed.');
            }
        } catch (e: any) {
            setAlertModal('Error: ' + e.message);
        } finally {
            setVerifying(null);
        }
    };

    // const requestVerify = (entry: ShortageEntry) => {
    //     setDetailModalEntry(entry);
    //     setDetailModalType('submitted');
    // };

    // const requestReject = (entry: ShortageEntry) => {
    //     setDetailModalEntry(entry);
    //     setDetailModalType('submitted');
    // };

    const submitReject = () => {
        if (!rejectModal) return;
        setConfirmModal({ entryId: rejectModal.entryId, status: 'REJECTED', reason: rejectReason });
        setRejectModal(null);
    };

    const confirmAction = () => {
        if (!confirmModal) return;
        handleVerify(confirmModal.entryId, confirmModal.status, confirmModal.reason);
        setConfirmModal(null);
    };

    const latestEntries = useMemo(() => {
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

    const pendingCount = latestEntries.filter(e => e.status === 'PENDING_SUPERVISOR').length;
    const verifiedCount = latestEntries.filter(e => e.status === 'VERIFIED').length;
    const rejectedCount = latestEntries.filter(e => e.status === 'REJECTED').length;

    const [selectedLine, setSelectedLine] = useState<string | null>(null);

    // Grouping entries by line for Dashboard summary
    const lineSummaries = useMemo(() => {
        const summaries: Record<string, {
            lineName: string;
            totalMachines: Set<string>;
            pendingCount: number;
            totalShortages: number;
        }> = {};

        latestEntries.forEach(entry => {
            const line = entry.shortage_request?.line_name || 'Generic';
            if (!summaries[line]) {
                summaries[line] = {
                    lineName: line,
                    totalMachines: new Set(),
                    pendingCount: 0,
                    totalShortages: 0
                };
            }
            summaries[line].totalShortages++;
            if (entry.status === 'PENDING_SUPERVISOR') {
                summaries[line].pendingCount++;
            }
            // Fallback: use sub_machine_name if available, otherwise just use lineName
            const machine = (entry as any).sub_machine_name || (entry.shortage_request as any).sub_machine_name || line;
            summaries[line].totalMachines.add(machine);
        });

        return Object.values(summaries).sort((a, b) => b.pendingCount - a.pendingCount);
    }, [latestEntries]);

    const filteredEntries = useMemo(() => {
        return latestEntries.filter(entry => {
            const matchLine = selectedLine ? entry.shortage_request?.line_name === selectedLine : true;
            const matchSearch = (
                entry.shortage_request?.inventory_item.part_description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                entry.shortage_request?.inventory_item.sap_part_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                entry.shortage_request?.formatted_id?.toLowerCase().includes(searchQuery.toLowerCase())
            );
            const matchStatus =
                statusFilter === 'All Status' ? true :
                    statusFilter === 'Pending' ? entry.status === 'PENDING_SUPERVISOR' :
                        statusFilter === 'Verified' ? entry.status === 'VERIFIED' :
                            statusFilter === 'Rejected' ? entry.status === 'REJECTED' : true;
            const matchDate = selectedDate ? entry.date === selectedDate || entry.created_at.startsWith(selectedDate) : true;
            return matchLine && matchSearch && matchStatus && matchDate;
        });
    }, [latestEntries, searchQuery, statusFilter, selectedDate, selectedLine]);

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-orange-500" /></div>;
    }

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Header Block */}
            <div className="flex xl:flex-row xl:items-center justify-between gap-4 bg-white border border-slate-200 rounded-3xl mb-2 p-5 shadow-sm mx-1">
                <div className="flex flex-col gap-1">
                    <h1 className="text-[26px] font-black text-slate-900 tracking-tight leading-none flex items-center gap-3">
                        <div className="bg-orange-50 p-1.5 rounded-xl border border-orange-100">
                            <Zap className="text-orange-600 fill-orange-600" size={22} />
                        </div>
                        {selectedLine ? `Shortages: ${selectedLine}` : "Shortage Dashboard"}
                    </h1>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-12">
                        {selectedLine ? `Monitoring critical part shortages for ${selectedLine}` : "Oversight & operational verification of DEO submissions"}
                    </p>
                </div>
                <div className="flex items-center bg-gray-50/50 rounded-2xl border border-slate-100 p-1.5 shadow-inner">
                    <div className="px-6 py-1.5 text-center border-r border-slate-200 min-w-[100px]">
                        <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">TOTAL</span>
                        <span className="block text-xl font-black text-slate-900 leading-none">{entries.length}</span>
                    </div>
                    <div className="px-6 py-1.5 text-center border-r border-slate-200 text-orange-500 min-w-[100px]">
                        <span className="block text-[9px] font-black uppercase tracking-wider mb-1 opacity-60">PENDING</span>
                        <span className="block text-xl font-black leading-none">{pendingCount}</span>
                    </div>
                    <div className="px-6 py-1.5 text-center text-emerald-500 min-w-[100px]">
                        <span className="block text-[9px] font-black uppercase tracking-wider mb-1 opacity-60">VERIFIED</span>
                        <span className="block text-xl font-black leading-none">{verifiedCount}</span>
                    </div>
                </div>
            </div>

            {/* Controls Row */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-1 mb-3">
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {selectedLine && (
                        <button
                            onClick={() => setSelectedLine(null)}
                            className="h-[42px] px-6 bg-white border border-slate-200 rounded-full flex items-center gap-2 text-[11px] font-black text-slate-600 hover:bg-slate-50 transition-all shadow-sm uppercase tracking-widest group"
                        >
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> BACK
                        </button>
                    )}

                    {/* Status Filter */}
                    <div className="relative group w-full md:w-48">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1 bg-orange-50 rounded text-orange-500 group-focus-within:text-orange-600 pointer-events-none">
                            <LayoutGrid size={11} />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full bg-white border border-slate-200 focus:border-orange-500 rounded-full h-[42px] pl-12 pr-10 text-slate-700 font-bold text-[11px] tracking-wide outline-none transition-all shadow-sm cursor-pointer appearance-none uppercase"
                        >
                            <option value="All Status">All Status</option>
                            <option value="Pending">Pending</option>
                            <option value="Verified">Verified</option>
                            <option value="Rejected">Rejected</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <ChevronDown size={14} />
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative group w-full md:w-72">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={14} />
                        <input
                            type="text"
                            placeholder="SEARCH SHORTAGES..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-slate-200 focus:border-orange-500 rounded-full h-[42px] pl-14 pr-6 text-slate-700 font-bold text-[11px] tracking-wide placeholder:text-slate-300 outline-none transition-all shadow-sm uppercase"
                        />
                    </div>
                </div>

                {/* Date Filter */}
                <div className="relative group flex-shrink-0">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1 bg-indigo-50/50 rounded text-indigo-400 group-focus-within:text-orange-500 pointer-events-none">
                        <Calendar size={12} />
                    </div>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-white border border-slate-200 focus:border-orange-500 rounded-full h-[42px] pl-12 pr-5 text-slate-700 font-bold text-[11px] tracking-wide outline-none transition-all shadow-sm w-[200px] uppercase cursor-pointer"
                    />
                </div>
            </div>

            {/* Data Table */}
            <div className="flex-1 overflow-hidden bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col mx-1">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    {!selectedLine ? (
                        /* Dashboard Summary Table (Image 1 Style) */
                        <table className="min-w-full bg-white text-sm">
                            <thead className="bg-white text-slate-900 border-b-2 border-orange-500 uppercase text-[12px] font-black tracking-widest sticky top-0 z-[50]">
                                <tr>
                                    <th className="px-8 py-5 text-left whitespace-nowrap">SR.NO</th>
                                    <th className="px-8 py-5 text-left whitespace-nowrap">LINE NAME</th>
                                    <th className="px-8 py-5 text-center whitespace-nowrap">TOTAL MACHINES</th>
                                    <th className="px-8 py-5 text-center whitespace-nowrap">ACTIVE SHORTAGES</th>
                                    <th className="px-8 py-5 text-center whitespace-nowrap">STATUS</th>
                                    <th className="px-8 py-5 text-right whitespace-nowrap">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {lineSummaries.map((line, idx) => (
                                    <tr key={line.lineName} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <span className="text-[12px] font-black text-slate-900">{idx + 1}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100 shadow-sm">
                                                    <Factory size={22} />
                                                </div>
                                                <h4 className="font-black text-slate-900 uppercase tracking-tight text-[16px]">
                                                    {line.lineName}
                                                </h4>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className="px-4 py-1.5 text-[10px] font-black bg-blue-50 text-blue-600 rounded-full border border-blue-100 uppercase tracking-widest">
                                                {line.totalMachines.size} Machines
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className="text-[12px] font-black text-orange-600 uppercase tracking-[0.1em]">
                                                {line.totalShortages} TOTAL
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            {line.pendingCount === 0 ? (
                                                <span className="px-4 py-1.5 text-[10px] font-black bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 uppercase tracking-widest">
                                                    ALL FILLED
                                                </span>
                                            ) : (
                                                <span className="px-4 py-1.5 text-[10px] font-black bg-orange-50 text-orange-600 rounded-full border border-orange-100 uppercase tracking-widest">
                                                    {line.pendingCount} PENDING
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button
                                                onClick={() => setSelectedLine(line.lineName)}
                                                className="px-6 py-2.5 bg-white border border-slate-200 rounded-full text-[11px] font-black text-slate-600 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm flex items-center justify-center gap-2 ml-auto uppercase tracking-widest group"
                                            >
                                                <Eye size={14} className="text-orange-500 group-hover:scale-110 transition-transform" /> VIEW
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        /* Drill-down Detailed Table (Image 2 Style) */
                        <table className="min-w-full bg-white text-sm">
                            <thead className="bg-white text-slate-900 border-b-2 border-orange-500 uppercase text-[12px] font-black tracking-widest sticky top-0 z-[50]">
                                <tr>
                                    <th className="px-8 py-5 text-left whitespace-nowrap">SR.NO</th>
                                    <th className="px-8 py-5 text-left whitespace-nowrap">SUB MACHINE</th>
                                    <th className="px-8 py-5 text-left whitespace-nowrap">PART NUMBER</th>
                                    <th className="px-8 py-5 text-center whitespace-nowrap">DEMAND DATE</th>
                                    <th className="px-8 py-5 text-center whitespace-nowrap">COVERAGE DAY</th>
                                    <th className="px-8 py-5 text-center whitespace-nowrap">SAP STOCK</th>
                                    <th className="px-8 py-5 text-center whitespace-nowrap">OPENING</th>
                                    <th className="px-8 py-5 text-center whitespace-nowrap">TODAY'S</th>
                                    <th className="px-8 py-5 text-right whitespace-nowrap">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredEntries.map((entry, idx) => {
                                    const req = entry.shortage_request;
                                    const item = req?.inventory_item;
                                    const needTotal = (req?.shortage_quantity && req.shortage_quantity > 0) ? req.shortage_quantity : (item?.demand_quantity || 0);
                                    const perDay = (req?.per_day && req.per_day > 0) ? req.per_day : needTotal;
                                    const coverage = (perDay > 0 ? (entry.todays_stock / perDay).toFixed(1) : "—");
                                    const machineName = (entry as any).sub_machine_name || (req as any).sub_machine_name || `${selectedLine}A`; // Fallback like Image 2

                                    return (
                                        <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-6">
                                                <span className="text-[12px] font-black text-slate-900">{idx + 1}</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 shadow-sm">
                                                    <Zap size={13} fill="currentColor" />
                                                    <span className="text-[11px] font-black uppercase tracking-tight">{machineName}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-[12px] font-black text-slate-900 uppercase tracking-tight block max-w-[220px] truncate">
                                                    {item?.sap_part_number}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className="text-[12px] font-black text-slate-900 tabular-nums">
                                                    {entry.created_at ? new Date(entry.created_at).toLocaleDateString() : '—'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className={cn(
                                                    "text-[11px] font-black tabular-nums px-3 py-1 rounded-lg border",
                                                    coverage === "—" ? "text-slate-300 border-transparent" :
                                                    Number(coverage) >= 5 ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-rose-600 bg-rose-50 border-rose-100"
                                                )}>
                                                    {coverage === "—" ? "—" : coverage}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className="text-[13px] font-black text-slate-900 tabular-nums">{entry.sap_stock ?? '—'}</span>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className="text-[13px] font-black text-slate-900 tabular-nums">{entry.opening_stock ?? '—'}</span>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className="text-[13px] font-black text-orange-600 tabular-nums">{entry.todays_stock ?? '—'}</span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => { setDetailModalEntry(entry); setDetailModalType('view'); }}
                                                        className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-orange-500 hover:border-orange-200 shadow-sm transition-all"
                                                        title="View Details"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => { setDetailModalEntry(entry); setDetailModalType('assignment'); }}
                                                        className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-blue-500 hover:text-blue-700 hover:border-blue-300 shadow-sm transition-all"
                                                        title="Assignment Info"
                                                    >
                                                        <Info size={18} />
                                                    </button>
                                                    {entry.status === 'PENDING_SUPERVISOR' && (
                                                        <button
                                                            disabled={verifying === entry.id}
                                                            onClick={() => { setDetailModalEntry(entry); setDetailModalType('verify'); }}
                                                            className="w-10 h-10 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center disabled:opacity-50"
                                                            title="Verify Shortage"
                                                        >
                                                            {verifying === entry.id ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                    {((!selectedLine && lineSummaries.length === 0) || (selectedLine && filteredEntries.length === 0)) && (
                        <div className="py-24 text-center bg-white">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Car size={40} className="text-slate-200" />
                            </div>
                            <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest">No shortage records found in this view.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* --- Reject Reason Modal (same as before) --- */}
            {rejectModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setRejectModal(null)} />
                    <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-ind-border/50 animate-in zoom-in-95 fade-in duration-200">
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-rose-500/5 to-transparent pointer-events-none" />
                        <div className="p-8 relative space-y-6">
                            <div className="flex items-center gap-5"><div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 border border-rose-100 shadow-inner shrink-0"><AlertTriangle size={28} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Shortage Request</p><h3 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">Rejection Reason</h3></div></div>
                            <div><label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Enter reason for rejection</label><textarea ref={rejectInputRef} autoFocus rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Describe the reason..." className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all resize-none" /></div>
                            <div className="grid grid-cols-2 gap-3 pt-2"><button onClick={() => setRejectModal(null)} className="py-3.5 bg-gray-50 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 hover:text-gray-700 transition-all border border-gray-200">Cancel</button><button onClick={submitReject} disabled={!rejectReason.trim()} className="py-3.5 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"><Trash2 size={13} /> Reject</button></div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Confirm Action Modal (same as before) --- */}
            {confirmModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setConfirmModal(null)} />
                    <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-ind-border/50 animate-in zoom-in-95 fade-in duration-200">
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-orange-500/5 to-transparent pointer-events-none" />
                        <div className="p-8 text-center space-y-6 relative">
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto border shadow-inner ${confirmModal.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 'bg-rose-50 text-rose-500 border-rose-100'}`}>
                                {confirmModal.status === 'VERIFIED' ? <CheckCircle2 size={36} /> : <AlertTriangle size={36} />}
                            </div>
                            <div className="space-y-2"><h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{confirmModal.status === 'VERIFIED' ? 'Confirm Verification' : 'Confirm Rejection'}</h3><p className="text-gray-500 text-sm font-bold leading-relaxed px-4">{confirmModal.status === 'VERIFIED' ? 'Are you sure you want to verify this shortage entry?' : <>Are you sure you want to reject this entry?{confirmModal.reason && <><br /><span className="text-rose-500">Reason: {confirmModal.reason}</span></>}</>}</p></div>
                            <div className="grid grid-cols-2 gap-4 pt-2"><button onClick={() => setConfirmModal(null)} className="py-4 bg-gray-50 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-200">Cancel</button><button onClick={confirmAction} className={`py-4 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 ${confirmModal.status === 'VERIFIED' ? 'bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700' : 'bg-rose-600 shadow-rose-200 hover:bg-rose-700'}`}>{confirmModal.status === 'VERIFIED' ? <><CheckCircle2 size={14} /> Yes, Verify</> : <><Trash2 size={14} /> Yes, Reject</>}</button></div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Alert Modal (same as before) --- */}
            {alertModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setAlertModal(null)} />
                    <div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-ind-border/50 animate-in zoom-in-95 fade-in duration-200">
                        <div className="p-8 text-center space-y-5 relative"><div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 border border-orange-100 shadow-inner mx-auto"><AlertCircle size={30} /></div><p className="text-sm font-bold text-slate-700 leading-relaxed">{alertModal}</p><button onClick={() => setAlertModal(null)} className="w-full py-4 bg-[#F37021] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all hover:-translate-y-0.5 active:scale-95">OK</button></div>
                    </div>
                </div>
            )}

            {/* Render the two modals */}
            {detailModalEntry && detailModalType === 'assignment' && (
                <AssignmentDetailsModal entry={detailModalEntry} onClose={() => { setDetailModalEntry(null); setDetailModalType(null); }} />
            )}
            {detailModalEntry && (detailModalType === 'view' || detailModalType === 'verify') && (
                <SubmittedDataModal
                    entry={detailModalEntry}
                    onClose={() => { setDetailModalEntry(null); setDetailModalType(null); }}
                    onVerify={() => { setConfirmModal({ entryId: detailModalEntry.id, status: 'VERIFIED', reason: '' }); setDetailModalEntry(null); setDetailModalType(null); }}
                    onReject={() => { setRejectReason(''); setRejectModal({ entryId: detailModalEntry.id }); setDetailModalEntry(null); setDetailModalType(null); }}
                    isVerifyMode={detailModalType === 'verify'}
                />
            )}
        </div>
    );
}