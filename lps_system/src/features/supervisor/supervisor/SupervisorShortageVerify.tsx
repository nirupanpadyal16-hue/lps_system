import { useState, useEffect, useMemo, useRef } from 'react';
import { getToken } from '../../../lib/storage';
import { API_BASE as API } from '../../../lib/apiConfig';
import {
    Search, Calendar, ChevronDown, CheckCircle2,
    Eye, AlertCircle, Loader2, Car, Trash2, ListFilter, X, Info, AlertTriangle
} from 'lucide-react';
import { SupervisorCalendar } from './components/SupervisorCalendar';

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
    };
}

export default function SupervisorShortageVerify() {
    /* vidyasagar: You can change the shortage verification logic or UI layout here */
    const [entries, setEntries] = useState<ShortageEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Status');
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState('');
    const [showCal, setShowCal] = useState(false);
    const [detailRow, setDetailRow] = useState<ShortageEntry | null>(null);
    const [infoModalData, setInfoModalData] = useState<ShortageEntry | null>(null);

    // ── Custom modal state (replaces browser prompt/confirm/alert) ──
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
        const interval = setInterval(() => fetchEntries(), 30000); // 30s Polling
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
                setDetailRow(null);
            } else {
                setAlertModal(data.message || 'Operation failed.');
            }
        } catch (e: any) {
            setAlertModal('Error: ' + e.message);
        } finally {
            setVerifying(null);
        }
    };

    // Open confirm modal for VERIFY action
    const requestVerify = (id: number) => {
        setConfirmModal({ entryId: id, status: 'VERIFIED', reason: '' });
    };

    // Open reject reason modal
    const requestReject = (id: number) => {
        setRejectReason('');
        setRejectModal({ entryId: id });
        // Auto-focus handled via useEffect below
    };

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
            {/* Header Block */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-1 bg-white border-b border-slate-100 py-1 px-2 mb-2">
                <h1 className="text-[24px] font-black text-ind-text tracking-tight leading-none">
                    Verify Shortage Requests
                </h1>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-4 px-4 py-2 bg-white rounded-xl border border-ind-border/50">
                        <div className="text-center">
                            <p className="block text-[8px] font-bold text-ind-text3 uppercase tracking-wider">Total</p>
                            <p className="block text-base font-bold text-slate-800 leading-none">{entries.length}</p>
                        </div>
                        <div className="w-px h-6 bg-ind-border/50"></div>
                        <div className="text-center">
                            <p className="text-[8px] font-bold text-ind-primary uppercase tracking-wider">Pending</p>
                            <p className="block text-base font-bold text-slate-800 leading-none">{pendingCount}</p>
                        </div>
                        <div className="w-px h-6 bg-ind-border/50"></div>
                        <div className="text-center">
                            <p className="text-[8px] font-bold text-emerald-500 uppercase tracking-wider">Verified</p>
                            <p className="block text-base font-bold text-slate-800 leading-none">{verifiedCount}</p>
                        </div>
                        <div className="w-px h-6 bg-ind-border/50"></div>
                        <div className="text-center">
                            <p className="text-[8px] font-bold text-red-500 uppercase tracking-wider">Rejected</p>
                            <p className="block text-base font-bold text-slate-800 leading-none">{rejectedCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col lg:flex-row items-center justify-end gap-1 mb-2 mx-1">
                <div className="relative z-20">
                    <button
                        onClick={() => setIsStatusOpen(!isStatusOpen)}
                        className="flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-bold text-gray-700 min-w-[150px] justify-between shadow-sm hover:border-gray-300 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-orange-50 text-orange-500 rounded flex items-center justify-center">
                                <ListFilter size={12} />
                            </div>
                            {statusFilter}
                        </div>
                        <ChevronDown size={14} className="text-gray-400" />
                    </button>

                    {isStatusOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsStatusOpen(false)}></div>
                            <div className="absolute top-full left-0 mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl z-30 py-1 overflow-hidden">
                                {['All Status', 'Pending', 'Verified', 'Rejected'].map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => { setStatusFilter(opt); setIsStatusOpen(false); }}
                                        className="w-full text-left px-4 py-2 text-sm font-bold text-gray-600 hover:bg-orange-50 hover:text-orange-700 transition-colors"
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div className="relative w-full lg:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search demands..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm placeholder:text-gray-400 placeholder:font-medium"
                    />
                </div>

                <div className="relative hidden sm:block">
                    <div
                        onClick={() => setShowCal(v => !v)}
                        className="flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-bold text-gray-700 shadow-sm hover:border-gray-300 transition-colors cursor-pointer group"
                    >
                        <Calendar size={14} className="text-gray-400 group-hover:text-orange-500 transition-colors" />
                        <span className="pointer-events-none">
                            {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', {
                                month: '2-digit', day: '2-digit', year: 'numeric'
                            }) : 'All Dates'}
                        </span>
                        {selectedDate && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDate('');
                                }}
                                className="ml-1 text-gray-400 hover:text-red-500 transition-colors z-20"
                            >
                                <X size={14} />
                            </button>
                        )}
                        {!selectedDate && <ChevronDown size={14} className="text-gray-400" />}
                    </div>

                    {showCal && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowCal(false)} />
                            <SupervisorCalendar
                                value={selectedDate}
                                onChange={(d: string) => { setSelectedDate(d); setShowCal(false); }}
                                onClose={() => setShowCal(false)}
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Data Table Wrapper */}
            <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm mx-1">
                {/* Table Header */}
                <div className="grid grid-cols-[2.5fr_1.5fr_1.5fr_120px] gap-4 px-6 py-3 bg-white border-b-2 border-[#f37021] sticky top-0 z-10 items-center">
                    <p className="text-xs font-bold uppercase text-black tracking-wider">Request</p>
                    <p className="text-xs font-bold uppercase text-black tracking-wider text-center">Status</p>
                    <p className="text-xs font-bold uppercase text-black tracking-wider text-center">Target</p>
                    <p className="text-xs font-bold uppercase text-black tracking-wider text-right pr-4">Actions</p>
                </div>

                {/* Rows */}
                <div className="divide-y divide-gray-100 bg-white max-h-[55vh] overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-orange-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent pr-1">
                    {filteredEntries.map(entry => (
                        <div key={entry.id}>
                            <div className="grid grid-cols-[2.5fr_1.5fr_1.5fr_120px] gap-4 px-6 py-4 items-center hover:bg-orange-50/30 transition-colors group">
                                {/* Request Col */}
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0 border border-orange-200">
                                        <Car size={18} className="text-orange-600" />
                                    </div>
                                    <div>
                                        <h4 className="text-[13px] font-black text-gray-900 uppercase tracking-tight group-hover:text-orange-600 transition-colors">
                                            {entry.shortage_request?.inventory_item.vehicle_name || 'UNKNOWN MODEL'}
                                        </h4>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase mt-1 tracking-wider">
                                            {entry.shortage_request?.formatted_id} • <span className="text-gray-400">{entry.shortage_request?.inventory_item.sap_part_number}</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Status Col */}
                                <div className="flex flex-col items-center">
                                    {entry.status === 'PENDING_SUPERVISOR' ? (
                                        <span className="px-3 py-1.5 text-[9px] font-black rounded-full bg-orange-50 text-orange-600 uppercase tracking-widest border border-orange-200">Pending</span>
                                    ) : entry.status === 'VERIFIED' ? (
                                        <span className="px-3 py-1.5 text-[9px] font-black rounded-full bg-emerald-50 text-emerald-600 uppercase tracking-widest border border-emerald-200">Completed</span>
                                    ) : (
                                        <span className="px-3 py-1.5 text-[9px] font-black rounded-full bg-red-50 text-red-600 uppercase tracking-widest border border-red-200">Rejected</span>
                                    )}
                                    <p className="text-[9px] font-bold text-gray-400 mt-2 uppercase tracking-wide">
                                        DEO: <span className="text-gray-800">{entry.deo_name}</span>
                                    </p>
                                </div>

                                {/* Stock / Target Col */}
                                <div className="text-center">
                                    <p className="text-[14px] font-black text-gray-900">{entry.todays_stock.toLocaleString()} Units</p>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase mt-1 tracking-wide">Pending SAP Stock: {entry.sap_stock}</p>
                                </div>

                                {/* Actions Col */}
                                <div className="flex items-center justify-end gap-0.5 pr-4">
                                    <button
                                        onClick={() => setDetailRow(detailRow?.id === entry.id ? null : entry)}
                                        className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all border border-transparent hover:border-orange-200"
                                        title="View Details"
                                    >
                                        <Eye size={16} strokeWidth={2} />
                                    </button>

                                    {entry.status === 'PENDING_SUPERVISOR' ? (
                                        <>
                                            <button
                                                onClick={() => setInfoModalData(entry)}
                                                className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 focus:bg-blue-50 rounded-lg transition-all border border-transparent hover:border-blue-200 shadow-sm flex items-center justify-center min-w-[30px] min-h-[30px]"
                                                title="More Info"
                                            >
                                                <Info size={16} strokeWidth={2.5} />
                                            </button>
                                            <button
                                                disabled={verifying === entry.id}
                                                onClick={() => requestVerify(entry.id)}
                                                className="p-1.5 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all border border-emerald-200 shadow-sm disabled:opacity-50 flex items-center justify-center min-w-[30px] min-h-[30px]"
                                                title="Verify / Approve"
                                            >
                                                {verifying === entry.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} strokeWidth={2.5} />}
                                            </button>
                                            <button
                                                disabled={verifying === entry.id}
                                                onClick={() => requestReject(entry.id)}
                                                className="p-1.5 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-all border border-red-200 shadow-sm disabled:opacity-50 flex items-center justify-center min-w-[30px] min-h-[30px]"
                                                title="Reject"
                                            >
                                                <Trash2 size={16} strokeWidth={2.5} />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => setInfoModalData(entry)}
                                                className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 focus:bg-blue-50 rounded-lg transition-all border border-transparent hover:border-blue-200 shadow-sm flex items-center justify-center min-w-[30px] min-h-[30px]"
                                                title="More Info"
                                            >
                                                <Info size={16} strokeWidth={2.5} />
                                            </button>
                                            <button
                                                disabled={verifying === entry.id}
                                                onClick={() => requestVerify(entry.id)}
                                                className="p-1.5 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all border border-emerald-200 shadow-sm disabled:opacity-50 flex items-center justify-center min-w-[30px] min-h-[30px]"
                                                title="Re-Verify"
                                            >
                                                {verifying === entry.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} strokeWidth={2.5} />}
                                            </button>
                                            <button
                                                disabled={verifying === entry.id}
                                                onClick={() => requestReject(entry.id)}
                                                className="p-1.5 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-all border border-red-200 shadow-sm disabled:opacity-50 flex items-center justify-center min-w-[30px] min-h-[30px]"
                                                title="Re-Reject"
                                            >
                                                <Trash2 size={16} strokeWidth={2.5} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Inline Detail View */}
                            {detailRow?.id === entry.id && (
                                <div className="bg-orange-50/50 p-6 border-t border border-orange-100 animate-in slide-in-from-top-2 relative">
                                    <button
                                        onClick={() => setDetailRow(null)}
                                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-800"
                                    >
                                        <X size={16} />
                                    </button>
                                    <div className="grid grid-cols-4 gap-6 max-w-4xl mx-auto">
                                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Per Day Demand</p>
                                            <p className="text-xl font-black text-gray-800">{entry.shortage_request?.per_day}</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Current Stock</p>
                                            <p className="text-xl font-black text-gray-800">{entry.opening_stock}</p>
                                        </div>
                                        <div className="bg-orange-100 p-4 rounded-xl border border-orange-200 shadow-sm text-center">
                                            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Todays Prod.</p>
                                            <p className="text-xl font-black text-orange-700">{entry.todays_stock}</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">New Stock Level</p>
                                            <p className="text-xl font-black text-emerald-600">{(entry.todays_stock + entry.opening_stock).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    {entry.notes && (
                                        <div className="mt-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm max-w-4xl mx-auto flex items-start gap-3">
                                            <AlertCircle size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">DEO Notes</p>
                                                <p className="text-sm font-bold text-gray-700">{entry.notes}</p>
                                            </div>
                                        </div>
                                    )}
                                    {entry.status === 'REJECTED' && entry.rejection_reason && (
                                        <div className="mt-4 bg-red-50 p-4 rounded-lg border border-red-200 shadow-sm max-w-4xl mx-auto flex items-start gap-3">
                                            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Rejection Reason</p>
                                                <p className="text-sm font-bold text-red-700">{entry.rejection_reason}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    {filteredEntries.length === 0 && (
                        <div className="py-20 text-center">
                            <Car size={32} className="text-gray-200 mx-auto mb-4" />
                            <p className="text-lg font-black text-gray-400">No shortage requests found.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Info Popup Modal */}
            {infoModalData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md overflow-hidden animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h3 className="font-black text-gray-900">Request Information</h3>
                            <button onClick={() => setInfoModalData(null)} className="text-gray-400 hover:text-gray-800 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="px-6 py-6 space-y-5 text-sm font-medium text-gray-600">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Full Model / Vehicle Name</p>
                                <p className="text-gray-900 font-black text-base">{infoModalData.shortage_request?.inventory_item.vehicle_name || 'UNKNOWN'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Part Description</p>
                                <p className="text-gray-800">{infoModalData.shortage_request?.inventory_item.part_description}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Assigned DEO</p>
                                    <p className="text-gray-800">{infoModalData.deo_name}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Recorded At</p>
                                    <p className="text-gray-800">{new Date(infoModalData.created_at).toLocaleString()}</p>
                                </div>
                            </div>
                            {infoModalData.notes && (
                                <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 mt-2">
                                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">DEO Notes</p>
                                    <p className="text-orange-900">{infoModalData.notes}</p>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <button onClick={() => setInfoModalData(null)} className="px-6 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── REJECTION REASON MODAL ─────────────────────────────── */}
            {rejectModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        onClick={() => setRejectModal(null)}
                    />
                    <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-ind-border/50 animate-in zoom-in-95 fade-in duration-200">
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-rose-500/5 to-transparent pointer-events-none" />
                        <div className="p-8 relative space-y-6">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 border border-rose-100 shadow-inner shrink-0">
                                    <AlertTriangle size={28} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Shortage Request</p>
                                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">Rejection Reason</h3>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Enter reason for rejection</label>
                                <textarea
                                    ref={rejectInputRef}
                                    autoFocus
                                    rows={3}
                                    value={rejectReason}
                                    onChange={e => setRejectReason(e.target.value)}
                                    placeholder="Describe the reason..."
                                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all resize-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <button
                                    onClick={() => setRejectModal(null)}
                                    className="py-3.5 bg-gray-50 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 hover:text-gray-700 transition-all border border-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={submitReject}
                                    disabled={!rejectReason.trim()}
                                    className="py-3.5 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={13} /> Reject
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── CONFIRM ACTION MODAL ───────────────────────────────── */}
            {confirmModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        onClick={() => setConfirmModal(null)}
                    />
                    <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-ind-border/50 animate-in zoom-in-95 fade-in duration-200">
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-orange-500/5 to-transparent pointer-events-none" />
                        <div className="p-8 text-center space-y-6 relative">
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto border shadow-inner ${
                                confirmModal.status === 'VERIFIED'
                                    ? 'bg-emerald-50 text-emerald-500 border-emerald-100'
                                    : 'bg-rose-50 text-rose-500 border-rose-100'
                            }`}>
                                {confirmModal.status === 'VERIFIED'
                                    ? <CheckCircle2 size={36} />
                                    : <AlertTriangle size={36} />}
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                                    {confirmModal.status === 'VERIFIED' ? 'Confirm Verification' : 'Confirm Rejection'}
                                </h3>
                                <p className="text-gray-500 text-sm font-bold leading-relaxed px-4">
                                    {confirmModal.status === 'VERIFIED'
                                        ? 'Are you sure you want to verify this shortage entry?'
                                        : <>Are you sure you want to reject this entry?{confirmModal.reason && <><br /><span className="text-rose-500">Reason: {confirmModal.reason}</span></>}</>}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <button
                                    onClick={() => setConfirmModal(null)}
                                    className="py-4 bg-gray-50 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmAction}
                                    className={`py-4 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 ${
                                        confirmModal.status === 'VERIFIED'
                                            ? 'bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700'
                                            : 'bg-rose-600 shadow-rose-200 hover:bg-rose-700'
                                    }`}
                                >
                                    {confirmModal.status === 'VERIFIED'
                                        ? <><CheckCircle2 size={14} /> Yes, Verify</>
                                        : <><Trash2 size={14} /> Yes, Reject</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── ALERT MODAL ────────────────────────────────────────── */}
            {alertModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        onClick={() => setAlertModal(null)}
                    />
                    <div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-ind-border/50 animate-in zoom-in-95 fade-in duration-200">
                        <div className="p-8 text-center space-y-5 relative">
                            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 border border-orange-100 shadow-inner mx-auto">
                                <AlertCircle size={30} />
                            </div>
                            <p className="text-sm font-bold text-slate-700 leading-relaxed">{alertModal}</p>
                            <button
                                onClick={() => setAlertModal(null)}
                                className="w-full py-4 bg-[#F37021] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all hover:-translate-y-0.5 active:scale-95"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

