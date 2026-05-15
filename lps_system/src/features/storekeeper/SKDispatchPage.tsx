import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getToken } from '../../lib/storage';
import { API_BASE } from '../../lib/apiConfig';
import toast from 'react-hot-toast';
import {
  Truck, Loader2, Building2, Package,
  ShieldCheck, Globe,
  Send, X, Search, ClipboardList, Save
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { skApi } from '../../api/newRolesApi';

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

const TdInput = ({ value, onChange, placeholder, type = 'text', min, onKeyDown, inputRef }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; min?: string; onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRef?: React.Ref<HTMLInputElement>;
}) => (
  <input ref={inputRef} type={type} value={value} onChange={e => onChange(e.target.value)}
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
  driver_name: string;
  driver_contact: string;
  ton_count: string;
  load_weight: string;
  departure_date: string;
  company_name: string;
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

  const refs = useRef<(HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null)[]>([]);

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

  const handleEnterKey = (idx: number) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const next = refs.current[idx + 1];
      if (next) next.focus();
    }
  };

  const registerRef = (idx: number) => (el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null) => {
    refs.current[idx] = el;
  };

  const doSubmit = async (status: 'DRAFT' | 'DISPATCHED') => {
    if (!form.company_name.trim()) {
      toast.error('Customer / Company Name is required');
      return;
    }
    if (!form.vehicle_name.trim()) {
      toast.error('Vehicle Name is required');
      return;
    }
    if (!form.driver_name.trim()) {
      toast.error('Driver Name is required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        status,
        demand_id: selectedEntry?.demand?.id,
        inventory_item_ids: selectedEntry?.parts?.map((p: any) => p.id) || [],
        quantity_dispatched: selectedEntry?.parts?.reduce((s: number, p: any) => s + (p.demand_quantity || 0), 0) || 0,
      };
      const res = await skApi.createDispatch(payload);
      if (res.data.success) {
        toast.success(status === 'DRAFT' ? 'Draft saved!' : 'Dispatch submitted successfully!');
        setIsDrawerOpen(false);
        resetForm();
        fetchQueue();
      } else {
        toast.error(res.data.message || 'Failed to create dispatch');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to create dispatch');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredQueue = queue.filter(q =>
    !search ||
    q.demand?.formatted_id?.toLowerCase().includes(search.toLowerCase()) ||
    q.demand?.model_name?.toLowerCase().includes(search.toLowerCase()) ||
    q.demand?.customer?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-2 bg-gray-50/50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-4 py-2 bg-white border-b border-slate-100">
        <div>
          <h1 className="text-[24px] font-black text-ind-text tracking-tight leading-none">
            Dispatch <span className="text-[#f97316]">Queue</span>
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
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-4 px-2">
        <div className="relative flex-1 max-w-[400px]">
          <Search size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by ID, Part or Customer..."
            className="w-full bg-white border border-ind-border/60 focus:border-[#f97316] rounded-full h-[42px] pl-12 pr-6 text-slate-700 font-bold text-[11px] tracking-wide placeholder:text-ind-text3/60 outline-none transition-all shadow-sm" />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[2.5rem] border border-ind-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-white border-b-2 border-orange-500">
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-900">ID</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-900">Vehicle</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-900">Driver</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-900">Company</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-900">Part</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-900 text-center">Qty</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-900">Challan</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-900">Date</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-900">By</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-900 text-center">Status</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-900 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={11} className="py-20 text-center"><Loader2 size={32} className="animate-spin text-orange-500 mx-auto" /></td></tr>
              ) : filteredQueue.length === 0 ? (
                <>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4">
                      <span className="font-mono text-[10px] font-black text-slate-300">—</span>
                    </td>
                    <td className="px-4 py-4 text-[11px] font-bold text-slate-300">—</td>
                    <td className="px-4 py-4 text-[11px] font-bold text-slate-300">—</td>
                    <td className="px-4 py-4 text-[11px] font-bold text-slate-300">—</td>
                    <td className="px-4 py-4 text-[11px] font-medium text-slate-300">—</td>
                    <td className="px-4 py-4 text-center text-[12px] font-black text-slate-300">—</td>
                    <td className="px-4 py-4 text-[10px] font-bold text-slate-300">—</td>
                    <td className="px-4 py-4 text-[10px] font-bold text-slate-300">—</td>
                    <td className="px-4 py-4 text-[10px] font-bold text-slate-300">—</td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">—</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button onClick={() => openNewDispatch()}
                        className="w-9 h-9 bg-[#f97316] text-white rounded-xl shadow-md shadow-orange-500/20 hover:bg-orange-600 transition-all flex items-center justify-center active:scale-95 ml-auto">
                        <Send size={16} />
                      </button>
                    </td>
                  </tr>
                </>
              ) : (
                <>
                  {filteredQueue.map((entry) => {
                    const qty = entry.parts?.reduce((s: number, p: any) => s + (p.demand_quantity || 0), 0) || 0;
                    return (
                      <tr key={entry.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-4 py-4">
                          <span className="font-mono text-[10px] font-black text-[#f97316] bg-orange-50 px-3 py-1 rounded-full border border-orange-100">{entry.demand?.formatted_id}</span>
                        </td>
                        <td className="px-4 py-4 text-[11px] font-bold text-slate-600">—</td>
                        <td className="px-4 py-4 text-[11px] font-bold text-slate-600">—</td>
                        <td className="px-4 py-4 text-[11px] font-bold text-slate-800">{entry.demand?.customer || '—'}</td>
                        <td className="px-4 py-4 text-[11px] font-medium text-slate-600">{entry.demand?.model_name || '—'}</td>
                        <td className="px-4 py-4 text-center text-[12px] font-black text-slate-800">{qty.toLocaleString()}</td>
                        <td className="px-4 py-4 text-[10px] font-bold text-slate-500">—</td>
                        <td className="px-4 py-4 text-[10px] font-bold text-slate-500">—</td>
                        <td className="px-4 py-4 text-[10px] font-bold text-slate-500">—</td>
                        <td className="px-4 py-4 text-center">
                          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-black uppercase tracking-widest">Ready</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button onClick={() => openNewDispatch(entry)}
                            className="w-9 h-9 bg-[#f97316] text-white rounded-xl shadow-md shadow-orange-500/20 hover:bg-orange-600 transition-all flex items-center justify-center active:scale-95 ml-auto">
                            <Send size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer Overlay */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsDrawerOpen(false); resetForm(); }}
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
                <button onClick={() => { setIsDrawerOpen(false); resetForm(); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={24} /></button>
              </div>

              {/* Drawer Body — 5-Section Form */}
              <div className="flex-1 overflow-y-auto bg-slate-50/30 custom-scrollbar p-6">
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                  <table className="w-full text-sm text-left border-collapse">
                    <tbody>

                      <SectionHeader label="1. Dispatch Information" icon={Globe} />
                      <TableRow label="Dispatch Number" required>
                        <TdInput value={form.dispatch_number} onChange={v => update('dispatch_number', v)} placeholder="DSP-XXXXX" onKeyDown={handleEnterKey(0)} inputRef={registerRef(0)} />
                      </TableRow>
                      <TableRow label="Date & Time" required>
                        <TdInput type="datetime-local" value={form.dispatch_datetime} onChange={v => update('dispatch_datetime', v)} onKeyDown={handleEnterKey(1)} inputRef={registerRef(1)} />
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

                      <SectionHeader label="2. Customer / Receiver Details" icon={Building2} />
                      <TableRow label="Company Name" required>
                        <TdInput value={form.company_name} onChange={v => update('company_name', v)} placeholder="Maruti, Tata, etc." onKeyDown={handleEnterKey(2)} inputRef={registerRef(2)} />
                      </TableRow>
                      <TableRow label="Plant / Line Name">
                        <TdInput value={form.plant_line_name} onChange={v => update('plant_line_name', v)} placeholder="Plant A, Line 3" onKeyDown={handleEnterKey(3)} inputRef={registerRef(3)} />
                      </TableRow>
                      <TableRow label="Contact Person">
                        <TdInput value={form.contact_person} onChange={v => update('contact_person', v)} placeholder="Contact person name" onKeyDown={handleEnterKey(4)} inputRef={registerRef(4)} />
                      </TableRow>
                      <TableRow label="Receiver Name" required>
                        <TdInput value={form.receiver_name} onChange={v => update('receiver_name', v)} placeholder="Receiver name" onKeyDown={handleEnterKey(5)} inputRef={registerRef(5)} />
                      </TableRow>
                      <TableRow label="Mobile Number" required>
                        <TdInput type="tel" value={form.mobile_number} onChange={v => update('mobile_number', v)} placeholder="+91 XXXX" onKeyDown={handleEnterKey(6)} inputRef={registerRef(6)} />
                      </TableRow>
                      <TableRow label="Contact for Delivery">
                        <TdInput value={form.contact_for_delivery} onChange={v => update('contact_for_delivery', v)} placeholder="Alternate contact" onKeyDown={handleEnterKey(7)} inputRef={registerRef(7)} />
                      </TableRow>
                      <TableRow label="Delivery Address" required>
                        <TdTextarea value={form.delivery_address} onChange={v => update('delivery_address', v)} placeholder="Full address..." onKeyDown={handleEnterKey(8)} />
                      </TableRow>

                      <SectionHeader label="3. Part Details" icon={Package} />
                      <TableRow label="Part Name" required>
                        <TdInput value={form.part_name} onChange={v => update('part_name', v)} placeholder="e.g. Brake Assembly" onKeyDown={handleEnterKey(9)} inputRef={registerRef(9)} />
                      </TableRow>
                      <TableRow label="Part Number">
                        <TdInput value={form.part_number} onChange={v => update('part_number', v)} placeholder="PN-XXXX" onKeyDown={handleEnterKey(10)} inputRef={registerRef(10)} />
                      </TableRow>
                      <TableRow label="Part Version">
                        <TdInput value={form.part_version} onChange={v => update('part_version', v)} placeholder="v1.0" onKeyDown={handleEnterKey(11)} inputRef={registerRef(11)} />
                      </TableRow>
                      <TableRow label="Batch / Lot Number">
                        <TdInput value={form.batch_lot_number} onChange={v => update('batch_lot_number', v)} placeholder="BATCH-001" onKeyDown={handleEnterKey(12)} inputRef={registerRef(12)} />
                      </TableRow>
                      <TableRow label="Serial Number">
                        <TdInput value={form.serial_number} onChange={v => update('serial_number', v)} placeholder="SN-XXXX" onKeyDown={handleEnterKey(13)} inputRef={registerRef(13)} />
                      </TableRow>
                      <TableRow label="Unit">
                        <TdSelect value={form.unit} onChange={v => update('unit', v)}
                          options={[{ label: 'Nos', value: 'Nos' }, { label: 'Kg', value: 'Kg' }, { label: 'Set', value: 'Set' }]}
                          onKeyDown={handleEnterKey(14)}
                        />
                      </TableRow>
                      <TableRow label="Quantity" required>
                        <TdInput type="number" value={form.quantity} onChange={v => update('quantity', v)} placeholder="0" onKeyDown={handleEnterKey(15)} inputRef={registerRef(15)} />
                      </TableRow>
                      <TableRow label="Total Dispatch Qty">
                        <TdInput type="number" value={form.total_dispatch_qty} onChange={v => update('total_dispatch_qty', v)} placeholder="0" onKeyDown={handleEnterKey(16)} inputRef={registerRef(16)} />
                      </TableRow>

                      <SectionHeader label="4. Quality / Inspection Details" icon={ShieldCheck} />
                      <TableRow label="QC Status">
                        <TdRadio value={form.qc_status} onChange={v => update('qc_status', v)}
                          options={[{ label: 'Approved', value: 'Approved' }, { label: 'Rejected', value: 'Rejected' }]}
                          colorMap={{ Approved: 'bg-emerald-600 text-white', Rejected: 'bg-red-600 text-white' }}
                        />
                      </TableRow>
                      <TableRow label="Inspection Date">
                        <TdInput type="date" value={form.inspection_date} onChange={v => update('inspection_date', v)} onKeyDown={handleEnterKey(17)} inputRef={registerRef(17)} />
                      </TableRow>
                      <TableRow label="Tested By">
                        <TdInput value={form.tested_by} onChange={v => update('tested_by', v)} placeholder="Tester name" onKeyDown={handleEnterKey(18)} inputRef={registerRef(18)} />
                      </TableRow>
                      <TableRow label="Inspector Name">
                        <TdInput value={form.inspector_name} onChange={v => update('inspector_name', v)} placeholder="Inspector name" onKeyDown={handleEnterKey(19)} inputRef={registerRef(19)} />
                      </TableRow>
                      <TableRow label="Approved By">
                        <TdInput value={form.approved_by} onChange={v => update('approved_by', v)} placeholder="Approver name" onKeyDown={handleEnterKey(20)} inputRef={registerRef(20)} />
                      </TableRow>
                      <TableRow label="Quality Remarks">
                        <TdTextarea value={form.quality_remarks} onChange={v => update('quality_remarks', v)} placeholder="Quality notes..." onKeyDown={handleEnterKey(21)} />
                      </TableRow>

                      <SectionHeader label="5. Logistics / Transport Details" icon={Truck} />
                      <TableRow label="Transporter Name">
                        <TdInput value={form.transporter_name} onChange={v => update('transporter_name', v)} placeholder="Transporter" onKeyDown={handleEnterKey(22)} inputRef={registerRef(22)} />
                      </TableRow>
                      <TableRow label="Vehicle Name" required>
                        <TdInput value={form.vehicle_name} onChange={v => update('vehicle_name', v)} placeholder="e.g. Tata Truck" onKeyDown={handleEnterKey(23)} inputRef={registerRef(23)} />
                      </TableRow>
                      <TableRow label="Vehicle Number">
                        <TdInput value={form.vehicle_number} onChange={v => update('vehicle_number', v)} placeholder="MH-XX-XX-XXXX" onKeyDown={handleEnterKey(24)} inputRef={registerRef(24)} />
                      </TableRow>
                      <TableRow label="Driver Name">
                        <TdInput value={form.driver_name} onChange={v => update('driver_name', v)} placeholder="Driver name" onKeyDown={handleEnterKey(25)} inputRef={registerRef(25)} />
                      </TableRow>
                      <TableRow label="Driver Contact">
                        <TdInput value={form.driver_contact} onChange={v => update('driver_contact', v)} placeholder="Driver phone" onKeyDown={handleEnterKey(26)} inputRef={registerRef(26)} />
                      </TableRow>
                      <TableRow label="Ton Capacity">
                        <TdInput type="number" value={form.ton_count} onChange={v => update('ton_count', v)} placeholder="0" onKeyDown={handleEnterKey(27)} inputRef={registerRef(27)} />
                      </TableRow>
                      <TableRow label="Load Weight">
                        <TdInput type="number" value={form.load_weight} onChange={v => update('load_weight', v)} placeholder="0 kg" onKeyDown={handleEnterKey(28)} inputRef={registerRef(28)} />
                      </TableRow>
                      <TableRow label="Departure Date">
                        <TdInput type="date" value={form.departure_date} onChange={v => update('departure_date', v)} onKeyDown={handleEnterKey(29)} inputRef={registerRef(29)} />
                      </TableRow>
                      <TableRow label="Dispatch Notes">
                        <TdTextarea value={form.dispatch_notes} onChange={v => update('dispatch_notes', v)} placeholder="Additional notes..." onKeyDown={handleEnterKey(30)} />
                      </TableRow>

                    </tbody>
                  </table>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-6 bg-white border-t border-slate-100 flex items-center justify-between shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
                <button onClick={() => { setIsDrawerOpen(false); resetForm(); }} className="px-6 h-[44px] bg-slate-50 text-slate-500 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Cancel</button>
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