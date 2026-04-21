import { useState, useEffect, useMemo, useRef } from 'react';
import { getToken } from '../../../lib/storage';
import { API_BASE as API } from '../../../lib/apiConfig';
import {
    Search, Calendar, ChevronDown, CheckCircle2,
    Eye, AlertCircle, Loader2, Car, Trash2, ListFilter, X, Info, AlertTriangle, Database, Package, User, MapPin, Clock, Timer, Zap, LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SupervisorCalendar } from './components/SupervisorCalendar';

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
        days_remaining?: number;
        is_overdue?: boolean;
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL 1: Assignment Details (full context – line, personnel, timeline)
// ─────────────────────────────────────────────────────────────────────────────
const AssignmentDetailsModal = ({ entry, onClose }: { entry: ShortageEntry; onClose: () => void }) => {
    const req = entry.shortage_request;
    const item = req?.inventory_item;
    const startDate = entry.created_at.split('T')[0];
    const endDate = req?.deadline || '—';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-300">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl relative border border-slate-100 custom-scrollbar"
            >
                {/* Header */}
                <div className="px-6 py-5 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#F37021] rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200 flex-shrink-0">
                            <Car size={18} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest leading-none">ASSIGNMENT DETAILS</p>
                            <div className="flex items-center gap-3 mt-1.5">
                                <h2 className="text-[14px] font-black text-slate-900 uppercase tracking-tight leading-none">
                                    {item?.vehicle_name || 'PART'}
                                </h2>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{req?.formatted_id}</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{item?.sap_part_number}</span>
                                <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest border border-blue-100">
                                    IN PROGRESS
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        {/* Production Context */}
                        <div className="bg-orange-50/30 border border-orange-100/50 rounded-3xl p-6 space-y-6">
                            <div className="flex items-center gap-2 text-slate-900">
                                <MapPin size={12} className="text-slate-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest">PRODUCTION CONTEXT</span>
                            </div>
                            <div className="space-y-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100">
                                        <LayoutGrid size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest mb-1">PRODUCTION LINE</p>
                                        <p className="text-[14px] font-black text-slate-900 uppercase tracking-tight">{req?.line_name || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100">
                                        <Database size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest mb-1">CUSTOMER / DIVISION</p>
                                        <p className="text-[14px] font-black text-slate-900 uppercase tracking-tight italic font-serif">{req?.customer_name || 'CIE AUTOMOTIVE'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Assigned Personnel */}
                        <div className="bg-orange-50/30 border border-orange-100/50 rounded-3xl p-6 space-y-6">
                            <div className="flex items-center gap-2 text-slate-900">
                                <User size={12} className="text-slate-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest">ASSIGNED PERSONNEL</span>
                            </div>
                            <div className="space-y-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-[#F37021] border border-orange-100">
                                        <User size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[7.5px] font-black text-orange-400 uppercase tracking-widest mb-1">SUPERVISOR</p>
                                        <p className="text-[14px] font-black text-slate-900 uppercase tracking-tight">{req?.supervisor_name || 'RAJ KUMAR'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 border border-blue-100">
                                        <User size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[7.5px] font-black text-blue-400 uppercase tracking-widest mb-1">DATA ENTRY OPERATOR</p>
                                        <p className="text-[14px] font-black text-slate-900 uppercase tracking-tight">{entry.deo_name}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {/* Timeline Details */}
                        <div className="bg-orange-50/30 border border-orange-100/50 rounded-3xl p-6 space-y-6">
                            <div className="flex items-center gap-2 text-slate-900">
                                <Clock size={12} className="text-slate-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest">TIMELINE DETAILS</span>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">START DATE</p>
                                    <p className="text-xs font-black text-slate-900 uppercase tabular-nums">{startDate}</p>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TARGET END</p>
                                    <p className="text-xs font-black text-slate-900 uppercase tabular-nums">{endDate}</p>
                                </div>
                            </div>
                        </div>

                        {/* Submitted Stock Data */}
                        <div className="bg-emerald-50/30 border border-emerald-100/50 rounded-3xl p-6 space-y-4">
                            <div className="flex items-center gap-2 text-emerald-600">
                                <Database size={12} />
                                <span className="text-[10px] font-black uppercase tracking-widest">SUBMITTED STOCK DATA</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-white/60 border border-emerald-100/50 rounded-xl p-3 text-center">
                                    <p className="text-[7px] font-black text-emerald-500 uppercase tracking-widest mb-1">SAP STOCK</p>
                                    <p className="text-[12px] font-black text-slate-900">{entry.sap_stock}</p>
                                </div>
                                <div className="bg-white/60 border border-emerald-100/50 rounded-xl p-3 text-center">
                                    <p className="text-[7px] font-black text-emerald-500 uppercase tracking-widest mb-1">OPENING</p>
                                    <p className="text-[12px] font-black text-slate-900">{entry.opening_stock}</p>
                                </div>
                                <div className="bg-white/60 border border-emerald-100/50 rounded-xl p-3 text-center">
                                    <p className="text-[7px] font-black text-emerald-500 uppercase tracking-widest mb-1">TODAY'S</p>
                                    <p className="text-[12px] font-black text-slate-900">{entry.todays_stock}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-7 pb-6 pt-0 sticky bottom-0 bg-gradient-to-t from-white via-white/80 to-transparent">
                    <button
                        onClick={onClose}
                        className="w-full py-4.5 bg-[#F37021] text-white rounded-full font-black text-[11px] uppercase tracking-[0.25em] shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                    >
                        <Zap size={18} fill="white" />
                        DISMISS DETAILED VIEW
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
                        <button
                            onClick={onClose}
                            className="flex-1 py-3.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs uppercase tracking-[0.2em] transition-all"
                        >
                            CANCEL
                        </button>

                        {isVerifyMode ? (
                            <>
                                <button
                                    onClick={() => { if (onReject) onReject(entry.id); }}
                                    className="px-6 py-3.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-black text-xs uppercase tracking-[0.2em] border border-rose-100 transition-all flex items-center justify-center gap-2"
                                    title="Reject Entry"
                                >
                                    <X size={14} strokeWidth={3} /> REJECT
                                </button>
                                <button
                                    onClick={() => { if (onVerify) onVerify(entry.id); }}
                                    className="flex-1 py-3.5 rounded-full bg-[#f37021] hover:bg-orange-700 text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2"
                                >
                                    <Zap size={14} fill="white" /> VERIFY
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={onClose}
                                className="flex-1 py-3.5 rounded-full bg-[#f37021] hover:bg-orange-700 text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2"
                            >
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

    const pendingCount = entries.filter(e => e.status === 'PENDING_SUPERVISOR').length;
    const verifiedCount = entries.filter(e => e.status === 'VERIFIED').length;
    const rejectedCount = entries.filter(e => e.status === 'REJECTED').length;

    const filteredEntries = useMemo(() => {
        return entries.filter(entry => {
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
            return matchSearch && matchStatus && matchDate;
        });
    }, [entries, searchQuery, statusFilter, selectedDate]);

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-orange-500" /></div>;
    }

    return (
        <>
            {/* Header Block (same as before) */}
            <div className="flex xl:flex-row xl:items-center justify-between gap-4 bg-white border-b border-slate-100 mb-2 py-1">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-2">
                    <div className="space-y-1">
                        <h1 className="text-[24px] font-black text-ind-text tracking-tight leading-none">
                            Verify Shortage Requests
                        </h1>
                    </div>
                </div>
                <div className="flex items-center bg-white backdrop-blur-md rounded-2xl border border-ind-border/50 p-1 shadow-sm overflow-hidden scale-90 origin-right mx-2">
                    <div className="px-4 py-1 text-center border-r border-ind-border/50">
                        <span className="block text-[8px] font-bold text-ind-text3 uppercase tracking-wider">TOTAL</span>
                        <span className="block text-lg font-black text-slate-800 leading-none">{entries.length}</span>
                    </div>
                    <div className="px-4 py-1 text-center border-r border-ind-border/50 text-ind-primary">
                        <span className="block text-[8px] font-bold uppercase tracking-wider opacity-60">PENDING</span>
                        <span className="block text-lg font-black leading-none">{pendingCount}</span>
                    </div>
                    <div className="px-4 py-1 text-center border-r border-ind-border/50 text-emerald-500">
                        <span className="block text-[8px] font-bold uppercase tracking-wider opacity-60">VERIFIED</span>
                        <span className="block text-lg font-black leading-none">{verifiedCount}</span>
                    </div>
                    <div className="px-4 py-1 text-center text-rose-500">
                        <span className="block text-[8px] font-bold uppercase tracking-wider opacity-60">REJECTED</span>
                        <span className="block text-lg font-black leading-none">{rejectedCount}</span>
                    </div>
                </div>
            </div>

            {/* Filter Bar (unchanged) */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-2 px-2 mb-2">
                <div className="h-[38px] bg-white rounded-full px-4 border border-ind-border/40 shadow-sm flex items-center gap-2 min-w-[160px] hover:border-orange-400 transition-all group relative z-20">
                    <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500 flex-shrink-0 group-hover:bg-orange-100 transition-colors">
                        <ListFilter size={14} />
                    </div>
                    <button onClick={() => setIsStatusOpen(!isStatusOpen)} className="flex-1 text-[11px] font-black tracking-wider text-gray-800 focus:outline-none pr-4 text-center">
                        {statusFilter}
                    </button>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    {isStatusOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsStatusOpen(false)}></div>
                            <div className="absolute top-full left-0 mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl z-30 py-1 overflow-hidden">
                                {['All Status', 'Pending', 'Verified', 'Rejected'].map(opt => (
                                    <button key={opt} onClick={() => { setStatusFilter(opt); setIsStatusOpen(false); }}
                                        className="w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-wider text-gray-600 hover:bg-orange-50 hover:text-orange-700 transition-colors">
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
                <div className="h-[38px] bg-white rounded-full px-4 border border-ind-border/40 shadow-sm flex items-center gap-2 flex-1 max-w-md hover:border-ind-primary transition-all group relative">
                    <Search size={14} className="text-gray-400 group-hover:text-ind-primary transition-colors flex-shrink-0" />
                    <input type="text" placeholder="Search demands..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        className="flex-1 bg-transparent text-[10px] font-black uppercase tracking-wider text-gray-800 outline-none placeholder:text-gray-300" />
                </div>
                <div className="relative hidden sm:block">
                    <div onClick={() => setShowCal(v => !v)} className="h-[38px] bg-white rounded-full px-4 border border-ind-border/40 shadow-sm flex items-center justify-between gap-3 min-w-[180px] hover:border-indigo-400 transition-all group relative cursor-pointer">
                        <div className="flex items-center gap-2 flex-1">
                            <Calendar size={14} className="text-gray-400 group-hover:text-indigo-500 transition-colors" />
                            <span className="text-[10px] font-black text-gray-800 tracking-wider uppercase">
                                {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'All Dates'}
                            </span>
                        </div>
                        {selectedDate ? (
                            <X size={14} className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer" onClick={(e) => { e.stopPropagation(); setSelectedDate(''); }} />
                        ) : (
                            <ChevronDown size={14} className="text-gray-400 flex-shrink-0 pointer-events-none" />
                        )}
                    </div>
                    {showCal && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowCal(false)} />
                            <SupervisorCalendar value={selectedDate} onChange={(d: string) => { setSelectedDate(d); setShowCal(false); }} onClose={() => setShowCal(false)} />
                        </>
                    )}
                </div>
            </div>

            {/* Data Table (no inline expand, only action buttons) */}
            <div className="overflow-x-auto rounded-2xl border border-ind-border/50 shadow-sm mx-1">
                <div className="flex-1 custom-scrollbar max-h-[60vh] overflow-y-auto">
                    <table className="min-w-full bg-white text-sm">
                        <thead className="sticky top-0 z-10 bg-ind-bg shadow-sm">
                            <tr className="bg-ind-bg text-black border-b-2 border-[#f37021] uppercase text-[11px] tracking-wider sticky top-0 z-[50]">
                                <th className="px-6 py-2 text-left">REQUEST</th>
                                <th className="px-6 py-2 text-center">STATUS</th>
                                <th className="px-6 py-2 text-center">TARGET</th>
                                <th className="px-6 py-2 text-center">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ind-border/40">
                            {filteredEntries.map(entry => (
                                <tr key={entry.id} className="hover:bg-ind-bg/40 transition-colors group">
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-ind-primary border border-orange-100">
                                                <Car size={18} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 uppercase tracking-tight group-hover:text-ind-primary transition-colors">
                                                    {entry.shortage_request?.inventory_item.vehicle_name || 'UNKNOWN MODEL'}
                                                </h4>
                                                <p className="text-[10px] font-bold text-ind-text3 uppercase mt-1 tracking-wider">
                                                    {entry.shortage_request?.formatted_id} • <span className="opacity-60">{entry.shortage_request?.inventory_item.sap_part_number}</span>
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className={`px-3 py-1 text-[10px] font-bold rounded-full border uppercase tracking-widest ${entry.status === 'PENDING_SUPERVISOR' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                entry.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    'bg-rose-50 text-rose-600 border-rose-100'
                                                }`}>
                                                {entry.status === 'PENDING_SUPERVISOR' ? 'Pending' : entry.status === 'VERIFIED' ? 'Completed' : 'Rejected'}
                                            </span>
                                            <p className="text-[9px] font-bold text-ind-text3 uppercase tracking-wide">
                                                DEO: <span className="text-ind-text">{entry.deo_name}</span>
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        <p className="text-[14px] font-black text-ind-text">
                                            {(entry.shortage_request?.shortage_quantity && entry.shortage_request.shortage_quantity > 0
                                                ? entry.shortage_request.shortage_quantity
                                                : (entry.shortage_request?.inventory_item?.demand_quantity || 0)
                                            ).toLocaleString()} Units
                                        </p>
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="flex items-center justify-center gap-2">
                                            {/* Eye Icon: View Mode */}
                                            <button
                                                onClick={() => { setDetailModalEntry(entry); setDetailModalType('view'); }}
                                                className="w-9 h-9 rounded-lg bg-white border border-ind-border/50 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 shadow-sm transition-all"
                                                title="View Submitted Data"
                                            >
                                                <Eye size={16} />
                                            </button>

                                            {/* Info Icon: Assignment Mode */}
                                            <button
                                                onClick={() => { setDetailModalEntry(entry); setDetailModalType('assignment'); }}
                                                className="w-9 h-9 rounded-lg bg-white border border-ind-border/50 flex items-center justify-center text-blue-500 hover:text-blue-700 hover:border-blue-300 shadow-sm transition-all"
                                                title="Assignment Details"
                                            >
                                                <Info size={16} />
                                            </button>

                                            {/* Check Icon: Verify Mode (Only if pending) */}
                                            {entry.status === 'PENDING_SUPERVISOR' && (
                                                <button
                                                    disabled={verifying === entry.id}
                                                    onClick={() => { setDetailModalEntry(entry); setDetailModalType('verify'); }}
                                                    className="w-9 h-9 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center disabled:opacity-50"
                                                    title="Verify Entry"
                                                >
                                                    {verifying === entry.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredEntries.length === 0 && (
                        <div className="py-20 text-center bg-white">
                            <Car size={32} className="text-ind-border mx-auto mb-4" />
                            <p className="text-sm font-black text-ind-text3 uppercase tracking-widest">No shortage requests found.</p>
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
        </>
    );
}