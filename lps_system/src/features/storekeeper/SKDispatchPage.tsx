
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getToken } from '../../lib/storage';
import { API_BASE } from '../../lib/apiConfig';
import toast from 'react-hot-toast';
import {
  Truck, Loader2, Building2, Package,
  ShieldCheck, TruckIcon, Globe,
  Save, X, ChevronLeft, ChevronRight,
  Plus, Search, Calendar, Filter, Eye,
  ArrowRight, ClipboardList
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { skApi } from '../../api/newRolesApi';

// ─── Sub-Components ───────────────────────────────────────────────────────────

const TableRow = ({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode;
}) => (
  <tr>
    <td className="w-[36%] bg-[#f8fafc] px-4 py-3 align-top border-b border-[#f1f5f9]">
      <span className="text-[10px] font-black uppercase tracking-[0.08em] text-[#64748b]">
        {label} {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
    </td>
    <td className="px-4 py-2 border-b border-[#f1f5f9]">{children}</td>
  </tr>
);

const SectionHeader = ({ label, icon: Icon }: { label: string; icon: any }) => (
  <tr className="bg-slate-50/80">
    <td colSpan={2} className="px-4 py-2.5 border-b border-slate-200">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-[#f97316]/10 flex items-center justify-center">
          <Icon size={12} className="text-[#f97316]" />
        </div>
        <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">{label}</span>
      </div>
    </td>
  </tr>
);

const TdInput = ({ value, onChange, placeholder, type = 'text', min, onKeyDown }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; min?: string; onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) => (
  <input type={type} value={value} onChange={e => onChange(e.target.value)}
    placeholder={placeholder} min={min} onKeyDown={onKeyDown}
    className="w-full h-[38px] bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 text-[13px] font-semibold text-slate-700 outline-none transition-all focus:ring-2 focus:ring-[#f97316]/30 focus:border-[#f97316] placeholder:text-slate-300" />
);

const TdTextarea = ({ value, onChange, placeholder, onKeyDown }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}) => (
  <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
    placeholder={placeholder} onKeyDown={onKeyDown}
    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-[13px] font-semibold text-slate-700 outline-none transition-all focus:ring-2 focus:ring-[#f97316]/30 focus:border-[#f97316] placeholder:text-slate-300 resize-none" />
);

const TdSelect = ({ value, onChange, options, onKeyDown }: {
  value: string; onChange: (v: string) => void;
  options: { label: string; value: string }[];
  onKeyDown?: (e: React.KeyboardEvent<HTMLSelectElement>) => void;
}) => (
  <select value={value} onChange={e => onChange(e.target.value)} onKeyDown={onKeyDown}
    className="w-full h-[38px] bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 text-[13px] font-semibold text-slate-700 outline-none transition-all focus:ring-2 focus:ring-[#f97316]/30 focus:border-[#f97316] appearance-none cursor-pointer">
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

const TdRadio = ({ value, onChange, options, colorMap }: {
  value: string; onChange: (v: string) => void;
  options: { label: string; value: string }[];
  colorMap: Record<string, string>;
}) => (
  <div className="flex gap-2 flex-wrap py-1">
    {options.map(opt => {
      const active = value === opt.value;
      return (
        <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
          className={cn(
            "px-4 h-[32px] rounded-full text-[11px] font-black uppercase tracking-widest border transition-all",
            active
              ? `${colorMap[opt.value] || 'bg-gray-800 text-white'} border-transparent shadow-sm`
              : 'bg-white border-[#e2e8f0] text-[#64748b] hover:border-[#f97316]'
          )}>
          {opt.label}
        </button>
      );
    })}
  </div>
);

// ─── Types ────────────────────────────────────────────────────────────────────


interface FormState {
  dispatch_number: string;
  dispatch_datetime: string;
  dispatch_type: string;
  priority: string;
  plant_line_name: string;
  contact_person: string;
  receiver_name: string;
  mobile_number: string;
  contact_for_delivery: string;
  delivery_address: string;
  part_name: string;
  part_number: string;
  part_version: string;
  batch_lot_number: string;
  serial_number: string;
  unit: string;
  quantity: string;
  total_dispatch_qty: string;
  qc_status: string;
  inspection_date: string;
  tested_by: string;
  inspector_name: string;
  approved_by: string;
  quality_remarks: string;
  transporter_name: string;
  vehicle_name: string;
  vehicle_number: string;
  driver_name: string; driver_contact: string;
  ton_count: string; load_weight: string;
  departure_date: string; company_name: string;
  dispatch_notes: string;
}

const emptyForm: FormState = {
  dispatch_number: '', dispatch_datetime: '', dispatch_type: 'Customer', priority: 'Normal',
  plant_line_name: '', contact_person: '', receiver_name: '',
  mobile_number: '', contact_for_delivery: '', delivery_address: '',
  part_name: '', part_number: '', part_version: '', batch_lot_number: '', serial_number: '',
  unit: 'Nos', quantity: '', total_dispatch_qty: '',
  qc_status: 'Approved', inspection_date: '', tested_by: '', inspector_name: '', approved_by: '', quality_remarks: '',
  transporter_name: '', vehicle_name: '', vehicle_number: '', driver_name: '', driver_contact: '',
  ton_count: '', load_weight: '', departure_date: '', company_name: '', dispatch_notes: '',
};

const SKDispatchPage: React.FC = () => {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ ...emptyForm });
  const [search, setSearch] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);

  const update = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }));
  
  const resetForm = () => {
    setForm({ ...emptyForm });
    setSelectedEntry(null);
  };

  const fetchQueue = () => {
    setLoading(true);
    skApi.getDispatchQueue()
      .then(r => setQueue(r.data?.data || []))
      .catch(() => toast.error('Failed to load dispatch queue'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchQueue(); }, []);

  const openNewDispatch = (entry?: any) => {
    resetForm();
    if (entry) {
      setSelectedEntry(entry);
      const d = entry.demand;
      setForm(f => ({
        ...f,
        company_name: d?.customer || '',
        part_name: d?.model_name || '',
        quantity: entry.parts?.reduce((s: number, p: any) => s + (p.demand_quantity || 0), 0)?.toString() || '',
        dispatch_datetime: new Date().toISOString().slice(0, 16)
      }));
    }
    setIsDrawerOpen(true);
  };

  const doSubmit = async (status: 'DRAFT' | 'DISPATCHED') => {
    if (!form.company_name.trim()) {
      toast.error('Customer / Company Name is required');
      return;
    }
    setSubmitting(true);
    try {
      const token = getToken();
      const payload = {
        ...form,
        status,
        demand_id: selectedEntry?.demand?.id,
        inventory_item_ids: selectedEntry?.parts?.map((p: any) => p.id) || []
      };
      
      const res = await fetch(`${API_BASE}/admin/dispatches`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(status === 'DRAFT' ? 'Draft saved!' : 'Dispatch submitted successfully!');
        setIsDrawerOpen(false);
        resetForm();
        fetchQueue();
      } else {
        toast.error(data.message || 'Failed to create dispatch');
      }
    } catch {
      toast.error('Failed to create dispatch');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredQueue = queue.filter(q =>
    !search || q.demand?.formatted_id?.toLowerCase().includes(search.toLowerCase()) ||
    q.demand?.model_name?.toLowerCase().includes(search.toLowerCase()) ||
    q.demand?.customer?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-2 bg-gray-50/50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-4 py-2 bg-white border-b border-slate-100">
        <div>
          <h1 className="text-[24px] font-black text-ind-text tracking-tight leading-none">
            Dispatch <span className="text-[#f97316]">Management</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Storekeeper Console</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-gray-50 rounded-2xl border border-slate-200 p-1 shadow-inner">
            <div className="px-4 py-1 text-center border-r border-slate-200 min-w-[80px]">
              <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">TOTAL</span>
              <span className="block text-lg font-black text-slate-800 leading-none">{queue.length}</span>
            </div>
            <div className="px-4 py-1 text-center text-orange-500 min-w-[80px]">
              <span className="block text-[8px] font-bold uppercase tracking-wider opacity-60">PENDING</span>
              <span className="block text-lg font-black leading-none">{queue.length}</span>
            </div>
          </div>
          <button onClick={() => openNewDispatch()} className="px-8 h-[44px] bg-[#f97316] text-white rounded-full text-[11px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-orange-600 hover:shadow-orange-500/40 transition-all flex items-center gap-2 active:scale-95">
            <Plus size={16} /> New Dispatch
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 px-2">
        <div className="relative flex-1 max-w-[400px]">
          <Search size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by Demand ID, Model or Customer..."
            className="w-full bg-white border border-ind-border/60 focus:border-[#f97316] rounded-full h-[42px] pl-12 pr-6 text-slate-700 font-bold text-[11px] tracking-wide placeholder:text-ind-text3/60 outline-none transition-all shadow-sm" />
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-full border border-slate-200 shadow-sm">
          <button className="px-5 h-[34px] rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white">All Queue</button>
          <button className="px-5 h-[34px] rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-gray-50">Urgent Only</button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[2.5rem] border border-ind-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-white border-b-2 border-orange-500">
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-900">Demand / Order</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-900">Customer</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-900 text-center">Status</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-900 text-center">Parts Ready</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-900 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="py-20 text-center"><Loader2 size={32} className="animate-spin text-orange-500 mx-auto" /></td></tr>
              ) : filteredQueue.length === 0 ? (
                <tr><td colSpan={5} className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest">No items ready for dispatch</td></tr>
              ) : filteredQueue.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => openNewDispatch(entry)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-sm">
                        <Truck size={20} strokeWidth={1.5} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[14px] font-black text-slate-900 tracking-tight leading-none uppercase">{entry.demand?.model_name}</span>
                        <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mt-1">{entry.demand?.formatted_id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-[12px] font-black text-slate-700 uppercase tracking-tight">{entry.demand?.customer}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Internal Order</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-black uppercase tracking-widest">Ready to Ship</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-[12px] font-black text-slate-900 tabular-nums">{entry.parts?.length || 0} Items</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-100 transition-all"><Info size={16} /></button>
                       <button className="px-5 h-[34px] bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#f97316] transition-all flex items-center gap-2 shadow-md hover:shadow-orange-500/20 active:scale-95">
                        Process <ArrowRight size={14} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer Overlay */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-[101] flex flex-col">

              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-lg">
                    <Truck size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Create Dispatch</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Official Record Submission</p>
                  </div>
                </div>
                <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={24} /></button>
              </div>

              {/* Drawer Body - One Unified Form (Top to Down) */}
              <div className="flex-1 overflow-y-auto bg-slate-50/30 custom-scrollbar p-6">
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                   <table className="w-full text-sm text-left border-collapse">
                      <tbody>
                        <SectionHeader label="1. Dispatch Information" icon={Globe} />
                        <TableRow label="Dispatch Number" required>
                          <TdInput value={form.dispatch_number} onChange={v => update('dispatch_number', v)} placeholder="DSP-XXXXX" />
                        </TableRow>
                        <TableRow label="Date & Time" required>
                          <TdInput type="datetime-local" value={form.dispatch_datetime} onChange={v => update('dispatch_datetime', v)} />
                        </TableRow>
                        <TableRow label="Dispatch Type">
                          <TdRadio value={form.dispatch_type} onChange={v => update('dispatch_type', v)}
                            options={[{ label: 'Internal', value: 'Internal' }, { label: 'Customer', value: 'Customer' }, { label: 'Vendor', value: 'Vendor' }]}
                            colorMap={{ Internal: 'bg-blue-600 text-white', Customer: 'bg-emerald-600 text-white', Vendor: 'bg-amber-600 text-white' }}
                          />
                        </TableRow>
                        <TableRow label="Priority">
                          <TdRadio value={form.priority} onChange={v => update('priority', v)}
                            options={[{ label: 'Normal', value: 'Normal' }, { label: 'Urgent', value: 'Urgent' }]}
                            colorMap={{ Normal: 'bg-blue-600 text-white', Urgent: 'bg-red-600 text-white' }}
                          />
                        </TableRow>

                        <SectionHeader label="2. Customer / Company Details" icon={Building2} />
                        <TableRow label="Company Name" required>
                          <TdInput value={form.company_name} onChange={v => update('company_name', v)} placeholder="Maruti, Tata, etc." />
                        </TableRow>
                        <TableRow label="Receiver Name" required>
                          <TdInput value={form.receiver_name} onChange={v => update('receiver_name', v)} placeholder="Name" />
                        </TableRow>
                        <TableRow label="Mobile Number" required>
                          <TdInput type="tel" value={form.mobile_number} onChange={v => update('mobile_number', v)} placeholder="+91 XXXX" />
                        </TableRow>
                        <TableRow label="Delivery Address" required>
                          <TdTextarea value={form.delivery_address} onChange={v => update('delivery_address', v)} placeholder="Full address..." />
                        </TableRow>

                        <SectionHeader label="3. Part & Quantity Details" icon={Package} />
                        <TableRow label="Part Name" required>
                          <TdInput value={form.part_name} onChange={v => update('part_name', v)} placeholder="e.g. Brake Assembly" />
                        </TableRow>
                        <TableRow label="Quantity" required>
                          <TdInput type="number" value={form.quantity} onChange={v => update('quantity', v)} placeholder="0" />
                        </TableRow>
                        <TableRow label="Unit">
                          <TdSelect value={form.unit} onChange={v => update('unit', v)}
                            options={[{ label: 'Nos', value: 'Nos' }, { label: 'Kg', value: 'Kg' }, { label: 'Set', value: 'Set' }]}
                          />
                        </TableRow>

                        <SectionHeader label="4. Quality & Logistics" icon={ShieldCheck} />
                        <TableRow label="QC Status">
                          <TdRadio value={form.qc_status} onChange={v => update('qc_status', v)}
                            options={[{ label: 'Approved', value: 'Approved' }, { label: 'Rejected', value: 'Rejected' }]}
                            colorMap={{ Approved: 'bg-emerald-600 text-white', Rejected: 'bg-red-600 text-white' }}
                          />
                        </TableRow>
                        <TableRow label="Vehicle Number">
                          <TdInput value={form.vehicle_number} onChange={v => update('vehicle_number', v)} placeholder="MH-XX-XX-XXXX" />
                        </TableRow>
                        <TableRow label="Driver Name">
                          <TdInput value={form.driver_name} onChange={v => update('driver_name', v)} placeholder="Driver Name" />
                        </TableRow>
                        <TableRow label="Remarks">
                          <TdTextarea value={form.dispatch_notes} onChange={v => update('dispatch_notes', v)} placeholder="Additional notes..." />
                        </TableRow>
                      </tbody>
                   </table>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-6 bg-white border-t border-slate-100 flex items-center justify-between shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
                <button onClick={() => setIsDrawerOpen(false)} className="px-6 h-[44px] bg-slate-50 text-slate-500 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Cancel</button>
                <div className="flex gap-2">
                  <button onClick={() => doSubmit('DRAFT')} disabled={submitting}
                    className="px-6 h-[44px] bg-white border border-slate-200 text-slate-600 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2">
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <ClipboardList size={16} />} Save Draft
                  </button>
                  <button onClick={() => doSubmit('DISPATCHED')} disabled={submitting}
                    className="px-10 h-[44px] bg-[#f97316] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-orange-700 transition-all flex items-center gap-2 active:scale-95">
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Submit Dispatch
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SKDispatchPage;