import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getToken } from '../../lib/storage';
import { API_BASE } from '../../lib/apiConfig';
import toast from 'react-hot-toast';
import {
  Truck, Loader2, Building2, Package,
  ShieldCheck, Globe,
  Send, X, Search, ClipboardList, Save, Calendar
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { skApi } from '../../api/newRolesApi';

const TableRow = ({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode;
}) => (
  <tr className="bg-white">
    <td className="w-[36%] bg-ind-bg/50 px-6 py-4 align-middle border-b border-slate-100">
      <span className="text-[10px] font-black uppercase tracking-[0.08em] text-black">
        {label} {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
    </td>
    <td className="px-6 py-3 border-b border-slate-100 bg-white">{children}</td>
  </tr>
);

const SectionHeader = ({ label, icon: Icon }: { label: string; icon: any }) => (
  <tr className="bg-ind-bg/50">
    <td colSpan={2} className="px-6 py-4 border-b border-slate-100">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-orange-50 flex items-center justify-center">
          <Icon size={14} className="text-[#f97316]" />
        </div>
        <span className="text-[11px] font-black text-black uppercase tracking-widest">{label}</span>
      </div>
    </td>
  </tr>
);

const TdInput = ({ value, onChange, placeholder, type = 'text', min, onKeyDown, inputRef }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; min?: string; onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRef?: React.Ref<HTMLInputElement>;
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (type === 'number') {
      val = val.replace(/[^0-9]/g, '');
    }
    onChange(val);
  };

  return (
    <input ref={inputRef} type={type === 'number' ? 'text' : type} value={value} onChange={handleChange}
      placeholder={placeholder} min={min} onKeyDown={onKeyDown}
      className="w-full h-[42px] bg-white border border-slate-200 rounded-xl px-4 text-[13px] font-black text-slate-700 outline-none transition-all focus:ring-2 focus:ring-[#f97316]/30 focus:border-[#f97316] placeholder:text-slate-300 placeholder:font-bold" />
  );
};

const TdTextarea = ({ value, onChange, placeholder, onKeyDown }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}) => (
  <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
    placeholder={placeholder} onKeyDown={onKeyDown}
    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-black text-slate-700 outline-none transition-all focus:ring-2 focus:ring-[#f97316]/30 focus:border-[#f97316] placeholder:text-slate-300 placeholder:font-bold resize-none" />
);

const TdSelect = ({ value, onChange, options, onKeyDown }: {
  value: string; onChange: (v: string) => void;
  options: { label: string; value: string }[];
  onKeyDown?: (e: React.KeyboardEvent<HTMLSelectElement>) => void;
}) => (
  <select value={value} onChange={e => onChange(e.target.value)} onKeyDown={onKeyDown}
    className="w-full h-[42px] bg-white border border-slate-200 rounded-xl px-4 text-[13px] font-black text-slate-700 outline-none transition-all focus:ring-2 focus:ring-[#f97316]/30 focus:border-[#f97316] appearance-none cursor-pointer">
    {options.map(o => <option key={o.value} value={o.value} className="font-bold">{o.label}</option>)}
  </select>
);

const TdRadio = ({ value, onChange, options, colorMap }: {
  value: string; onChange: (v: string) => void;
  options: { label: string; value: string }[];
  colorMap: Record<string, string>;
}) => (
  <div className="flex gap-3 flex-wrap py-1">
    {options.map(opt => {
      const active = value === opt.value;
      return (
        <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
          className={cn(
            "px-5 h-[36px] rounded-full text-[11px] font-black uppercase tracking-widest border transition-all",
            active
              ? `${colorMap[opt.value] || 'bg-gray-800 text-white'} border-transparent shadow-sm`
              : 'bg-white border-slate-200 text-slate-500 hover:border-[#f97316]'
          )}>
          {opt.label}
        </button>
      );
    })}
  </div>
);

interface FormState {
  // 1. Dispatch Info
  dispatch_number: string;
  dispatch_datetime: string;
  dispatch_type: string;
  priority: string;
  demand_id: string;

  // 2. Customer Details
  company_name: string;
  receiver_name: string;
  mobile_number: string;
  delivery_address: string;

  // 3. Vehicle / Part
  vehicle_model: string;
  sap_part_number: string;
  part_name: string;
  demand_qty: string;
  available_stock: string;
  dispatch_qty: string;

  // 4. QC
  qc_status: string;

  // 5. Transport
  vehicle_name: string;
  vehicle_number: string;
  driver_name: string;
  driver_contact: string;
  dispatch_notes: string;

  // 6. Approval
  prepared_by: string;
  store_approval: string;
  qc_approval: string;
  dispatch_approval: string;
}

const emptyForm: FormState = {
  dispatch_number: '', dispatch_datetime: '', dispatch_type: 'Customer', priority: 'Normal', demand_id: '',
  company_name: '', receiver_name: '', mobile_number: '', delivery_address: '',
  vehicle_model: '', sap_part_number: '', part_name: '', demand_qty: '', available_stock: '', dispatch_qty: '',
  qc_status: 'Approved',
  vehicle_name: '', vehicle_number: '', driver_name: '', driver_contact: '', dispatch_notes: '',
  prepared_by: '', store_approval: '', qc_approval: '', dispatch_approval: ''
};

const SKDispatchPage: React.FC = () => {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ ...emptyForm });
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
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
        vehicle_model: d?.model_name || '',
        demand_id: d?.formatted_id || d?.id?.toString() || '',
        demand_qty: entry.parts?.reduce((s: number, p: any) => s + (p.demand_quantity || 0), 0)?.toString() || '',
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

  const filteredQueue = queue.filter(q => {
    const matchesSearch = !search ||
      q.demand?.formatted_id?.toLowerCase().includes(search.toLowerCase()) ||
      q.demand?.model_name?.toLowerCase().includes(search.toLowerCase()) ||
      q.demand?.customer?.toLowerCase().includes(search.toLowerCase());
    const matchesDate = !filterDate || (q.demand?.start_date === filterDate || q.created_at?.startsWith(filterDate));
    return matchesSearch && matchesDate;
  });

  return (
    <div className="max-w-[1800px] mx-auto bg-ind-bg/30 h-[calc(100vh-108px)] flex flex-col overflow-hidden">
      {/* Page Header and Controls */}
      <div className="bg-white border-t border-ind-border/60 transition-all pb-2">
        <div>
          {/* Header Row: Title & Stats */}
          <div className="flex xl:flex-row xl:items-center justify-between gap-4 bg-white border-b border-slate-100 mb-2 py-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-2">
              <div className="space-y-1">
                <h1 className="text-[24px] font-black text-ind-text tracking-tight leading-none">
                  Dispatch <span className="text-[#f37021]">Queue</span>
                </h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">STOREKEEPER CONSOLE</p>
              </div>
            </div>
            {/* Stats Box - Compact & Premium */}
            <div className="flex items-center bg-white backdrop-blur-md rounded-2xl border border-ind-border/50 p-1 shadow-sm overflow-hidden scale-90 origin-right mx-2">
              <div className="px-4 py-1 text-center border-r border-ind-border/50">
                <span className="block text-[8px] font-bold text-ind-text3 uppercase tracking-wider">TOTAL</span>
                <span className="block text-lg font-black text-slate-800 leading-none">{queue.length}</span>
              </div>
              <div className="px-4 py-1 text-center text-[#f37021]">
                <span className="block text-[8px] font-bold uppercase tracking-wider opacity-60">PENDING</span>
                <span className="block text-lg font-black leading-none">{queue.length}</span>
              </div>
            </div>
          </div>

          {/* Controls Row: Single Line on Desktop */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-2 px-2">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative group w-full md:w-[400px]">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-ind-text3 group-focus-within:text-[#f37021] transition-colors" size={14} />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by ID, Part or Customer..."
                  className="w-full bg-white border border-ind-border/60 focus:border-[#f37021] rounded-full h-[42px] pl-14 pr-6 text-slate-700 font-bold text-[11px] tracking-wide placeholder:text-ind-text3/60 outline-none transition-all shadow-sm" />
              </div>

              {/* Date Filter */}
              <div className="relative group flex-shrink-0 hidden md:block">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1 bg-orange-50/50 rounded text-orange-400 group-focus-within:text-[#f37021] transition-colors pointer-events-none">
                  <Calendar size={12} />
                </div>
                <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                  className="bg-white border border-ind-border/60 focus:border-[#f37021] rounded-full h-[42px] pl-12 pr-5 text-slate-700 font-bold text-[11px] tracking-wide outline-none transition-all shadow-sm w-[180px]" />
                {filterDate && (
                  <button onClick={() => setFilterDate('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-500 font-black text-[9px] bg-white px-1 hover:underline">
                    CLEAR
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 min-h-0 px-2 py-2">
        <div className="overflow-x-auto rounded-2xl border border-ind-border/50 shadow-sm h-full overflow-y-auto bg-white">
          <table className="min-w-full bg-white text-sm">
            {/* Header */}
            <thead className="bg-ind-bg text-black border-b-2 border-[#f37021] uppercase text-[11px] tracking-wider sticky top-0 z-[50]">
              <tr>
                <th className="px-6 py-2 text-left font-black whitespace-nowrap sticky top-0 bg-ind-bg z-10">DEMAND ID</th>
                <th className="px-6 py-2 text-left font-black whitespace-nowrap sticky top-0 bg-ind-bg z-10">MODEL NAME</th>
                <th className="px-6 py-2 text-left font-black whitespace-nowrap sticky top-0 bg-ind-bg z-10">CUSTOMER NAME</th>
                <th className="px-6 py-2 text-center font-black whitespace-nowrap sticky top-0 bg-ind-bg z-10">QTY</th>
                <th className="px-6 py-2 text-left font-black whitespace-nowrap sticky top-0 bg-ind-bg z-10">DISPATCH DATE</th>
                <th className="px-6 py-2 text-center font-black whitespace-nowrap sticky top-0 bg-ind-bg z-10">STATUS</th>
                <th className="px-6 py-2 text-right font-black whitespace-nowrap sticky top-0 bg-ind-bg z-10">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ind-border/40">
              {loading ? (
                <tr><td colSpan={7} className="py-20 text-center"><Loader2 size={32} className="animate-spin text-orange-500 mx-auto" /></td></tr>
              ) : filteredQueue.length === 0 ? (
                <>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-2">
                      <span className="font-mono text-[10px] font-black text-slate-300">—</span>
                    </td>
                    <td className="px-6 py-2 text-[11px] font-bold text-slate-300">—</td>
                    <td className="px-6 py-2 text-[11px] font-bold text-slate-300">—</td>
                    <td className="px-6 py-2 text-center text-[12px] font-black text-slate-300">—</td>
                    <td className="px-6 py-2 text-[10px] font-bold text-slate-300">—</td>
                    <td className="px-6 py-2 text-center">
                      <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">—</span>
                    </td>
                    <td className="px-6 py-2 text-right">
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
                        <td className="px-6 py-2">
                          <span className="font-mono text-[10px] font-black text-[#f97316] bg-orange-50 px-3 py-1 rounded-full border border-orange-100">{entry.demand?.formatted_id}</span>
                        </td>
                        <td className="px-6 py-2 text-[11px] font-bold text-slate-800">{entry.demand?.model_name || '—'}</td>
                        <td className="px-6 py-2 text-[11px] font-bold text-slate-800">{entry.demand?.customer || '—'}</td>
                        <td className="px-6 py-2 text-center text-[12px] font-black text-slate-800">{qty.toLocaleString()}</td>
                        <td className="px-6 py-2 text-[10px] font-bold text-slate-500">{entry.dispatch_date ? new Date(entry.dispatch_date).toLocaleDateString() : '—'}</td>
                        <td className="px-6 py-2 text-center">
                          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-black uppercase tracking-widest">Ready</span>
                        </td>
                        <td className="px-6 py-2 text-right">
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
              <div className="flex-1 overflow-y-auto bg-ind-bg/30 custom-scrollbar p-6">
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                  <table className="w-full text-sm text-left border-collapse">
                    <tbody>

                      <SectionHeader label="1. Dispatch Info" icon={Globe} />
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
                      <TableRow label="Demand ID">
                        <TdInput value={form.demand_id} onChange={v => update('demand_id', v)} placeholder="DEM-XXXX" onKeyDown={handleEnterKey(2)} inputRef={registerRef(2)} />
                      </TableRow>

                      <SectionHeader label="2. Customer Details" icon={Building2} />
                      <TableRow label="Company Name" required>
                        <TdInput value={form.company_name} onChange={v => update('company_name', v)} placeholder="Company name" onKeyDown={handleEnterKey(3)} inputRef={registerRef(3)} />
                      </TableRow>
                      <TableRow label="Receiver Name">
                        <TdInput value={form.receiver_name} onChange={v => update('receiver_name', v)} placeholder="Receiver name" onKeyDown={handleEnterKey(4)} inputRef={registerRef(4)} />
                      </TableRow>
                      <TableRow label="Mobile Number">
                        <TdInput type="number" value={form.mobile_number} onChange={v => update('mobile_number', v)} placeholder="Mobile Number" onKeyDown={handleEnterKey(5)} inputRef={registerRef(5)} />
                      </TableRow>
                      <TableRow label="Delivery Address">
                        <TdTextarea value={form.delivery_address} onChange={v => update('delivery_address', v)} placeholder="Full address..." onKeyDown={handleEnterKey(6)} />
                      </TableRow>

                      <SectionHeader label="3. Vehicle / Part" icon={Package} />
                      <TableRow label="Vehicle Model">
                        <TdInput value={form.vehicle_model} onChange={v => update('vehicle_model', v)} placeholder="Vehicle Model" onKeyDown={handleEnterKey(7)} inputRef={registerRef(7)} />
                      </TableRow>
                      <TableRow label="SAP Part Number">
                        <TdInput value={form.sap_part_number} onChange={v => update('sap_part_number', v)} placeholder="SAP Part Number" onKeyDown={handleEnterKey(8)} inputRef={registerRef(8)} />
                      </TableRow>
                      <TableRow label="Part Name">
                        <TdInput value={form.part_name} onChange={v => update('part_name', v)} placeholder="Part Name" onKeyDown={handleEnterKey(9)} inputRef={registerRef(9)} />
                      </TableRow>
                      <TableRow label="Demand Qty">
                        <TdInput type="number" value={form.demand_qty} onChange={v => update('demand_qty', v)} placeholder="0" onKeyDown={handleEnterKey(10)} inputRef={registerRef(10)} />
                      </TableRow>
                      <TableRow label="Available Stock">
                        <TdInput type="number" value={form.available_stock} onChange={v => update('available_stock', v)} placeholder="0" onKeyDown={handleEnterKey(11)} inputRef={registerRef(11)} />
                      </TableRow>
                      <TableRow label="Dispatch Qty">
                        <TdInput type="number" value={form.dispatch_qty} onChange={v => update('dispatch_qty', v)} placeholder="0" onKeyDown={handleEnterKey(12)} inputRef={registerRef(12)} />
                      </TableRow>

                      <SectionHeader label="4. QC" icon={ShieldCheck} />
                      <TableRow label="QC Status">
                        <TdRadio value={form.qc_status} onChange={v => update('qc_status', v)}
                          options={[{ label: 'Approved', value: 'Approved' }, { label: 'Rejected', value: 'Rejected' }]}
                          colorMap={{ Approved: 'bg-emerald-600 text-white', Rejected: 'bg-red-600 text-white' }}
                        />
                      </TableRow>

                      <SectionHeader label="5. Transport" icon={Truck} />
                      <TableRow label="Vehicle Name" required>
                        <TdInput value={form.vehicle_name} onChange={v => update('vehicle_name', v)} placeholder="Vehicle Name" onKeyDown={handleEnterKey(13)} inputRef={registerRef(13)} />
                      </TableRow>
                      <TableRow label="Vehicle Number">
                        <TdInput value={form.vehicle_number} onChange={v => update('vehicle_number', v)} placeholder="Vehicle Number" onKeyDown={handleEnterKey(14)} inputRef={registerRef(14)} />
                      </TableRow>
                      <TableRow label="Driver Name" required>
                        <TdInput value={form.driver_name} onChange={v => update('driver_name', v)} placeholder="Driver Name" onKeyDown={handleEnterKey(15)} inputRef={registerRef(15)} />
                      </TableRow>
                      <TableRow label="Driver Contact">
                        <TdInput value={form.driver_contact} onChange={v => update('driver_contact', v)} placeholder="Driver Contact" onKeyDown={handleEnterKey(16)} inputRef={registerRef(16)} />
                      </TableRow>
                      <TableRow label="Dispatch Notes">
                        <TdTextarea value={form.dispatch_notes} onChange={v => update('dispatch_notes', v)} placeholder="Dispatch Notes" onKeyDown={handleEnterKey(17)} />
                      </TableRow>

                      <SectionHeader label="6. Approval" icon={ClipboardList} />
                      <TableRow label="Prepared By">
                        <TdInput value={form.prepared_by} onChange={v => update('prepared_by', v)} placeholder="Prepared By" onKeyDown={handleEnterKey(18)} inputRef={registerRef(18)} />
                      </TableRow>
                      <TableRow label="Store Approval">
                        <TdInput value={form.store_approval} onChange={v => update('store_approval', v)} placeholder="Store Approval" onKeyDown={handleEnterKey(19)} inputRef={registerRef(19)} />
                      </TableRow>
                      <TableRow label="QC Approval">
                        <TdInput value={form.qc_approval} onChange={v => update('qc_approval', v)} placeholder="QC Approval" onKeyDown={handleEnterKey(20)} inputRef={registerRef(20)} />
                      </TableRow>
                      <TableRow label="Dispatch Approval">
                        <TdInput value={form.dispatch_approval} onChange={v => update('dispatch_approval', v)} placeholder="Dispatch Approval" onKeyDown={handleEnterKey(21)} inputRef={registerRef(21)} />
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