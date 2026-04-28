import { useState, useEffect } from 'react';
import {
    CheckCircle2, AlertTriangle, X, Database, LayoutGrid, Search, ChevronDown, Info, Car,
    Loader2, Package,  Calendar, Timer, Clock, Zap, User, MapPin, Eye
} from 'lucide-react';
import { API_BASE } from '../../lib/apiConfig';
import { getToken } from '../../lib/storage';
import { motion, AnimatePresence } from 'framer-motion';

const API = API_BASE;

const authHeaders = () => ({
    'Authorization': `Bearer ${getToken()}`,
    'Content-Type': 'application/json'
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
    status: 'PENDING' | 'IN_PROGRESS' | 'DEO_FILLED' | 'COMPLETED' | 'REJECTED' | 'VERIFIED';
    sap_stock: number | null;
    opening_stock: number | null;
    todays_stock: number | null;
    deo_notes: string | null;
    deo_filled_at: string | null;
    total_days: number;
    per_day: number;
    rejection_reason?: string;
    created_at?: string;
    line_name?: string;
    customer_name?: string;
    supervisor_name?: string;
    supervisor_email?: string;
    deo_name?: string;
    deo_email?: string;
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

const ViewFillModal = ({ request, onClose }: { request: ShortageRequest; onClose: () => void }) => {
    const item = request.inventory_item;
    const needTotal = (request.shortage_quantity && request.shortage_quantity > 0) ? request.shortage_quantity : (item?.demand_quantity || 0);
    const perDay = (request.per_day && request.per_day > 0) ? request.per_day : needTotal;
    const tStock = request.todays_stock || 0;
    const coverage = (perDay > 0 ? (tStock / perDay).toFixed(1) : '0.0');
    const isGood = Number(coverage) >= 5;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[98vh] border border-slate-200"
            >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">VIEW SUBMITTED DATA</h2>
                        <p className="text-[10px] text-slate-900 font-black uppercase tracking-widest mt-1">{request.formatted_id} | {item?.sap_part_number}</p>
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
                                    <TimelineBar daysRemaining={request.days_remaining} isOverdue={request.is_overdue} />
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
                                    { label: 'SAP STOCK', value: request.sap_stock },
                                    { label: 'OPENING STOCK', value: request.opening_stock },
                                    { label: "TODAY'S STOCK", value: request.todays_stock },
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
                                    {request.deo_notes || 'No notes provided'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-7 py-5 border-t border-gray-100 flex gap-4">
                        <button onClick={onClose}
                            className="flex-1 py-3.5 rounded-full border border-slate-200 text-xs font-black text-slate-500 hover:bg-slate-50 transition-all uppercase tracking-widest">
                            CANCEL
                        </button>
                        <button onClick={onClose}
                            className="flex-1 py-3.5 rounded-full bg-[#f37021] hover:bg-orange-700 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2">
                            CLOSE VIEW
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const FillModal = ({ request, onClose, onSuccess }: {
    request: ShortageRequest;
    onClose: () => void;
    onSuccess: () => void;
}) => {
    const [form, setForm] = useState({
        sap_stock: request.sap_stock?.toString() || '',
        opening_stock: request.opening_stock?.toString() || '',
        todays_stock: request.todays_stock?.toString() || '',
        notes: (request as any).notes || request.deo_notes || ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

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

            setShowSuccess(true);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 2000);
        } catch (err: any) {
            setError(err.message);
            setSaving(false);
        }
    };

    const item = request.inventory_item;
    const totalDays = request.total_days;
    const needTotal = (request.shortage_quantity && request.shortage_quantity > 0) ? request.shortage_quantity : (item?.demand_quantity || 0);
    const perDay = (request.per_day && request.per_day > 0) ? request.per_day : needTotal;
    const tStock = Number(form.todays_stock) || 0;
    const coverage = (perDay > 0 ? (tStock / perDay).toFixed(1) : '0.0');
    const isGood = Number(coverage) >= 5;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
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
                            className="absolute inset-0 z-[70] bg-slate-900/20 backdrop-blur-sm flex flex-col items-center justify-center p-4"
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
                                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight mb-1">SUBMITTED SUCCESSFULLY</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Sent to supervisor
                                </p>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">FILL STOCK DATA</h2>
                        <p className="text-[10px] text-slate-900 font-black uppercase tracking-widest mt-1">{request.formatted_id} | {item?.sap_part_number}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 bg-white">
                    <div className="p-6 space-y-2 overflow-y-auto custom-scrollbar flex-1">
                        {/* Metrics Section */}
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
                                    <TimelineBar daysRemaining={request.days_remaining} isOverdue={request.is_overdue} />
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">Daily Metrics</p>
                                <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="flex flex-col p-2">
                                        <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest mb-1.5">Timeline</span>
                                        <span className="text-xs font-black text-black uppercase tracking-tight">1 Days</span>
                                    </div>
                                    <div className="flex flex-col p-2 border-x border-slate-200/50">
                                        <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest mb-1.5">Target Per Day</span>
                                        <span className="text-xs font-black text-black uppercase tracking-tight">{perDay} units</span>
                                    </div>
                                    <div className="flex flex-col p-2">
                                        <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest mb-1.5">Est. Coverage</span>
                                        <span className={`text-xs font-black tracking-tight ${isGood ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {coverage} Days
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr className="border-slate-100" />

                        {/* Input Form Fields */}
                        <div className="space-y-6">
                            <div className="grid grid-cols-3 gap-5">
                                {[
                                    { label: 'SAP STOCK', key: 'sap_stock' },
                                    { label: 'OPENING STOCK', key: 'opening_stock' },
                                    { label: "TODAY'S STOCK", key: 'todays_stock' },
                                ].map(({ label, key }) => (
                                    <div key={key}>
                                        <label className="block text-[10px] font-black text-slate-900 mb-2 uppercase tracking-widest">{label}</label>
                                        <input
                                            type="number" min="0" step="any"
                                            value={(form as any)[key]}
                                            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                            placeholder="000"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 transition-all placeholder:text-slate-300 shadow-sm"
                                            required
                                        />
                                    </div>
                                ))}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-black mb-2.5 uppercase tracking-widest">NOTES</label>
                                <textarea
                                    value={form.notes}
                                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    rows={2}
                                    placeholder="e.g. Parts arrived from warehouse, lot #123..."
                                    className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 transition-all resize-none shadow-sm font-black placeholder:text-slate-300"
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 flex items-center gap-2 text-rose-600">
                                    <AlertTriangle size={14} />
                                    <p className="text-[10px] font-black uppercase tracking-tight">{error}</p>
                                </div>
                            )}

                            {request.rejection_reason && (
                                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                                    <div className="flex items-center gap-2 text-rose-600 mb-2">
                                        <AlertTriangle size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Rejection Reason</span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-900 italic">"{request.rejection_reason}"</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-7 py-5 border-t border-gray-100 flex gap-4">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-3.5 rounded-full border border-slate-200 text-xs font-black text-slate-500 hover:bg-slate-50 transition-all uppercase tracking-widest">
                            CANCEL
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 py-3.5 rounded-full bg-[#f37021] hover:bg-orange-700 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-orange-600/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                            {saving ? <Loader2 className="animate-spin" size={14} /> : (
                                <>
                                    <Zap size={14} fill="white" />
                                    SUBMIT TO SUPERVISOR
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

const DetailsModal = ({ request, onClose }: { request: ShortageRequest, onClose: () => void }) => {
    const item = request.inventory_item;
    const modelName = item?.vehicle_name || 'PART';
    const demandId = request.formatted_id || 'DEM-000';
    const status = request.status || 'PENDING';

    const startDate = request.created_at ? new Date(request.created_at).toISOString().split('T')[0] : '—';
    const endDate = request.deadline || '—';

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl relative border border-ind-border/20"
            >
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex gap-4 items-center">
                        <div className="bg-orange-600 p-2 rounded-xl text-white shadow-lg shadow-orange-600/20 flex-shrink-0">
                            <Car size={16} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <h2 className="text-[9px] font-black text-slate-900 uppercase tracking-widest whitespace-nowrap">ASSIGNMENT DETAILS</h2>
                            <div className="flex items-center gap-3">
                                <h3 className="text-[14px] font-black text-black uppercase whitespace-nowrap leading-none">{request.inventory_item?.vehicle_name || 'Generic'}</h3>
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest whitespace-nowrap leading-none">{request.formatted_id}</p>
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest whitespace-nowrap leading-none flex-shrink-0">
                                    {request.inventory_item?.sap_part_number}
                                </p>
                                <div className="flex-shrink-0">
                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black border border-indigo-100 uppercase tracking-widest">
                                        IN PROGRESS
                                    </span>
                                </div>
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
                                <span className="text-[10px] font-black text-black uppercase tracking-widest mb-2 flex items-center gap-2">Production Context</span>
                            </div>
                            <div className="space-y-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500 flex-shrink-0">
                                        <LayoutGrid size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest mb-1">Production Line</p>
                                        <p className="text-[14px] font-black text-black uppercase tracking-tight">
                                            {request.line_name || 'NO LINE ASSIGNED'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500 flex-shrink-0">
                                        <Database size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest mb-1">Customer / Division</p>
                                        <p className="text-[14px] font-black text-black uppercase italic font-serif tracking-tight">
                                            {request.customer_name || 'CIE AUTOMOTIVE'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-orange-50/30 rounded-3xl p-6 border border-orange-100/50">
                            <div className="text-[10px] font-black text-black uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Clock size={12} />
                                <span className="text-[10px] font-bold text-black uppercase tracking-widest mb-2 flex items-center gap-2">Timeline Details</span>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="

text-[9px] font-black text-ind-text3 uppercase tracking-widest">Start Date</span>
                                    <span className="text-xs font-black text-ind-text group-hover:text-ind-primary transition-colors tabular-nums">{startDate}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="

text-[9px] font-black text-ind-text3 uppercase tracking-widest">Target End</span>
                                    <span className="text-xs font-black text-ind-text group-hover:text-ind-primary transition-colors tabular-nums">{endDate}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="bg-orange-50/30 rounded-3xl p-6 border border-orange-100/50">
                            <div className="text-[10px] font-black text-black uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Package size={11} />
                                <span className="text-[10px] font-black text-black uppercase tracking-widest mb-2 flex items-center gap-2">Assigned Personnel</span>
                            </div>

                            <div className="space-y-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500 flex-shrink-0">
                                        <User size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[7.5px] font-black text-orange-400 uppercase tracking-widest mb-1">Supervisor</p>
                                        <p className="text-[14px] font-black text-black uppercase tracking-tight truncate">
                                            {request.supervisor_name || 'Unassigned'}
                                        </p>
                                        {request.supervisor_email && (
                                            <p className="text-[10px] font-black text-slate-900 flex items-center gap-1.5 mt-1.5 overflow-hidden text-ellipsis">
                                                <Info size={11} className="text-orange-400" />
                                                {request.supervisor_email}
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
                                            {request.deo_name || 'Unassigned'}
                                        </p>
                                        {request.deo_email && (
                                            <p className="text-[10px] font-black text-slate-900 flex items-center gap-1.5 mt-1.5 overflow-hidden text-ellipsis">
                                                <Info size={11} className="text-indigo-400" />
                                                {request.deo_email}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Submitted Stock Data */}
                        {request.status !== 'PENDING' && (
                            <div className="bg-emerald-50/30 rounded-3xl p-6 border border-emerald-100/50">
                                <div className="text-[10px] font-black text-black uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Database size={12} className="text-emerald-600" />
                                    <span>Submitted Stock Data</span>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-white/60 p-3 rounded-xl border border-emerald-100/50">
                                            <p className="text-[7px] font-black text-emerald-600 uppercase tracking-widest mb-1">SAP Stock</p>
                                            <p className="text-[12px] font-black text-slate-900">{request.sap_stock ?? '—'}</p>
                                        </div>
                                        <div className="bg-white/60 p-3 rounded-xl border border-emerald-100/50">
                                            <p className="text-[7px] font-black text-emerald-600 uppercase tracking-widest mb-1">Opening</p>
                                            <p className="text-[12px] font-black text-slate-900">{request.opening_stock ?? '—'}</p>
                                        </div>
                                        <div className="bg-white/60 p-3 rounded-xl border border-emerald-100/50">
                                            <p className="text-[7px] font-black text-emerald-600 uppercase tracking-widest mb-1">Today's</p>
                                            <p className="text-[12px] font-black text-slate-900">{request.todays_stock ?? '—'}</p>
                                        </div>
                                    </div>
                                    {request.deo_notes && (
                                        <div className="bg-white/60 p-3 rounded-xl border border-emerald-100/50">
                                            <p className="text-[7px] font-black text-emerald-600 uppercase tracking-widest mb-1">Notes</p>
                                            <p className="text-[10px] font-bold text-slate-700 italic">"{request.deo_notes}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
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

export default function DEOShortageRequests() {
    const [requests, setRequests] = useState<ShortageRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [fillRequest, setFillRequest] = useState<ShortageRequest | null>(null);
    const [infoRequest, setInfoRequest] = useState<ShortageRequest | null>(null);
    const [viewFillRequest, setViewFillRequest] = useState<ShortageRequest | null>(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState('');

    useEffect(() => {
        const parentMain = document.querySelector('main');
        if (parentMain) {
            const originalOverflow = parentMain.style.overflow;
            parentMain.style.overflow = 'hidden';
            return () => { parentMain.style.overflow = originalOverflow; };
        }
    }, []);

    const fetchRequests = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        try {
            const res = await fetch(`${API}/deo/shortage-requests`, { headers: authHeaders() });
            const data = await res.json();
            if (data.success) setRequests(data.data);
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
        const interval = setInterval(() => fetchRequests(true), 15000);
        const handleFocus = () => fetchRequests(true);
        window.addEventListener('focus', handleFocus);
        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 size={40} className="animate-spin text-ind-primary" />
            </div>
        );
    }

    const filteredRequests = requests.filter(r => {
        let matches = true;
        if (filterStatus === 'pending') matches = r.status === 'PENDING';
        else if (filterStatus === 'in-progress') matches = r.status === 'IN_PROGRESS' || r.status === 'REJECTED' || r.status === 'DEO_FILLED' || r.status === 'VERIFIED';
        else if (filterStatus === 'rejected') matches = r.status === 'REJECTED';
        else if (filterStatus === 'completed') matches = r.status === 'COMPLETED' || r.status === 'VERIFIED';

        if (!matches) return false;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const partMatch = r.inventory_item?.sap_part_number?.toLowerCase().includes(query) ||
                r.inventory_item?.part_description?.toLowerCase().includes(query) ||
                r.inventory_item?.vehicle_name?.toLowerCase().includes(query);
            const idMatch = r.formatted_id.toLowerCase().includes(query);
            if (!partMatch && !idMatch) return false;
        }

        if (selectedDate && selectedDate !== "") {
            const rDate = r.created_at?.split('T')[0];
            if (rDate !== selectedDate) return false;
        }

        return true;
    });

    return (
        <div className="h-full flex flex-col space-y-1 animate-in fade-in duration-700 overflow-hidden text-slate-900">
            <div className="flex xl:flex-row xl:items-center justify-between gap-4 bg-white border-b border-slate-100 mb-2 py-1">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-2">
                    <div className="space-y-1">
                        <h1 className="text-[24px] font-black text-ind-text tracking-tight leading-none">
                            Shortage Requests
                        </h1>
                    </div>
                </div>

                <div className="flex items-center bg-white backdrop-blur-md rounded-2xl border border-ind-border/50 p-1 shadow-sm overflow-hidden scale-90 origin-right mx-2">
                    <div className="px-4 py-1 text-center border-r border-ind-border/50">
                        <span className="block text-[8px] font-bold text-ind-text3 uppercase tracking-wider">TOTAL</span>
                        <span className="block text-lg font-black text-slate-800 leading-none">{requests.length}</span>
                    </div>
                    <div className="px-4 py-1 text-center border-r border-ind-border/50 text-amber-500">
                        <span className="block text-[8px] font-bold uppercase tracking-wider opacity-60">PENDING</span>
                        <span className="block text-lg font-black leading-none">{requests.filter(r => r.status === 'PENDING').length}</span>
                    </div>
                    <div className="px-4 py-1 text-center border-r border-ind-border/50 text-blue-500">
                        <span className="block text-[8px] font-bold uppercase tracking-wider opacity-60">IN PROGRESS</span>
                        <span className="block text-lg font-black leading-none">{requests.filter(r => r.status === 'IN_PROGRESS' || r.status === 'REJECTED' || r.status === 'DEO_FILLED').length}</span>
                    </div>
                    <div className="px-4 py-1 text-center text-emerald-500">
                        <span className="block text-[8px] font-bold uppercase tracking-wider opacity-60">COMPLETED</span>
                        <span className="block text-lg font-black leading-none">{requests.filter(r => r.status === 'COMPLETED' || r.status === 'VERIFIED').length}</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-2 px-2 mb-2">
                <div className="h-[38px] bg-white rounded-full px-3 border border-ind-border/40 shadow-sm flex items-center gap-2 min-w-[160px] hover:border-orange-400 transition-all group">
                    <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500 flex-shrink-0 group-hover:bg-orange-100 transition-colors">
                        <LayoutGrid size={14} />
                    </div>
                    <div className="flex-1 relative">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full bg-transparent text-[11px] font-black tracking-wider text-gray-800 appearance-none cursor-pointer focus:outline-none pr-6 text-center"
                        >
                            <option value="all" className="bg-slate-50 text-center py-2">All status</option>
                            <option value="pending" className="bg-white text-center py-2">Pending</option>
                            <option value="in-progress" className="bg-slate-50 text-center py-2">In progress</option>
                            <option value="rejected" className="bg-white text-center py-2">Rejected</option>
                            <option value="completed" className="bg-slate-50 text-center py-2">Completed</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                <div className="h-[38px] bg-white rounded-full px-3 border border-ind-border/40 shadow-sm flex items-center gap-2 flex-1 max-w-md hover:border-ind-primary transition-all group">
                    <Search size={14} className="text-gray-400 group-hover:text-ind-primary transition-colors flex-shrink-0" />
                    <input
                        type="text"
                        placeholder="Search shortages..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 bg-transparent text-[10px] font-black uppercase tracking-wider text-gray-800 outline-none placeholder:text-gray-300"
                    />
                </div>

                <div className="h-[38px] bg-white rounded-full px-3 border border-ind-border/40 shadow-sm flex items-center justify-between gap-2 min-w-[180px] hover:border-indigo-400 transition-all group relative">
                    <div className="flex items-center gap-2 flex-1">
                        <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
                            <Calendar size={13} />
                        </div>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent text-[10px] font-black text-gray-800 tracking-wider outline-none w-full uppercase cursor-pointer"
                        />
                    </div>
                    <ChevronDown size={14} className="text-gray-400 flex-shrink-0 pointer-events-none" />
                </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-ind-border/50 shadow-sm">
                <div className="flex-1 custom-scrollbar  h-[calc(100vh-200px)] overflow-y-auto">
                    <table className="min-w-full bg-white text-sm">
                        <thead className="sticky top-0 z-10 bg-ind-bg shadow-sm">
                            <tr className="bg-ind-bg text-black border-b-2 border-[#f37021] uppercase text-[11px] tracking-wider sticky top-0 z-[50]">
                                <th className="px-6 py-2 text-left">REQUEST</th>
                                <th className="px-6 py-2 text-center">STATUS</th>
                                <th className="px-6 py-2 text-center">CREATED DATE</th>
                                <th className="px-6 py-2 text-center">TARGET</th>
                                <th className="px-6 py-2 text-center">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ind-border/40 ">
                            {filteredRequests.map((req) => {
                                const isRejected = req.status === 'REJECTED';
                                const isDeoFilled = req.status === 'DEO_FILLED';
                                const isCompleted = req.status === 'COMPLETED';

                                return (
                                    <tr key={req.id} className={`hover:bg-ind-bg/40 transition-colors group ${isRejected ? 'bg-rose-50/20' : ''}`}>
                                        <td className="px-6 py-2">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-ind-primary">
                                                    <Package size={18} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2.5 mb-1">
                                                        <h3 className="font-bold text-slate-800">
                                                            {req.inventory_item?.vehicle_name || 'PART'}
                                                        </h3>
                                                        {isRejected && (
                                                            <span className="bg-rose-500 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest animate-pulse">
                                                                Needs Correction
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-ind-text3 font-bold uppercase">{req.formatted_id}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-8 py-2.5">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${isRejected ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                    req.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                        (req.status === 'IN_PROGRESS' || isDeoFilled) ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                            (req.status === 'VERIFIED' || isCompleted) ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                'bg-slate-50 text-slate-600 border-slate-100'
                                                    }`}>
                                                    {req.status === 'DEO_FILLED' ? 'SUBMITTED' :
                                                        req.status === 'IN_PROGRESS' ? 'IN PROGRESS' :
                                                            req.status === 'VERIFIED' ? 'COMPLETED' :
                                                                req.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="px-8 py-2.5 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
                                                    {req.created_at ? new Date(req.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                                </p>
                                            </div>
                                        </td>

                                        <td className="px-8 py-2.5">
                                            <div className="flex flex-col items-center">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="font-bold text-slate-800">
                                                        {(req.shortage_quantity > 0 ? req.shortage_quantity : (req.inventory_item?.demand_quantity || 0)).toLocaleString()}
                                                    </span>
                                                    <span className="font-bold text-slate-800">Units</span>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-10 py-2.5">
                                            <div className="flex items-center justify-center gap-3 pr-4">
                                                <button
                                                    onClick={() => setViewFillRequest(req)}
                                                    disabled={req.status === 'PENDING'}
                                                    className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${req.status === 'PENDING'
                                                        ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                                                        : 'bg-white border-ind-border/50 text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-sm'
                                                        }`}
                                                    title="View Submitted Data"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setInfoRequest(req)}
                                                    className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                                                    title="View Details"
                                                >
                                                    <Info size={18} />
                                                </button>
                                                <button
                                                    onClick={() => setFillRequest(req)}
                                                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-white transition-all shadow-md ${isRejected ? 'bg-rose-500 hover:bg-rose-600' :
                                                        req.status === 'IN_PROGRESS' || isDeoFilled || isCompleted ? 'bg-emerald-400 opacity-40 cursor-not-allowed pointer-events-none' :
                                                            'bg-[#10b981] hover:bg-emerald-600'
                                                        }`}
                                                    title={isRejected ? "Needs Correction" : "Fill Data"}
                                                >
                                                    <CheckCircle2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <div className="h-32" />
                </div>
            </div>

            {fillRequest && (
                <FillModal
                    request={fillRequest}
                    onClose={() => setFillRequest(null)}
                    onSuccess={fetchRequests}
                />
            )}

            {infoRequest && (
                <DetailsModal
                    request={infoRequest}
                    onClose={() => setInfoRequest(null)}
                />
            )}

            {viewFillRequest && (
                <ViewFillModal
                    request={viewFillRequest}
                    onClose={() => setViewFillRequest(null)}
                />
            )}
        </div>
    );
}