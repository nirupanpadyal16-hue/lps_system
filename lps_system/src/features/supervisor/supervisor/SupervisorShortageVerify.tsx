import { useState, useEffect, useMemo } from 'react';
import { getToken } from '../../../lib/storage';
import { API_BASE as API } from '../../../lib/apiConfig';
import {
    Search, Calendar, ChevronDown, CheckCircle2,
    Eye, AlertCircle, Loader2, Car, Trash2, ListFilter, X, Info, Edit2, Zap
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
        if (!confirm(`Are you sure you want to mark this entry as ${status}?`)) return;
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
                alert(data.message);
            }
        } catch (e: any) {
            alert('Error: ' + e.message);
        } finally {
            setVerifying(null);
        }
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
            <div className="flex flex-col lg:flex-row justify-between lg:items-center mb-8 gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
                        <div className="w-1 h-8 bg-orange-500 rounded-full" />
                        Verify Shortage Requests
                    </h1>
                    <p className="text-[10px] text-gray-400 font-extrabold mt-2 uppercase tracking-[0.2em] ml-4">Advanced ledger for industrial shortage verification</p>
                </div>
                <div className="flex items-center gap-6 bg-gray-50/80 px-6 py-3 border border-gray-100 rounded-2xl shadow-sm">
                    <div className="text-center px-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total</p>
                        <p className="text-2xl font-black text-gray-800 leading-none">{entries.length}</p>
                    </div>
                    <div className="w-px h-8 bg-gray-200"></div>
                    <div className="text-center px-4">
                        <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Pending</p>
                        <p className="text-2xl font-black text-orange-600 leading-none">{pendingCount}</p>
                    </div>
                    <div className="w-px h-8 bg-gray-200"></div>
                    <div className="text-center px-4">
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Verified</p>
                        <p className="text-2xl font-black text-emerald-600 leading-none">{verifiedCount}</p>
                    </div>
                    <div className="w-px h-8 bg-gray-200"></div>
                    <div className="text-center px-4">
                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Rejected</p>
                        <p className="text-2xl font-black text-red-600 leading-none">{rejectedCount}</p>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col lg:flex-row items-center gap-4 mb-6">
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

                <div className="relative flex-1 max-w-sm w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search demands..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-full text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm placeholder:text-gray-400 placeholder:font-medium"
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
            <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm">
                {/* Table Header */}
                <div className="grid grid-cols-[2.5fr_1.5fr_1.5fr_120px] gap-4 px-6 py-3.5 bg-slate-50 border-b-2 border-slate-200 sticky top-0 z-10 items-center">
                    <p className="text-[10px] font-black uppercase text-black tracking-widest">Request</p>
                    <p className="text-[10px] font-black uppercase text-black tracking-widest text-center">Status</p>
                    <p className="text-[10px] font-black uppercase text-black tracking-widest text-center">Target</p>
                    <p className="text-[10px] font-black uppercase text-black tracking-widest text-right pr-4">Actions</p>
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
                                <div className="flex items-center justify-end gap-3 pr-4">
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
                                                onClick={() => handleVerify(entry.id, 'VERIFIED')}
                                                className="p-1.5 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all border border-emerald-200 shadow-sm disabled:opacity-50 flex items-center justify-center min-w-[30px] min-h-[30px]"
                                                title="Verify / Approve"
                                            >
                                                {verifying === entry.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} strokeWidth={2.5} />}
                                            </button>
                                            <button
                                                disabled={verifying === entry.id}
                                                onClick={() => {
                                                    const reason = prompt("Enter reason for rejection:");
                                                    if (reason !== null) handleVerify(entry.id, 'REJECTED', reason);
                                                }}
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
                                                className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all border border-transparent hover:border-blue-200 flex items-center justify-center min-w-[30px] min-h-[30px]"
                                                title="More Info"
                                            >
                                                <Info size={16} strokeWidth={2.5} />
                                            </button>
                                            <button disabled className="p-1.5 text-emerald-200 bg-emerald-50/50 rounded-lg border border-emerald-100 cursor-not-allowed flex items-center justify-center min-w-[30px] min-h-[30px]">
                                                <CheckCircle2 size={16} strokeWidth={2.5} />
                                            </button>
                                            <button disabled className="p-1.5 text-red-200 bg-red-50/50 rounded-lg border border-red-100 cursor-not-allowed flex items-center justify-center min-w-[30px] min-h-[30px]">
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
        </>
    );
}

