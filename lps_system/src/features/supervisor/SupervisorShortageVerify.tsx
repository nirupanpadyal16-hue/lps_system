import { useState, useEffect } from 'react';
import { getToken } from '../../lib/storage';
import { API_BASE as API } from '../../lib/apiConfig';
import { Loader2, CheckCircle2 } from 'lucide-react';

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
    const [entries, setEntries] = useState<ShortageEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState<number | null>(null);

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

    useEffect(() => { fetchEntries(); }, []);

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
            } else {
                alert(data.message);
            }
        } catch (e: any) {
            alert('Error: ' + e.message);
        } finally {
            setVerifying(null);
        }
    };

    const pending = entries.filter(e => e.status === 'PENDING_SUPERVISOR');
    const processed = entries.filter(e => e.status !== 'PENDING_SUPERVISOR');

    if (loading) {
        return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-orange-500" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="border-b border-gray-100 pb-4">
                <h1 className="text-xl font-black text-gray-900">Verify Shortage Stock Entries</h1>
                <p className="text-sm text-gray-500 mt-1">Review DEO daily stock updates for assigned shortage parts.</p>
            </div>

            {pending.length === 0 ? (
                <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-8 text-center">
                    <CheckCircle2 size={32} className="text-gray-300 mx-auto mb-2" />
                    <p className="font-bold text-gray-500">All caught up!</p>
                    <p className="text-sm text-gray-400">No pending shortage entries to verify.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Pending Verification ({pending.length})</h3>
                    {pending.map(entry => (
                        <div key={entry.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className="inline-block px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded mb-2">Needs Verification</span>
                                    <h4 className="font-bold text-gray-900">
                                        {entry.shortage_request?.inventory_item.sap_part_number} — {entry.shortage_request?.inventory_item.part_description}
                                    </h4>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Request: <span className="font-bold text-gray-700">{entry.shortage_request?.formatted_id}</span> •
                                        Vehicle: <span className="font-bold text-gray-700">{entry.shortage_request?.inventory_item.vehicle_name}</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-400">Submitted by</p>
                                    <p className="font-bold text-gray-700">{entry.deo_name}</p>
                                    <p className="text-xs text-gray-400 mt-1">{new Date(entry.created_at).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 flex items-center justify-between gap-4 mb-4">
                                <div className="text-center flex-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Target Per Day</p>
                                    <p className="text-lg font-black text-gray-800">{entry.shortage_request?.per_day}</p>
                                </div>
                                <div className="text-center flex-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">SAP Stock</p>
                                    <p className="text-lg font-black text-gray-600">{entry.sap_stock}</p>
                                </div>
                                <div className="text-center flex-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Opening Stock</p>
                                    <p className="text-lg font-black text-gray-600">{entry.opening_stock}</p>
                                </div>
                                <div className="text-center flex-1 bg-blue-50 border border-blue-100 rounded-lg p-2">
                                    <p className="text-[10px] font-bold text-blue-500 uppercase">Today's Stock (Produced)</p>
                                    <p className="text-xl font-black text-blue-700">{entry.todays_stock}</p>
                                </div>
                            </div>
                            
                            {entry.notes && (
                                <div className="mb-4 text-sm text-gray-600 bg-gray-50 p-3 rounded border border-gray-100">
                                    <span className="font-semibold text-gray-500 mr-2">Notes:</span> {entry.notes}
                                </div>
                            )}

                            <div className="flex gap-3 justify-end pt-2 border-t border-gray-50">
                                <button
                                    disabled={verifying === entry.id}
                                    onClick={() => {
                                        const reason = prompt("Enter reason for rejection:");
                                        if (reason !== null) handleVerify(entry.id, 'REJECTED', reason);
                                    }}
                                    className="px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                                >
                                    Reject
                                </button>
                                <button
                                    disabled={verifying === entry.id}
                                    onClick={() => handleVerify(entry.id, 'VERIFIED')}
                                    className="px-6 py-2 text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                                >
                                    {verifying === entry.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                    Approve & Add to Stock
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {processed.length > 0 && (
                <div className="pt-6">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Recent History</h3>
                    <div className="space-y-3">
                        {processed.slice(0, 10).map(entry => (
                            <div key={entry.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4 opacity-75">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${entry.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                            {entry.status}
                                        </span>
                                        <span className="text-xs text-gray-400">{new Date(entry.verified_at || '').toLocaleString()}</span>
                                    </div>
                                    <p className="text-sm font-bold text-gray-800">
                                        {entry.shortage_request?.inventory_item.sap_part_number} — {entry.todays_stock} units added
                                    </p>
                                </div>
                                {entry.status === 'REJECTED' && (
                                    <p className="text-xs text-red-500 max-w-xs text-right line-clamp-2">{entry.rejection_reason}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
