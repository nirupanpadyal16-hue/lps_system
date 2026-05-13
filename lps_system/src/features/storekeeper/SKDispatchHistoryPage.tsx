import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { skApi } from '../../api/newRolesApi';
import toast from 'react-hot-toast';
import { History, RefreshCw, Printer, Download, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import logoLps from '../../assets/logo_lps.png';

const SKDispatchHistoryPage: React.FC = () => {
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await skApi.getDispatches();
      setDispatches(res.data?.data || []);
    } catch {
      toast.error('Failed to load dispatch history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const filteredHistory = dispatches.filter(d =>
    !search || d.formatted_id?.toLowerCase().includes(search.toLowerCase()) ||
    d.vehicle_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.driver_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.part_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handlePrint = (d: any) => {
    const w = window.open('', '_blank');
    if (!w) { toast.error('Please allow pop-ups for printing'); return; }

    w.document.write(`<!DOCTYPE html>
<html><head><title>Dispatch - ${d.formatted_id}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;padding:48px;max-width:800px;margin:auto;color:#1a1a2e}
.letterhead{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px double #1a1a2e;padding-bottom:20px;margin-bottom:24px}
.letterhead .lh-left{width:160px}
.letterhead .lh-left img{width:140px;height:auto;display:block}
.letterhead .lh-right{text-align:right;max-width:400px}
.letterhead .lh-right .company-name{font-size:14px;font-weight:800;color:#1a1a2e;text-transform:uppercase;letter-spacing:1px;line-height:1.3}
.letterhead .lh-right .address{font-size:10px;color:#555;line-height:1.5;margin-top:4px}
.print-date{text-align:right;font-size:10px;color:#999;margin-bottom:12px}
.id-badge{display:inline-block;background:#1a1a2e;color:#fff;padding:6px 20px;font-size:15px;font-weight:700;letter-spacing:1px;margin-bottom:20px}
.sec-title{font-size:13px;font-weight:700;color:#1a1a2e;background:#f0f0f0;padding:8px 14px;margin:24px 0 12px 0;text-transform:uppercase;letter-spacing:1px;border-left:4px solid #f97316}
table{width:100%;border-collapse:collapse;margin:8px 0}
td,th{padding:10px 14px;text-align:left;border:1px solid #d0d0d0;font-size:13px}
th{background:#f5f5f5;font-weight:600;width:32%;color:#333}
td{color:#1a1a2e}
.ftr{margin-top:40px;text-align:center;color:#aaa;font-size:11px;border-top:1px solid #eee;padding-top:15px}
.s-b{display:inline-block;padding:3px 14px;border-radius:100px;background:#d4edda;color:#155724;font-weight:600;font-size:12px}
.tag{display:inline-block;padding:2px 12px;border-radius:100px;font-size:11px;font-weight:600}
.tag-urgent{background:#fce4ec;color:#c62828}
.tag-normal{background:#e3f2fd;color:#1565c0}
.tag-approved{background:#e8f5e9;color:#2e7d32}
.tag-rejected{background:#fce4ec;color:#c62828}
.addr{background:#f9f9f9;padding:12px 14px;border:1px solid #d0d0d0;border-radius:6px;margin:4px 0;font-size:13px;line-height:1.6}
</style></head><body>
<div class="letterhead">
  <div class="lh-left">
    <img src="" alt="Nexvitech Logo" id="print-logo" />
  </div>
  <div class="lh-right">
    <div class="company-name">Nexvitech India Pvt. Ltd</div>
    <div class="address">C-645, Gera Imperium Gateway,<br/>Near Bhosari Metro Station,<br/>Bhosari, Pune 411 026</div>
    <div class="print-date" style="margin-top:8px">Printed on: ${new Date().toLocaleString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
  </div>
</div>
<div style="margin-top:20px">
  <h1 style="font-size:20px;letter-spacing:2px;text-transform:uppercase;color:#1a1a2e;margin-bottom:4px">Dispatch Record</h1>
  <p style="color:#888;font-size:11px;margin-bottom:12px">Official Dispatch Memorandum</p>
  <div class="id-badge">${d.formatted_id}</div>
</div>
<div class="sec-title">Section 1 — Dispatch Information</div>
<table>
<tr><th>Dispatch Number</th><td>${d.dispatch_number || d.formatted_id || '—'}</td></tr>
<tr><th>Dispatch Date & Time</th><td>${d.dispatch_datetime ? new Date(d.dispatch_datetime).toLocaleString('en-IN') : (d.dispatch_date ? new Date(d.dispatch_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—')}</td></tr>
<tr><th>Dispatch Type</th><td><span class="tag" style="background:#e8eaf6;color:#283593">${d.dispatch_type || '—'}</span></td></tr>
<tr><th>Priority</th><td><span class="tag ${d.priority === 'Urgent' ? 'tag-urgent' : 'tag-normal'}">${d.priority || 'Normal'}</span></td></tr>
</table>
<div class="sec-title">Section 2 — Customer / Receiver Details</div>
<table>
<tr><th>Customer / Company Name</th><td>${d.company_name || '—'}</td></tr>
<tr><th>Plant / Line Name</th><td>${d.plant_line_name || '—'}</td></tr>
<tr><th>Contact Person</th><td>${d.contact_person || '—'}</td></tr>
<tr><th>Receiver Name</th><td>${d.receiver_name || '—'}</td></tr>
<tr><th>Mobile Number</th><td>${d.mobile_number || '—'}</td></tr>
<tr><th>Contact for Delivery</th><td>${d.contact_for_delivery || '—'}</td></tr>
<tr><th>Delivery Address</th><td><div class="addr">${d.delivery_address || '—'}</div></td></tr>
</table>
<div class="sec-title">Section 3 — Part Details</div>
<table>
<tr><th>Part Name</th><td>${d.part_name || '—'}</td></tr>
<tr><th>Part Number</th><td>${d.part_number || '—'}</td></tr>
<tr><th>Part Version</th><td>${d.part_version || '—'}</td></tr>
<tr><th>Batch / Lot Number</th><td>${d.batch_lot_number || '—'}</td></tr>
<tr><th>Serial Number</th><td>${d.serial_number || '—'}</td></tr>
<tr><th>Unit</th><td>${d.unit || 'Nos'}</td></tr>
<tr><th>Quantity</th><td>${d.quantity_dispatched || d.quantity || '—'}</td></tr>
<tr><th>Total Dispatch Qty</th><td>${d.total_dispatch_qty || '—'}</td></tr>
</table>
<div class="sec-title">Section 4 — Quality / Inspection Details</div>
<table>
<tr><th>QC Status</th><td><span class="tag ${d.qc_status === 'Approved' ? 'tag-approved' : d.qc_status === 'Rejected' ? 'tag-rejected' : ''}">${d.qc_status || '—'}</span></td></tr>
<tr><th>Inspection Date</th><td>${d.inspection_date ? new Date(d.inspection_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</td></tr>
<tr><th>Tested By</th><td>${d.tested_by || '—'}</td></tr>
<tr><th>Inspector Name</th><td>${d.inspector_name || '—'}</td></tr>
<tr><th>Approved By</th><td>${d.approved_by || '—'}</td></tr>
<tr><th>Quality Remarks</th><td>${d.quality_remarks || '—'}</td></tr>
</table>
<div class="sec-title">Section 5 — Logistics / Transport Details</div>
<table>
<tr><th>Transporter Name</th><td>${d.transporter_name || '—'}</td></tr>
<tr><th>Vehicle Number</th><td>${d.vehicle_number || d.vehicle_name || '—'}</td></tr>
<tr><th>Driver Name</th><td>${d.driver_name || '—'}</td></tr>
<tr><th>Driver Contact</th><td>${d.driver_contact || '—'}</td></tr>
</table>
<table>
<tr><th>Ton Capacity</th><td>${d.ton_count || '—'}</td></tr>
<tr><th>Load Weight</th><td>${d.load_weight || '—'}</td></tr>
<tr><th>Departure Date</th><td>${d.departure_date ? new Date(d.departure_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</td></tr>
<tr><th>Status</th><td><span class="s-b">${d.status}</span></td></tr>
<tr><th>Created By</th><td>${d.admin_name || d.store_keeper_name || '—'}</td></tr>
${d.dispatch_notes ? `<tr><th>Notes</th><td>${d.dispatch_notes}</td></tr>` : ''}
</table>
<div class="ftr">Generated on ${new Date().toLocaleString('en-IN')} &bull; System Generated Document</div>
</body></html>`);
    w.document.close();
    const logoEl = w.document.getElementById('print-logo');
    if (logoEl) logoEl.src = logoLps;
    setTimeout(() => w.print(), 150);
  };

  const handleExportExcel = () => {
    const sectionCols = [
      {
        label: 'DISPATCH INFO', cols: [
          { key: 'dispatch_id', header: 'ID', w: 14 },
          { key: 'dispatch_number', header: 'Dispatch No', w: 18 },
          { key: 'date_time', header: 'Date & Time', w: 20 },
          { key: 'type', header: 'Type', w: 12 },
          { key: 'priority', header: 'Priority', w: 10 },
        ]
      },
      {
        label: 'CUSTOMER / RECEIVER', cols: [
          { key: 'company', header: 'Company', w: 20 },
          { key: 'plant_line', header: 'Plant/Line', w: 16 },
          { key: 'contact_person', header: 'Contact Person', w: 18 },
          { key: 'receiver', header: 'Receiver', w: 18 },
          { key: 'mobile', header: 'Mobile', w: 16 },
          { key: 'contact_delivery', header: 'Contact (Delv)', w: 16 },
          { key: 'address', header: 'Delivery Address', w: 30 },
        ]
      },
      {
        label: 'PART DETAILS', cols: [
          { key: 'part_name', header: 'Part Name', w: 22 },
          { key: 'part_number', header: 'Part Number', w: 18 },
          { key: 'part_version', header: 'Version', w: 10 },
          { key: 'batch_lot', header: 'Batch/Lot', w: 16 },
          { key: 'serial', header: 'Serial No', w: 16 },
          { key: 'unit', header: 'Unit', w: 8 },
          { key: 'qty', header: 'Quantity', w: 12 },
          { key: 'total_qty', header: 'Total Qty', w: 12 },
        ]
      },
      {
        label: 'QUALITY / INSPECTION', cols: [
          { key: 'qc_status', header: 'QC Status', w: 12 },
          { key: 'inspection_date', header: 'Inspection Date', w: 16 },
          { key: 'tested_by', header: 'Tested By', w: 18 },
          { key: 'inspector', header: 'Inspector', w: 18 },
          { key: 'approved_by', header: 'Approved By', w: 18 },
          { key: 'quality_remarks', header: 'Quality Remarks', w: 28 },
        ]
      },
      {
        label: 'LOGISTICS / TRANSPORT', cols: [
          { key: 'transporter', header: 'Transporter', w: 20 },
          { key: 'vehicle_name', header: 'Vehicle Name', w: 16 },
          { key: 'vehicle_no', header: 'Vehicle No', w: 16 },
          { key: 'driver', header: 'Driver', w: 18 },
          { key: 'driver_contact', header: 'Driver Contact', w: 16 },
          { key: 'ton_capacity', header: 'Ton Capacity', w: 12 },
          { key: 'load_weight', header: 'Load Weight', w: 12 },
          { key: 'departure', header: 'Departure Date', w: 16 },
        ]
      },
      {
        label: 'STATUS', cols: [
          { key: 'status', header: 'Status', w: 12 },
          { key: 'created_by', header: 'Created By', w: 18 },
          { key: 'notes', header: 'Notes', w: 30 },
        ]
      },
    ];

    const flatHeaders = sectionCols.flatMap(s => s.cols.map(c => `[${s.label}] ${c.header}`));
    const colWidths = sectionCols.flatMap(s => s.cols.map(c => ({ wch: c.w })));

    const rows = filteredHistory.map(d => {
      const map: Record<string, any> = {
        dispatch_id: d.formatted_id || '',
        dispatch_number: d.dispatch_number || '',
        date_time: d.dispatch_datetime ? new Date(d.dispatch_datetime).toLocaleString('en-IN') : (d.dispatch_date ? new Date(d.dispatch_date).toLocaleDateString('en-IN') : ''),
        type: d.dispatch_type || '',
        priority: d.priority || 'Normal',
        company: d.company_name || d.client_name || '',
        plant_line: d.plant_line_name || '',
        contact_person: d.contact_person || '',
        receiver: d.receiver_name || '',
        mobile: d.mobile_number || '',
        contact_delivery: d.contact_for_delivery || '',
        address: d.delivery_address || '',
        part_name: d.part_name || '',
        part_number: d.part_number || '',
        part_version: d.part_version || '',
        batch_lot: d.batch_lot_number || '',
        serial: d.serial_number || '',
        unit: d.unit || 'Nos',
        qty: d.quantity_dispatched || d.quantity || 0,
        total_qty: d.total_dispatch_qty || 0,
        qc_status: d.qc_status || '',
        inspection_date: d.inspection_date ? new Date(d.inspection_date).toLocaleDateString('en-IN') : '',
        tested_by: d.tested_by || '',
        inspector: d.inspector_name || '',
        approved_by: d.approved_by || '',
        quality_remarks: d.quality_remarks || '',
        transporter: d.transporter_name || '',
        vehicle_name: d.vehicle_name || '',
        vehicle_no: d.vehicle_number || '',
        driver: d.driver_name || '',
        driver_contact: d.driver_contact || '',
        ton_capacity: d.ton_count || '',
        load_weight: d.load_weight || '',
        departure: d.departure_date ? new Date(d.departure_date).toLocaleDateString('en-IN') : '',
        status: d.status || '',
        created_by: d.admin_name || d.store_keeper_name || '',
        notes: d.dispatch_notes || '',
      };
      const row: Record<string, any> = {};
      let idx = 0;
      sectionCols.forEach(s => s.cols.forEach(c => { row[flatHeaders[idx++]] = map[c.key]; }));
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = colWidths;
    const lastCol = XLSX.utils.encode_col(flatHeaders.length - 1);
    ws['!autofilter'] = { ref: `A1:${lastCol}${rows.length + 1}` };
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dispatches');
    XLSX.writeFile(wb, `Dispatch_History_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel file downloaded!');
  };

  return (
    <div className="p-2 bg-gray-50/50 min-h-screen">
      <div className="flex items-center justify-between mb-2 px-2 py-1 bg-white border-b border-slate-100">
        <h1 className="text-[24px] font-black text-ind-text tracking-tight leading-none">
          Dispatch <span className="text-[#f97316]">History</span>
        </h1>
        <div className="flex items-center bg-white backdrop-blur-md rounded-2xl border border-ind-border/50 p-1 shadow-sm overflow-hidden scale-90 origin-right">
          <div className="px-4 py-1 text-center">
            <span className="block text-[8px] font-bold uppercase tracking-wider opacity-60 text-orange-500">Total</span>
            <span className="block text-lg font-black leading-none text-orange-500">{dispatches.length}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="relative flex-1 min-w-[300px]">
          <Search size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search dispatches..."
            className="w-full bg-white border border-ind-border/60 focus:border-[#f97316] rounded-full h-[42px] pl-12 pr-6 text-slate-700 font-bold text-[11px] tracking-wide placeholder:text-ind-text3/60 outline-none transition-all shadow-sm" />
        </div>
        <button onClick={handleExportExcel} className="px-6 h-[42px] bg-emerald-600 text-white rounded-full text-[11px] font-black uppercase tracking-widest shadow-lg hover:bg-emerald-700 hover:scale-[1.02] transition-all flex items-center gap-2 active:scale-95">
          <Download size={16} />Excel</button>
        <button onClick={fetchAll} disabled={loading} className="px-8 h-[42px] bg-gradient-to-r from-[#f97316] to-orange-600 text-white rounded-full text-[11px] font-black uppercase tracking-widest shadow-lg hover:shadow-orange-200 hover:scale-[1.02] transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />Refresh</button>
      </div>

      {filteredHistory.length === 0 ? (
        <div className="bg-white rounded-3xl border border-white shadow-sm py-20 text-center">
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6"><History size={40} className="text-orange-300" /></div>
          <h3 className="text-lg font-black text-gray-900 uppercase">No History Found</h3>
          <p className="text-[11px] font-bold text-slate-400 mt-2 uppercase tracking-wide">Dispatch records will appear here</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-ind-border/50 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white text-sm">
              <thead className="bg-ind-bg text-black border-b-2 border-[#f97316] uppercase text-[11px] tracking-wider sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left font-black whitespace-nowrap">ID</th>
                  <th className="px-4 py-2 text-left font-black whitespace-nowrap">Vehicle</th>
                  <th className="px-4 py-2 text-left font-black whitespace-nowrap">Driver</th>
                  <th className="px-4 py-2 text-left font-black whitespace-nowrap">Company</th>
                  <th className="px-4 py-2 text-left font-black whitespace-nowrap">Part</th>
                  <th className="px-4 py-2 text-left font-black whitespace-nowrap">Qty</th>
                  <th className="px-4 py-2 text-left font-black whitespace-nowrap">Challan</th>
                  <th className="px-4 py-2 text-left font-black whitespace-nowrap">Date</th>
                  <th className="px-4 py-2 text-left font-black whitespace-nowrap">By</th>
                  <th className="px-4 py-2 text-left font-black whitespace-nowrap">Status</th>
                  <th className="px-4 py-2 text-center font-black whitespace-nowrap">Print</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ind-border/40">
                <AnimatePresence mode="popLayout">
                  {filteredHistory.map(d => (
                    <motion.tr key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="hover:bg-ind-bg/40 transition-colors group">
                      <td className="px-4 py-2"><span className="font-mono text-[10px] font-black text-[#f97316] bg-orange-50 px-3 py-1 rounded-full border border-orange-100">{d.formatted_id}</span></td>
                      <td className="px-4 py-2 text-[11px] font-bold text-slate-800">{d.vehicle_name || d.vehicle_number || '—'}</td>
                      <td className="px-4 py-2 text-[11px] font-bold text-slate-600">{d.driver_name || '—'}</td>
                      <td className="px-4 py-2 text-[11px] font-bold text-slate-800">{d.company_name || d.client_name || '—'}</td>
                      <td className="px-4 py-2 text-[10px] font-bold text-slate-600">{d.part_name || '—'}</td>
                      <td className="px-4 py-2 text-[11px] font-black text-slate-700">{(d.quantity_dispatched || 0).toLocaleString()}</td>
                      <td className="px-4 py-2 text-[10px] font-mono font-bold text-slate-500">{d.challan_number || '—'}</td>
                      <td className="px-4 py-2 text-[10px] font-bold text-slate-500">{d.dispatch_date ? new Date(d.dispatch_date).toLocaleDateString('en-IN') : '—'}</td>
                      <td className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase">{d.admin_name || d.store_keeper_name || '—'}</td>
                      <td className="px-4 py-2">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black border tracking-widest ${d.status === 'DISPATCHED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : d.status === 'VERIFIED' ? 'bg-blue-50 text-blue-600 border-blue-100' : d.status === 'DRAFT' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{d.status}</span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button onClick={() => handlePrint(d)} className="p-2 bg-gray-50 text-gray-400 hover:bg-[#f97316] hover:text-white rounded-xl text-[10px] font-bold transition-all border border-gray-100 shadow-sm inline-flex items-center gap-1"><Printer size={14} /></button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SKDispatchHistoryPage;