import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2, AlertTriangle, X, Database, LayoutGrid, Info, Car,
    Loader2, Package, Calendar, Timer, Clock, Zap, User, MapPin, Eye
} from 'lucide-react';
import { API_BASE } from '../../../lib/apiConfig';
import { getToken } from '../../../lib/storage';

const API = API_BASE;

const authHeaders = () => ({
    'Authorization': `Bearer ${getToken()}`,
    'Content-Type': 'application/json'
});

export interface ShortageRequest {
    id: number;
    formatted_id: string;
    inventory_item?: {
        sap_part_number: string;
        part_description: string;
        vehicle_name: string;
        current_stock: number;
        demand_quantity: number;
        line_name?: string;
    } | null;
    sap_part_number?: string;
    part_description?: string;
    vehicle_name?: string;
    shortage_quantity: number;
    deadline: string | null;
    days_remaining: number | null;
    is_overdue: boolean;
    status: string;
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

export function TimelineBar({ daysRemaining, isOverdue }: { daysRemaining: number | null; isOverdue: boolean }) {
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

export const ViewFillModal = ({ request, onClose }: { request: ShortageRequest; onClose: () => void }) => {
    const item = request.inventory_item;
    const sapPartNo = request.sap_part_number || item?.sap_part_number;
    const partDesc = request.part_description || item?.part_description || sapPartNo;
    const vehicleName = request.vehicle_name || item?.vehicle_name || 'Generic';
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
                        <p className="text-[10px] text-slate-900 font-black uppercase tracking-widest mt-1">{request.formatted_id} | {sapPartNo}</p>
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
                                        {partDesc}
                                    </h3>
                                </div>
                                <div className="flex items-center justify-between gap-4 flex-wrap">
                                    <div className="flex gap-6">
                                        <p className="font-bold tracking-tight">
                                            <span className="text-[9px] text-slate-900 font-black uppercase tracking-widest block mb-0.5">Vehicle</span>
                                            <span className="text-xs text-black font-black uppercase">{vehicleName}</span>
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

export const FillModal = ({ request, onClose, onSuccess }: {
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
    const sapPartNo = request.sap_part_number || item?.sap_part_number;
    const partDesc = request.part_description || item?.part_description || sapPartNo;
    const vehicleName = request.vehicle_name || item?.vehicle_name || 'Generic';
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
                        <p className="text-[10px] text-slate-900 font-black uppercase tracking-widest mt-1">{request.formatted_id} | {sapPartNo}</p>
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
                                        {partDesc}
                                    </h3>
                                </div>
                                <div className="flex items-center justify-between gap-4 flex-wrap">
                                    <div className="flex gap-6">
                                        <p className="font-bold tracking-tight">
                                            <span className="text-[9px] text-slate-900 font-black uppercase tracking-widest block mb-0.5">Vehicle</span>
                                            <span className="text-xs text-black font-black uppercase">{vehicleName}</span>
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
                                    <p className="text-xs font-bold text-slate-900 italic">\"{request.rejection_reason}\"</p>
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

export const DetailsModal = ({ request, onClose }: { request: ShortageRequest, onClose: () => void }) => {
    const item = request.inventory_item;
    const vehicleName = request.vehicle_name || item?.vehicle_name || 'Generic';
    const sapPartNo = request.sap_part_number || item?.sap_part_number;

    const startDate = request.created_at ? new Date(request.created_at).toISOString().split('T')[0] : (request.demand_start_date || '—');
    const endDate = request.deadline || request.demand_end_date || '—';

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
                                <h3 className="text-[14px] font-black text-black uppercase whitespace-nowrap leading-none">{vehicleName}</h3>
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest whitespace-nowrap leading-none">{request.formatted_id}</p>
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest whitespace-nowrap leading-none flex-shrink-0">
                                    {sapPartNo}
                                </p>
                                <div className="flex-shrink-0">
                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black border border-indigo-100 uppercase tracking-widest">
                                        {request.status.replace('_', ' ')}
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
                                            {request.line_name || item?.line_name || 'NO LINE ASSIGNED'}
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
                                    <span className="text-[9px] font-black text-ind-text3 uppercase tracking-widest">Start Date</span>
                                    <span className="text-xs font-black text-ind-text transition-colors tabular-nums">{startDate}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-black text-ind-text3 uppercase tracking-widest">Target End</span>
                                    <span className="text-xs font-black text-ind-text transition-colors tabular-nums">{endDate}</span>
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
                                            <p className="text-[10px] font-bold text-slate-700 italic">\"{request.deo_notes}\"</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-7 pb-6 pt-0 bg-ind-bg/5 grid grid-cols-2 gap-4">
                    <button
                        onClick={onClose}
                        className="w-full py-4.5 bg-slate-100 text-slate-400 rounded-full font-black text-[11px] uppercase tracking-[0.25em] hover:bg-slate-200 transition-all flex items-center justify-center"
                    >
                        Dismiss
                    </button>
                    <button
                        onClick={() => window.location.href = '/deo/machine-entry'}
                        className="w-full py-4.5 bg-[#f37021] text-white rounded-full font-black text-[11px] uppercase tracking-[0.25em] shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                    >
                        <Factory size={18} />
                        Machine Registry
                    </button>
                </div>

            </motion.div>
        </div>
    );
};
