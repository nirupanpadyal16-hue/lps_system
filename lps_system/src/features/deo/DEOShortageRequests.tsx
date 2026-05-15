import { useState, useEffect, useMemo } from 'react';
import {
    CheckCircle2, AlertTriangle, X, Database, LayoutGrid, Search, ChevronDown, Info, Car,
    Loader2, Package, Calendar, Timer, Clock, Zap, User, MapPin, Eye, Factory, ArrowLeft, Plus, Activity
} from 'lucide-react';
import { API_BASE } from '../../lib/apiConfig';
import { getToken } from '../../lib/storage';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

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
    status: 'PENDING' | 'IN_PROGRESS' | 'DEO_FILLED' | 'COMPLETED' | 'REJECTED' | 'VERIFIED' | 'HOLD';
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
    master_machine?: string;
}

interface DisplayItem {
    machineName: string;
    shortage: ShortageRequest | undefined;
}

interface SubMachine {
    id: number;
    name: string;
    is_active: boolean;
    status: string;
}

interface LineGroup {
    name: string;
    total_shortages: number;
    pending_count: number;
    sub_machines: SubMachine[];
    total_machines_master?: number | null;
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
                                            <span className="text-[9px] text-slate-900 font-black uppercase tracking-widest block mb-0.5">Machine</span>
                                            <span className="text-xs text-black font-black uppercase">{request.line_name || 'Generic'}</span>
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
                                            <span className="text-xs text-black font-black uppercase">{request.line_name || 'Generic'}</span>
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

function AddModal({ title, description, label, placeholder, value, onChange, onSubmit, onClose }: {
    title: string;
    description: string;
    label: string;
    placeholder: string;
    value: string;
    onChange: (v: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    onClose: () => void;
}) {
    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    className="relative bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border border-slate-100"
                >
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 text-slate-300 hover:text-slate-700 transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                            <Plus size={20} className="text-orange-600" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{title}</h3>
                    </div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-6 ml-14">{description}</p>
                    <form onSubmit={onSubmit}>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                            {label}
                        </label>
                        <input
                            autoFocus
                            required
                            type="text"
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder={placeholder}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 transition-all placeholder:text-slate-300 mb-6"
                        />
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-4 border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-[2] py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-600/20"
                            >
                                Confirm Registration
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

interface DEOShortageRequestsProps {
    onlyShowHistory?: boolean;
}

export default function DEOShortageRequests({ onlyShowHistory = false }: DEOShortageRequestsProps) {
    const [requests, setRequests] = useState<ShortageRequest[]>([]);
    const [lineGroupsMaster, setLineGroupsMaster] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [fillRequest, setFillRequest] = useState<ShortageRequest | null>(null);
    const [infoRequest, setInfoRequest] = useState<ShortageRequest | null>(null);
    const [viewFillRequest, setViewFillRequest] = useState<ShortageRequest | null>(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [activeViewMachine, setActiveViewMachine] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    // Modal state for machine management
    const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
    const [isAddMachineModalOpen, setIsAddMachineModalOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newMachineName, setNewMachineName] = useState('');

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

    const fetchRequests = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        try {
            const res = await fetch(`${API}/deo/shortage-requests`, { headers: authHeaders() });
            const data = await res.json();
            if (data.success) {
                setRequests(data.data);
            }
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    // Partition data based on active vs historical view
    const relevantRequests = useMemo(() => {
        return requests.filter(r => {
            // Hide shortages waiting for RM approval so DEOs only see ready-to-work jobs
            if (r.status === 'WAITING_RM_APPROVAL') return false;

            const isDone = ['COMPLETED', 'VERIFIED'].includes(r.status);
            return onlyShowHistory ? isDone : !isDone;
        });
    }, [requests, onlyShowHistory]);

    const handleAddGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE}/admin/lines`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({
                    name: newGroupName,
                    isActive: true
                })
            });
            if (res.ok) {
                toast.success('Line Group created successfully');
                setNewGroupName('');
                setIsAddGroupModalOpen(false);
                fetchLineGroups();
                fetchRequests(true);
            } else {
                toast.error('Failed to create Line Group');
            }
        } catch (error) {
            console.error('Failed to add group:', error);
            toast.error('Failed to create Line Group');
        }
    };

    const handleAddMachine = async (e: React.FormEvent) => {
        e.preventDefault();
        let masterLine = lineGroupsMaster.find(lg => lg.name === activeViewMachine);
        
        // Auto-create parent line if it doesn't exist in DB
        if (!masterLine && activeViewMachine) {
            try {
                const resMaster = await fetch(`${API_BASE}/admin/lines`, {
                    method: 'POST',
                    headers: authHeaders(),
                    body: JSON.stringify({
                        name: activeViewMachine,
                        isActive: true,
                        parent_id: null
                    })
                });
                const dataMaster = await resMaster.json();
                if (dataMaster.success) {
                    masterLine = dataMaster.data;
                } else {
                    toast.error("Failed to auto-create parent line group");
                    return;
                }
            } catch (error) {
                console.error("Failed to auto-create parent line:", error);
                toast.error("Error creating parent line group");
                return;
            }
        }

        if (!masterLine) return;

        try {
            const res = await fetch(`${API_BASE}/admin/lines`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({
                    name: newMachineName,
                    isActive: true,
                    parent_id: masterLine.id
                })
            });
            if (res.ok) {
                toast.success('Machine registered successfully');
                setNewMachineName('');
                setIsAddMachineModalOpen(false);
                fetchLineGroups();
                fetchRequests(true);
            } else {
                toast.error('Failed to register machine');
            }
        } catch (error) {
            console.error('Failed to add machine:', error);
            toast.error('Failed to register machine');
        }
    };

    useEffect(() => {
        fetchLineGroups();
        fetchRequests();
        const interval = setInterval(() => {
            fetchLineGroups();
            fetchRequests(true);
        }, 15000);
        const handleFocus = () => fetchRequests(true);
        window.addEventListener('focus', handleFocus);
        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    const filteredRequests = useMemo(() => {
        return relevantRequests.filter(r => {
            let matches = true;
            if (filterStatus === 'pending') matches = r.status === 'PENDING';
            else if (filterStatus === 'hold') matches = r.status === 'HOLD';
            else if (filterStatus === 'in-progress') matches = r.status === 'IN_PROGRESS' || r.status === 'REJECTED' || r.status === 'DEO_FILLED' || r.status === 'VERIFIED';
            else if (filterStatus === 'rejected') matches = r.status === 'REJECTED';
            else if (filterStatus === 'completed') matches = r.status === 'COMPLETED' || r.status === 'VERIFIED';

            if (!matches) return false;

            const query = searchQuery.toLowerCase();
            const partMatch = r.inventory_item?.sap_part_number?.toLowerCase().includes(query) ||
                            r.inventory_item?.part_description?.toLowerCase().includes(query) ||
                            r.formatted_id?.toLowerCase().includes(query);

            if (searchQuery && !partMatch) return false;

            if (selectedDate && r.created_at?.split('T')[0] !== selectedDate) {
                return false;
            }

            return true;
        });
    }, [relevantRequests, filterStatus, searchQuery, selectedDate]);

    const derivedLineGroups = useMemo(() => {
        const groups: Record<string, LineGroup> = {};
        const officialNames = new Set(lineGroupsMaster.map(lg => lg.name));
        
        lineGroupsMaster.forEach(lg => {
            groups[lg.name] = {
                name: lg.name,
                total_shortages: 0,
                pending_count: 0,
                sub_machines: lg.sub_machines || [],
                total_machines_master: lg.total_machines
            };
        });

        // 2. Add shortage counts from relevant requests
        relevantRequests.forEach(req => {
            const rawLine = req.master_machine || req.line_name;
            if (!rawLine) return;

            const individualLines = rawLine.split(',').map(s => s.trim()).filter(Boolean);
            
            individualLines.forEach(lineName => {
                // Only count if it's an official group
                if (officialNames.has(lineName)) {
                    groups[lineName].total_shortages += 1;
                    if (req.status === 'PENDING' || req.status === 'IN_PROGRESS' || req.status === 'REJECTED') {
                        groups[lineName].pending_count += 1;
                    }
                }
            });
        });

        return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
    }, [relevantRequests, lineGroupsMaster]);

    const shortagesForActiveGroup = useMemo(() => {
        if (!activeViewMachine) return [];
        return filteredRequests.filter(req => {
            const rawLine = req.master_machine || req.line_name;
            if (!rawLine) return false;
            const individualLines = rawLine.split(',').map(s => s.trim()).filter(Boolean);
            return individualLines.includes(activeViewMachine);
        });
    }, [filteredRequests, activeViewMachine]);

    // Current list for pagination
    const currentList = useMemo(() => {
        const query = searchQuery.toLowerCase();

        if (!activeViewMachine) {
            return derivedLineGroups.filter(lg => lg.name.toLowerCase().includes(query));
        }

        // ── FIXED DRILL-DOWN LOGIC ─────────────────────────────────────────
        // Get only sub-machines that truly belong to this group (from master)
        const group = derivedLineGroups.find(lg => lg.name === activeViewMachine);
        const groupSubMachines: SubMachine[] = group ? group.sub_machines : [];

        // Build a map: sub-machine name -> the shortage request assigned to it
        // A shortage is "assigned to" a sub-machine if that sub-machine appears
        // in req.sub_machines[] AND belongs to the activeViewMachine group.
        const subMachineToReq = new Map<string, ShortageRequest>();

        // Sort: Primary occupying requests (Active/Pending) first, HOLD requests last.
        // Secondarily, sort by creation age (FIFO oldest-to-newest first).
        const sortedShortages = [...shortagesForActiveGroup].sort((a, b) => {
            const scoreA = a.status === 'HOLD' ? 2 : 1;
            const scoreB = b.status === 'HOLD' ? 2 : 1;
            if (scoreA !== scoreB) return scoreA - scoreB;
            return a.id - b.id;
        });

        sortedShortages.forEach(req => {
            // req.sub_machines comes from the API, already filtered to this group's machines
            const reqSubs: Array<{ id: number; name: string }> = (req as any).sub_machines || [];
            reqSubs.forEach(sub => {
                // Only assign to sub-machines that belong to THIS group
                const isInGroup = groupSubMachines.some(
                    gs => gs.id === sub.id || gs.name === sub.name
                );
                if (isInGroup && !subMachineToReq.has(sub.name)) {
                    subMachineToReq.set(sub.name, req);
                }
            });
        });

        // Build rows: one row per registered sub-machine in this group
        const result: DisplayItem[] = groupSubMachines.map(sub => ({
            machineName: sub.name,
            shortage: subMachineToReq.get(sub.name),
        }));

        // Also surface any shortages for this group that didn't match a registered sub-machine
        const matchedIds = new Set(Array.from(subMachineToReq.values()).map(r => r.id));
        shortagesForActiveGroup
            .filter(req => !matchedIds.has(req.id))
            .forEach(req => {
                const reqSubs: Array<{ id: number; name: string }> = (req as any).sub_machines || [];
                // Find the sub-machine assigned to this request that ACTUALLY belongs to our active group view!
                const relevantSub = reqSubs.find(sub => 
                    groupSubMachines.some(gs => gs.id === sub.id || gs.name === sub.name)
                );
                const label = relevantSub ? relevantSub.name : (req.line_name || activeViewMachine || '—');
                result.push({ machineName: label, shortage: req });
            });

        // Apply search filter
        if (query) {
            return result.filter(item =>
                item.machineName.toLowerCase().includes(query) ||
                item.shortage?.inventory_item?.sap_part_number?.toLowerCase().includes(query)
            );
        }

        return result;
    }, [activeViewMachine, derivedLineGroups, searchQuery, shortagesForActiveGroup]);

    const paginatedItems = useMemo(() => {
        return currentList.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    }, [currentList, currentPage, pageSize]);

    const totalPages = Math.ceil(currentList.length / pageSize);

    // Reset to page 1 when filters or view changes
    useEffect(() => {
        setCurrentPage(1);
    }, [activeViewMachine, searchQuery, filterStatus, selectedDate]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 size={40} className="animate-spin text-ind-primary" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col space-y-1 animate-in fade-in duration-700 overflow-hidden text-slate-900 bg-gray-50/30 p-2">
            <div className="flex xl:flex-row xl:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl mb-2 p-4 shadow-sm">
                <div className="flex flex-col gap-1">
                    <h1 className="text-[24px] font-black text-ind-text tracking-tight leading-none flex items-center gap-2">
                        <Factory className="text-orange-600" />
                        {activeViewMachine ? `Shortages: ${activeViewMachine}` : onlyShowHistory ? 'Shortage History Log' : 'Shortage Dashboard'}
                    </h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {activeViewMachine ? '' : ''}
                    </p>
                </div>

                <div className="flex items-center bg-gray-50 rounded-2xl border border-slate-200 p-1 shadow-inner">
                    <div className="px-4 py-1 text-center border-r border-slate-200 min-w-[80px]">
                        <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">TOTAL</span>
                        <span className="block text-lg font-black text-slate-800 leading-none">{relevantRequests.length}</span>
                    </div>
                    <div className="px-4 py-1 text-center border-r border-slate-200 text-amber-500 min-w-[80px]">
                        <span className="block text-[8px] font-bold uppercase tracking-wider opacity-60">PENDING</span>
                        <span className="block text-lg font-black leading-none">{relevantRequests.filter(r => r.status === 'PENDING').length}</span>
                    </div>
                    <div className="px-4 py-1 text-center text-emerald-500 min-w-[80px]">
                        <span className="block text-[8px] font-bold uppercase tracking-wider opacity-60">{onlyShowHistory ? 'COMPLETED' : 'VERIFIED'}</span>
                        <span className="block text-lg font-black leading-none">{relevantRequests.filter(r => r.status === 'VERIFIED' || r.status === 'COMPLETED').length}</span>
                    </div>
                </div>

                {!activeViewMachine ? (
                    <button
                        onClick={() => setIsAddGroupModalOpen(true)}
                        className="h-[42px] px-6 bg-orange-600 hover:bg-orange-700 text-white rounded-full text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-orange-600/20"
                    >
                        <Plus size={16} /> Add Line Group
                    </button>
                ) : (
                    <button
                        onClick={() => setIsAddMachineModalOpen(true)}
                        className="h-[42px] px-6 bg-orange-600 hover:bg-orange-700 text-white rounded-full text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-orange-600/20"
                    >
                        <Plus size={16} /> Register Machine
                    </button>
                )}
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-1 mb-3">
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {activeViewMachine && (
                        <button
                            onClick={() => setActiveViewMachine(null)}
                            className="h-[42px] px-6 bg-white border border-slate-200 rounded-full text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
                        >
                            <ArrowLeft size={16} /> Back
                        </button>
                    )}

                    {/* Status Filter */}
                    <div className="relative group w-full md:w-48">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1 bg-orange-50 rounded text-orange-500 group-focus-within:text-orange-600 pointer-events-none">
                            <LayoutGrid size={11} />
                        </div>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full bg-white border border-slate-200 focus:border-orange-500 rounded-full h-[42px] pl-12 pr-10 text-slate-700 font-bold text-[11px] tracking-wide outline-none transition-all shadow-sm cursor-pointer appearance-none uppercase"
                        >
                            {onlyShowHistory ? (
                                <>
                                    <option value="all">All History</option>
                                    <option value="completed">Completed</option>
                                </>
                            ) : (
                                <>
                                    <option value="all">Active Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="hold">On Hold</option>
                                    <option value="in-progress">In progress</option>
                                    <option value="rejected">Rejected</option>
                                </>
                            )}
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
                            placeholder="Search shortages..."
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
                        className="bg-white border border-slate-200 focus:border-orange-500 rounded-full h-[42px] pl-12 pr-5 text-slate-700 font-bold text-[11px] tracking-wide outline-none transition-all shadow-sm w-[180px] uppercase cursor-pointer"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-hidden bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <AnimatePresence mode="wait">
                        {!activeViewMachine ? (
                            <motion.table
                                key="groups"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="w-full text-sm text-left border-collapse"
                            >
                                <thead className="bg-white text-slate-900 border-b-2 border-orange-500 uppercase text-[11px] font-black tracking-widest sticky top-0 z-[50]">
                                    <tr>
                                        <th className="px-6 py-4 text-left whitespace-nowrap">Sr.No</th>
                                        <th className="px-6 py-4 text-left whitespace-nowrap">Line Name</th>
                                        <th className="px-6 py-4 text-center whitespace-nowrap">Total Machines</th>
                                        <th className="px-6 py-4 text-center whitespace-nowrap">{onlyShowHistory ? 'Historical Shortages' : 'Active Shortages'}</th>
                                        <th className="px-6 py-4 text-center whitespace-nowrap">Status</th>
                                        <th className="px-6 py-4 text-right whitespace-nowrap">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedItems.map((lg: any, idx) => {
                                        const serialNum = (currentPage - 1) * pageSize + idx + 1;
                                        return (
                                            <tr key={lg.name} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setActiveViewMachine(lg.name)}>
                                                <td className="px-6 py-4">
                                                    <span className="text-[11px] font-black text-slate-900">{serialNum}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform border border-orange-100 shadow-sm">
                                                            <Factory size={20} />
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
                                                        {lg.total_shortages} Total
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={cn(
                                                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                                        lg.pending_count === 0 
                                                            ? onlyShowHistory ? "bg-slate-50 text-slate-600 border-slate-100" : "bg-emerald-50 text-emerald-600 border-emerald-100" 
                                                            : "bg-amber-50 text-amber-600 border-amber-100"
                                                    )}>
                                                        {onlyShowHistory ? 'ARCHIVED' : lg.pending_count === 0 ? 'ALL FILLED' : `${lg.pending_count} PENDING`}
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
                                <thead className="bg-white text-slate-900 border-b-2 border-orange-500 uppercase text-[10px] font-black tracking-wider sticky top-0 z-[50]">
                                    <tr>
                                        <th className="px-3 py-4 text-left whitespace-nowrap">Sr.NO</th>
                                        <th className="px-3 py-4 text-left whitespace-nowrap">Sub Machine</th>
                                        <th className="px-3 py-4 text-left whitespace-nowrap">Part Number</th>
                                        <th className="px-3 py-4 text-center whitespace-nowrap">Demand Date</th>
                                        <th className="px-3 py-4 text-center whitespace-nowrap">Coverage</th>
                                        <th className="px-3 py-4 text-center whitespace-nowrap">SAP Stock</th>
                                        <th className="px-3 py-3 text-center whitespace-nowrap">Opening</th>
                                        <th className="px-3 py-3 text-center whitespace-nowrap">Today's</th>
                                        <th className="px-3 py-3 text-center whitespace-nowrap">Target</th>
                                        <th className="px-3 py-3 text-center whitespace-nowrap">Status</th>
                                        <th className="px-3 py-3 text-right whitespace-nowrap">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedItems.map((item: any, idx: number) => {
                                        const req = item.shortage;
                                        const machineName = item.machineName;
                                        const isRejected = req?.status === 'REJECTED';
                                        const isHold = req?.status === 'HOLD';
                                        const isDeoFilled = req?.status === 'DEO_FILLED';
                                        const isCompleted = req?.status === 'COMPLETED' || req?.status === 'VERIFIED';
                                        const shortageQty = req ? (req.shortage_quantity > 0 ? req.shortage_quantity : (req.inventory_item?.demand_quantity || 0)) : 0;
                                        const serialNum = (currentPage - 1) * pageSize + idx + 1;

                                        // Coverage logic
                                        let coverage = "—";
                                        if (req?.todays_stock && req.per_day) {
                                            coverage = (req.todays_stock / req.per_day).toFixed(1);
                                        }

                                        return (
                                            <tr key={machineName} className={cn(
                                                "hover:bg-slate-50 transition-colors group",
                                                isRejected && "bg-rose-50/30"
                                            )}>
                                                <td className="px-3 py-4">
                                                    <span className="text-[11px] font-black text-slate-900">{serialNum}</span>
                                                </td>
                                                <td className="px-3 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "w-8 h-8 rounded-lg flex items-center justify-center border",
                                                            !req ? "bg-slate-50 text-slate-600 border-slate-100" : "bg-orange-50 text-orange-600 border-orange-100"
                                                        )}>
                                                            <Activity size={14} />
                                                        </div>
                                                        <span className="text-[11px] font-black text-slate-900 tracking-tight">{machineName}</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-4">
                                                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">
                                                        {req?.inventory_item?.sap_part_number || '—'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-4 text-center">
                                                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider">
                                                        {req?.created_at ? new Date(req.created_at).toLocaleDateString() : '—'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-4 text-center">
                                                    <span className={cn(
                                                        "text-[10px] font-black tabular-nums px-2 py-1 rounded border",
                                                        coverage === "—" ? "text-slate-300 border-transparent" :
                                                            Number(coverage) >= 5 ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-rose-600 bg-rose-50 border-rose-100"
                                                    )}>
                                                        {coverage} {coverage !== "—" && "Days"}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-4 text-center">
                                                    <span className="text-[11px] font-black text-slate-900 tabular-nums">
                                                        {req?.sap_stock ?? '—'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-4 text-center">
                                                    <span className="text-[11px] font-black text-slate-900 tabular-nums">
                                                        {req?.opening_stock ?? '—'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-4 text-center">
                                                    <span className="text-[11px] font-black text-orange-600 tabular-nums">
                                                        {req?.todays_stock ?? '—'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-4 text-center">
                                                    <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-[10px] font-black border border-indigo-100">
                                                        {shortageQty > 0 ? shortageQty.toLocaleString() : '—'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-4 text-center">
                                                    <span className={cn(
                                                        "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border",
                                                        !req ? "bg-slate-50 text-slate-400 border-slate-200" :
                                                            isRejected ? "bg-rose-50 text-rose-600 border-rose-100 animate-pulse" :
                                                                isHold ? "bg-amber-50 text-amber-600 border-amber-200" :
                                                                    isCompleted ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                                        "bg-indigo-50 text-indigo-600 border-indigo-100"
                                                    )}>
                                                        {req ? (isDeoFilled ? 'SUBMITTED' : req.status.replace('_', ' ')) : 'IDLE'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-4 text-right">
                                                    {req ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => setViewFillRequest(req)}
                                                                disabled={req.status === 'PENDING'}
                                                                className={cn(
                                                                    "w-8 h-8 rounded-lg border flex items-center justify-center transition-all shadow-sm",
                                                                    req.status === 'PENDING' ? "bg-slate-50 text-slate-200 border-slate-100" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:text-indigo-600"
                                                                )}
                                                            >
                                                                <Eye size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => setFillRequest(req)}
                                                                disabled={isCompleted || isHold || (isDeoFilled && !isRejected)}
                                                                className={cn(
                                                                    "w-8 h-8 rounded-lg flex items-center justify-center text-white transition-all shadow-md",
                                                                    isRejected ? "bg-rose-500 hover:bg-rose-600" :
                                                                        (isCompleted || isDeoFilled || isHold) ? "bg-emerald-400 opacity-30 cursor-not-allowed" :
                                                                            "bg-emerald-500 hover:bg-emerald-600"
                                                                )}
                                                            >
                                                                <CheckCircle2 size={14} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest">—</span>
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
                    <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white sticky bottom-0 z-[60]">
                        <div className="flex items-center gap-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Showing <span className="text-slate-900">{(currentPage - 1) * pageSize + 1}</span> to <span className="text-slate-900">{Math.min(currentPage * pageSize, currentList.length)}</span> of <span className="text-slate-900">{currentList.length}</span> {activeViewMachine ? 'machines' : 'lines'}
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

            {isAddGroupModalOpen && (
                <AddModal
                    title="Create Line Group"
                    description="Define a new top-level production area"
                    label="Group Name"
                    placeholder="e.g. 110T, 320T..."
                    value={newGroupName}
                    onChange={setNewGroupName}
                    onSubmit={handleAddGroup}
                    onClose={() => setIsAddGroupModalOpen(false)}
                />
            )}

            {isAddMachineModalOpen && (
                <AddModal
                    title="Register Machine"
                    description={`Add a physical machine to ${activeViewMachine}`}
                    label="Machine Name"
                    placeholder="e.g. 110T-A, 110T-B..."
                    value={newMachineName}
                    onChange={setNewMachineName}
                    onSubmit={handleAddMachine}
                    onClose={() => setIsAddMachineModalOpen(false)}
                />
            )}
        </div>
    );
}
