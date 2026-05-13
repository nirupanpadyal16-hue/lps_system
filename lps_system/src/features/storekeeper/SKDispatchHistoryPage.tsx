import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { skApi } from '../../api/newRolesApi';
import toast from 'react-hot-toast';
import { History, RefreshCw, Printer, Download, Search } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import logoLps from '../../assets/logo_lps.png';

const SKDispatchHistoryPage: React.FC = () => {
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
    !search ||
    d.formatted_id?.toLowerCase().includes(search.toLowerCase()) ||
    d.vehicle_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.driver_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.part_name?.toLowerCase().includes(search.toLowerCase())
  );

  // ─── Build full dispatch HTML ─────────────────────────────────────────────────
  //
  // Three html2canvas fixes applied throughout:
  //
  // FIX 1 — <style> lives inside <body>, not <head>.
  //   html2pdf parses the HTML string via innerHTML which strips <head> content,
  //   so any <style> in <head> is silently discarded. Moving it into <body> keeps
  //   it alive.
  //
  // FIX 2 — All coloured badges use `background-color:` (not the `background`
  //   shorthand). html2canvas does not honour the shorthand on inline elements
  //   (<span>), so the fill was never painted.
  //
  // FIX 3 — Numbered section circles use `display:inline-block` + `line-height`
  //   instead of `display:inline-flex`. html2canvas ignores inline-flex, so the
  //   orange fill and centred number never rendered correctly.
  //
  // ─────────────────────────────────────────────────────────────────────────────
  const buildDispatchHtml = (d: any, now: Date, logoSrc: string = '') => {
    const dmy: any = { day: 'numeric', month: 'short', year: 'numeric' };
    const fmtDate = (v: string) =>
      v ? new Date(v).toLocaleDateString('en-IN', dmy) : '—';
    const fmtDT = (v: string) =>
      v ? new Date(v).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }) : '—';

    // FIX 2: helper always emits background-color, never the shorthand
    const tag = (bg: string, color: string, border: string, text: string) =>
      `<span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:6.5pt;font-weight:700;background-color:${bg};color:${color};border:1px solid ${border}">${text}</span>`;

    // FIX 3: inline-block + line-height, not inline-flex
    const circle = (n: number) =>
      `<span style="display:inline-block;width:15px;height:15px;border-radius:50%;background-color:#f97316;font-size:6pt;font-weight:800;color:#fff;text-align:center;line-height:15px;vertical-align:middle">${n}</span>`;

    const typeTag = tag('#fff7ed', '#c2410c', '#fed7aa', d.dispatch_type || '—');
    const priorityTag = d.priority === 'Urgent'
      ? tag('#fef2f2', '#dc2626', '#fecaca', 'Urgent')
      : tag('#eff6ff', '#2563eb', '#bfdbfe', d.priority || 'Normal');
    const qcTag = d.qc_status === 'Approved'
      ? tag('#f0fdf4', '#16a34a', '#bbf7d0', d.qc_status)
      : d.qc_status === 'Rejected'
        ? tag('#fef2f2', '#dc2626', '#fecaca', d.qc_status)
        : tag('#f1f5f9', '#64748b', '#e2e8f0', d.qc_status || '—');
    const statusTag = tag('#f0fdf4', '#16a34a', '#bbf7d0', d.status);

    return `<!DOCTYPE html>
<html><head><title>${d.formatted_id}_Dispatch_${now.toISOString().split('T')[0]}</title></head>
<body>
<style>
  @page { size: A4; margin: 0; }
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Times New Roman',Georgia,serif;color:#1e293b;line-height:1.4;font-size:9pt;background-color:#fff;padding:0;width:210mm}
  .page{width:210mm;padding:20mm 18mm 22mm 18mm}
  .hdr{display:flex;justify-content:space-between;align-items:center;padding-bottom:8px;border-bottom:2px solid #0f172a;margin-bottom:8px}
  .hdr-l{display:flex;align-items:center;gap:8px}
  .hdr-l img{width:72px;height:auto;display:block}
  .hdr-l .vr{width:1px;height:28px;background-color:#e2e8f0}
  .hdr-l .org .nm{font-size:9.5pt;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.6px}
  .hdr-l .org .adr{font-size:6.5pt;color:#64748b;margin-top:1px}
  .hdr-l .org .cnt{font-size:6pt;color:#f97316;font-weight:600;margin-top:1px;letter-spacing:0.3px}
  .hdr-r{text-align:right}
  .hdr-r .docid{background-color:#0f172a;color:#fff;padding:2px 10px;font-size:8pt;font-weight:700;letter-spacing:0.8px;display:inline-block;border-radius:2px}
  .hdr-r .ts{font-size:6pt;color:#94a3b8;margin-top:2px}
  .sum{display:flex;gap:6px;margin-bottom:8px}
  .sum .c{flex:1;border:1px solid #e2e8f0;border-radius:4px;padding:5px 10px;background-color:#f8fafc}
  .sum .c .l{font-size:5.5pt;font-weight:700;color:#f97316;text-transform:uppercase;letter-spacing:0.5px}
  .sum .c .v{font-size:8.5pt;font-weight:700;color:#0f172a;margin-top:1px}
  .sec{margin-bottom:6px;border:1px solid #e2e8f0;border-radius:4px;overflow:hidden;page-break-inside:avoid}
  .sec-h{background-color:#0f172a;color:#fff;padding:4px 10px;font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;display:flex;align-items:center;gap:5px}
  .st{width:100%;border-collapse:collapse}
  .st td{padding:3px 8px;border-bottom:1px solid #f1f5f9;font-size:7.5pt;vertical-align:top}
  .st td:first-child{width:24%;font-weight:700;color:#475569;background-color:#f8fafc;padding:3px 8px}
  .st td:last-child{color:#0f172a}
  .st tr:last-child td{border-bottom:none}
  .ab{background-color:#f8fafc;padding:4px 8px;border:1px solid #e2e8f0;border-radius:2px;font-size:7.5pt;line-height:1.4;margin:1px 0}
  .sig{display:flex;justify-content:space-between;margin-top:10px;padding-top:6px;border-top:1px solid #e2e8f0;gap:12px}
  .sig-i{flex:1;text-align:center}
  .sig-i .ln{height:1px;background-color:#cbd5e1;margin:0 auto 4px;width:70%}
  .sig-i .l{font-size:5.5pt;color:#f97316;text-transform:uppercase;letter-spacing:0.6px;font-weight:700}
  .sig-i .n{font-size:7pt;font-weight:700;color:#0f172a;margin-top:1px}
  .ft{margin-top:8px;text-align:center;color:#64748b;font-size:6pt;border-top:1px solid #e2e8f0;padding-top:5px;letter-spacing:0.3px}
  @media print{
    .sec-h,.sum .c,.st td:first-child,.ab,.hdr-r .docid{
      -webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact
    }
  }
</style>

<div class="page">

  <!-- Header -->
  <div class="hdr">
    <div class="hdr-l">
      <img src="${logoSrc}" alt="Logo" />
      <div class="vr"></div>
      <div class="org">
        <div class="nm">Nexvitech India Pvt. Ltd</div>
        <div class="adr">C-645, Gera Imperium Gateway, Bhosari, Pune 411 026</div>
        <div class="cnt">info@nexvitech.in &nbsp;|&nbsp; +91 878 889 1171</div>
      </div>
    </div>
    <div class="hdr-r">
      <div class="docid">${d.formatted_id}</div>
      <div class="ts">Printed: ${now.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
    </div>
  </div>

  <!-- Summary bar -->
  <div class="sum">
    <div class="c"><div class="l">Dispatch No.</div><div class="v">${d.dispatch_number || d.formatted_id || '—'}</div></div>
    <div class="c"><div class="l">Date</div><div class="v">${fmtDT(d.dispatch_datetime) || fmtDate(d.dispatch_date)}</div></div>
    <div class="c"><div class="l">Type</div><div class="v">${typeTag}</div></div>
    <div class="c"><div class="l">Priority</div><div class="v">${priorityTag}</div></div>
  </div>

  <!-- Section 1: Customer & Receiver -->
  <div class="sec">
    <div class="sec-h">${circle(1)}&nbsp;Customer &amp; Receiver</div>
    <table class="st">
      <tr><td>Company Name</td><td>${d.company_name || '—'}</td></tr>
      <tr><td>Plant / Line</td><td>${d.plant_line_name || '—'}</td></tr>
      <tr><td>Contact Person</td><td>${d.contact_person || '—'}</td></tr>
      <tr><td>Receiver Name</td><td>${d.receiver_name || '—'}</td></tr>
      <tr><td>Mobile</td><td>${d.mobile_number || '—'}</td></tr>
      <tr><td>Delivery Contact</td><td>${d.contact_for_delivery || '—'}</td></tr>
      <tr><td>Delivery Address</td><td><div class="ab">${d.delivery_address || '—'}</div></td></tr>
    </table>
  </div>

  <!-- Section 2: Part & Quantity -->
  <div class="sec">
    <div class="sec-h">${circle(2)}&nbsp;Part &amp; Quantity</div>
    <table class="st">
      <tr><td>Part Name</td><td>${d.part_name || '—'}</td></tr>
      <tr><td>Part Number</td><td>${d.part_number || '—'}</td></tr>
      <tr><td>Version</td><td>${d.part_version || '—'}</td></tr>
      <tr><td>Batch / Lot</td><td>${d.batch_lot_number || '—'}</td></tr>
      <tr><td>Serial Number</td><td>${d.serial_number || '—'}</td></tr>
      <tr><td>Unit</td><td>${d.unit || 'Nos'}</td></tr>
      <tr><td>Quantity</td><td>${d.quantity_dispatched || d.quantity || '—'}</td></tr>
      <tr><td>Total Qty</td><td>${d.total_dispatch_qty || '—'}</td></tr>
    </table>
  </div>

  <!-- Section 3: Quality & Inspection -->
  <div class="sec">
    <div class="sec-h">${circle(3)}&nbsp;Quality &amp; Inspection</div>
    <table class="st">
      <tr><td>QC Status</td><td>${qcTag}</td></tr>
      <tr><td>Inspection Date</td><td>${fmtDate(d.inspection_date)}</td></tr>
      <tr><td>Tested By</td><td>${d.tested_by || '—'}</td></tr>
      <tr><td>Inspector</td><td>${d.inspector_name || '—'}</td></tr>
      <tr><td>Approved By</td><td>${d.approved_by || '—'}</td></tr>
      <tr><td>Remarks</td><td>${d.quality_remarks || '—'}</td></tr>
    </table>
  </div>

  <!-- Section 4: Logistics & Transport -->
  <div class="sec">
    <div class="sec-h">${circle(4)}&nbsp;Logistics &amp; Transport</div>
    <table class="st">
      <tr><td>Transporter</td><td>${d.transporter_name || '—'}</td></tr>
      <tr><td>Vehicle Name</td><td>${d.vehicle_name || '—'}</td></tr>
      <tr><td>Vehicle Number</td><td>${d.vehicle_number || '—'}</td></tr>
      <tr><td>Driver Name</td><td>${d.driver_name || '—'}</td></tr>
      <tr><td>Driver Contact</td><td>${d.driver_contact || '—'}</td></tr>
      <tr><td>Ton Capacity</td><td>${d.ton_count || '—'}</td></tr>
      <tr><td>Load Weight</td><td>${d.load_weight || '—'}</td></tr>
      <tr><td>Departure</td><td>${fmtDate(d.departure_date)}</td></tr>
    </table>
  </div>

  <!-- Section 5: Dispatch Status -->
  <div class="sec">
    <div class="sec-h">${circle(5)}&nbsp;Dispatch Status</div>
    <table class="st">
      <tr><td>Status</td><td>${statusTag}</td></tr>
      <tr><td>Created By</td><td>${d.admin_name || d.store_keeper_name || '—'}</td></tr>
      ${d.dispatch_notes ? `<tr><td>Notes</td><td>${d.dispatch_notes}</td></tr>` : ''}
    </table>
  </div>

  <!-- Signatures -->
  <div class="sig">
    <div class="sig-i">
      <div class="ln"></div>
      <div class="l">Prepared By</div>
      <div class="n">${d.admin_name || d.store_keeper_name || '____________'}</div>
    </div>
    <div class="sig-i">
      <div class="ln"></div>
      <div class="l">Approved By</div>
      <div class="n">${d.approved_by || '____________'}</div>
    </div>
    <div class="sig-i">
      <div class="ln"></div>
      <div class="l">Received By</div>
      <div class="n">____________</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="ft">
    ${d.formatted_id} &bull;
    ${now.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} &bull;
    Nexvitech India Pvt. Ltd
  </div>

</div>
</body></html>`;
  };

  // ─── Print ────────────────────────────────────────────────────────────────────
  const handlePrint = (d: any) => {
    const w = window.open('', '_blank');
    if (!w) { toast.error('Please allow pop-ups for printing'); return; }
    const now = new Date();
    const html = buildDispatchHtml(d, now, logoLps);
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  // ─── Download PDF ─────────────────────────────────────────────────────────────
  const handleDownloadDispatch = async (d: any) => {
    const now = new Date();
    const html = buildDispatchHtml(d, now, logoLps);

    try {
      await html2pdf()
        .from(html)
        .set({
          margin: 0,
          filename: `${d.formatted_id}_Dispatch_${now.toISOString().split('T')[0]}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true,
            logging: false,
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', 'td', '.sec'] },
        })
        .save();
      toast.success('PDF downloaded!');
    } catch {
      toast.error('Failed to generate PDF');
    }
  };

  // ─── Export Excel ─────────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    if (filteredHistory.length === 0) { toast.error('No records to export'); return; }
    const now = new Date();
    const dmy = (v: string) => v ? new Date(v).toLocaleDateString('en-IN') : '';
    const fmtDT = (v: string) => v ? new Date(v).toLocaleString('en-IN') : '';

    let html = `<html><head><meta charset="UTF-8">
<style>
  body{font-family:'Times New Roman',serif;font-size:10pt}
  h2{color:#f97316;font-size:12pt;border-bottom:2px solid #f97316;padding-bottom:3px;margin:10px 0 4px}
  td,th{padding:3px 7px;border:1px solid #ccc;font-size:9pt;vertical-align:top}
  .sh{background:#d3d3d3;font-weight:700;font-size:9pt;text-align:left}
  .lb{font-weight:700;background:#f5f5f5;width:20%}
</style></head><body>`;

    filteredHistory.forEach((d, idx) => {
      if (idx > 0) html += '<br/>';
      html += `<h2>#${d.formatted_id}</h2>
<table>
  <tr><th class="sh" colspan="4">1. DISPATCH INFORMATION</th></tr>
  <tr><td class="lb">Dispatch No.</td><td>${d.dispatch_number || d.formatted_id || '—'}</td><td class="lb">Date &amp; Time</td><td>${fmtDT(d.dispatch_datetime) || dmy(d.dispatch_date) || '—'}</td></tr>
  <tr><td class="lb">Type</td><td>${d.dispatch_type || '—'}</td><td class="lb">Priority</td><td>${d.priority || 'Normal'}</td></tr>
  <tr><th class="sh" colspan="4">2. CUSTOMER &amp; RECEIVER</th></tr>
  <tr><td class="lb">Company</td><td>${d.company_name || '—'}</td><td class="lb">Plant / Line</td><td>${d.plant_line_name || '—'}</td></tr>
  <tr><td class="lb">Contact Person</td><td>${d.contact_person || '—'}</td><td class="lb">Receiver</td><td>${d.receiver_name || '—'}</td></tr>
  <tr><td class="lb">Mobile</td><td>${d.mobile_number || '—'}</td><td class="lb">Delivery Contact</td><td>${d.contact_for_delivery || '—'}</td></tr>
  <tr><td class="lb">Address</td><td colspan="3">${d.delivery_address || '—'}</td></tr>
  <tr><th class="sh" colspan="4">3. PART &amp; QUANTITY</th></tr>
  <tr><td class="lb">Part Name</td><td>${d.part_name || '—'}</td><td class="lb">Part Number</td><td>${d.part_number || '—'}</td></tr>
  <tr><td class="lb">Version</td><td>${d.part_version || '—'}</td><td class="lb">Batch / Lot</td><td>${d.batch_lot_number || '—'}</td></tr>
  <tr><td class="lb">Serial No.</td><td>${d.serial_number || '—'}</td><td class="lb">Unit</td><td>${d.unit || 'Nos'}</td></tr>
  <tr><td class="lb">Quantity</td><td>${d.quantity_dispatched || d.quantity || '—'}</td><td class="lb">Total Qty</td><td>${d.total_dispatch_qty || '—'}</td></tr>
  <tr><th class="sh" colspan="4">4. QUALITY &amp; INSPECTION</th></tr>
  <tr><td class="lb">QC Status</td><td>${d.qc_status || '—'}</td><td class="lb">Inspection Date</td><td>${dmy(d.inspection_date)}</td></tr>
  <tr><td class="lb">Tested By</td><td>${d.tested_by || '—'}</td><td class="lb">Inspector</td><td>${d.inspector_name || '—'}</td></tr>
  <tr><td class="lb">Approved By</td><td>${d.approved_by || '—'}</td><td class="lb">Remarks</td><td>${d.quality_remarks || '—'}</td></tr>
  <tr><th class="sh" colspan="4">5. LOGISTICS &amp; TRANSPORT</th></tr>
  <tr><td class="lb">Transporter</td><td>${d.transporter_name || '—'}</td><td class="lb">Vehicle Name</td><td>${d.vehicle_name || '—'}</td></tr>
  <tr><td class="lb">Vehicle No.</td><td>${d.vehicle_number || '—'}</td><td class="lb">Driver</td><td>${d.driver_name || '—'}</td></tr>
  <tr><td class="lb">Driver Contact</td><td>${d.driver_contact || '—'}</td><td class="lb">Ton Capacity</td><td>${d.ton_count || '—'}</td></tr>
  <tr><td class="lb">Load Weight</td><td>${d.load_weight || '—'}</td><td class="lb">Departure</td><td>${dmy(d.departure_date)}</td></tr>
  <tr><td class="lb">Status</td><td>${d.status || '—'}</td><td class="lb">Created By</td><td>${d.admin_name || d.store_keeper_name || '—'}</td></tr>
  ${d.dispatch_notes ? `<tr><td class="lb">Notes</td><td colspan="3">${d.dispatch_notes}</td></tr>` : ''}
</table>`;
    });

    html += `<p style="text-align:center;color:#999;font-size:8pt;margin-top:15px;border-top:1px solid #ddd;padding-top:6px">
      Nexvitech India Pvt. Ltd — ${now.toLocaleString('en-IN')}
    </p></body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filteredHistory[0]?.formatted_id || 'Dispatch'}_Dispatch_${now.toISOString().split('T')[0]}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Excel file downloaded!');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DISPATCHED': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'VERIFIED': return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'DRAFT': return 'bg-amber-50 text-amber-600 border-amber-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 bg-gradient-to-br from-gray-50 to-slate-100 min-h-screen">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 px-6 py-4 bg-white rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-[26px] font-black tracking-tight">
            Dispatch <span className="text-[#f97316]">History</span>
          </h1>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Complete Dispatch Records
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl px-6 py-2 text-center border border-orange-100">
            <span className="block text-[9px] font-bold text-orange-400 uppercase tracking-wider">Total Dispatches</span>
            <span className="block text-2xl font-black text-orange-600">{dispatches.length}</span>
          </div>
        </div>
      </div>

      {/* Search & Actions */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[280px]">
          <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by ID, Vehicle, Driver, Company or Part..."
            className="w-full bg-white border border-slate-200 focus:border-[#f97316] rounded-full h-[46px] pl-12 pr-6 text-slate-700 font-medium text-[12px] tracking-wide outline-none transition-all shadow-sm focus:shadow-md"
          />
        </div>
        <button
          onClick={handleExportExcel}
          className="px-6 h-[46px] bg-emerald-600 text-white rounded-full text-[11px] font-black uppercase tracking-widest shadow-md hover:bg-emerald-700 hover:shadow-lg transition-all flex items-center gap-2 active:scale-95"
        >
          <Download size={16} /> Export Excel
        </button>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="px-8 h-[46px] bg-gradient-to-r from-[#f97316] to-orange-600 text-white rounded-full text-[11px] font-black uppercase tracking-widest shadow-md hover:shadow-lg transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64 bg-white/50 backdrop-blur-sm rounded-3xl border border-white">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-10 w-10 animate-spin text-[#f97316]" />
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Loading History...</p>
          </div>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm py-20 text-center">
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <History size={40} className="text-orange-300" />
          </div>
          <h3 className="text-lg font-black text-slate-800 uppercase">No History Found</h3>
          <p className="text-[11px] font-bold text-slate-400 mt-2 uppercase tracking-wide">
            Dispatch records will appear here
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-white border-b-2 border-[#f97316]">
                  {['ID', 'Vehicle', 'Driver', 'Company', 'Part', 'Qty', 'Challan', 'Date', 'By', 'Status', 'Actions'].map(h => (
                    <th
                      key={h}
                      className={`px-5 py-4 text-[11px] font-black text-slate-700 uppercase tracking-wider ${h === 'Qty' || h === 'Actions' ? 'text-center' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <AnimatePresence mode="popLayout">
                  {filteredHistory.map((d, idx) => (
                    <motion.tr
                      key={d.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="hover:bg-orange-50/30 transition-colors group"
                    >
                      <td className="px-5 py-3">
                        <span className="font-mono text-[10px] font-black text-[#f97316] bg-orange-50 px-3 py-1.5 rounded-full border border-orange-200">
                          {d.formatted_id}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[12px] font-bold text-slate-700">{d.vehicle_name || d.vehicle_number || '—'}</td>
                      <td className="px-5 py-3 text-[12px] font-medium text-slate-600">{d.driver_name || '—'}</td>
                      <td className="px-5 py-3 text-[12px] font-bold text-slate-700">{d.company_name || d.client_name || '—'}</td>
                      <td className="px-5 py-3 text-[11px] font-medium text-slate-600">{d.part_name || '—'}</td>
                      <td className="px-5 py-3 text-center text-[13px] font-black text-slate-800">
                        {(d.quantity_dispatched || 0).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-[10px] font-mono font-bold text-slate-500">{d.challan_number || '—'}</td>
                      <td className="px-5 py-3 text-[10px] font-bold text-slate-500">
                        {d.dispatch_date ? new Date(d.dispatch_date).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase">
                        {d.admin_name || d.store_keeper_name || '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black border tracking-widest ${getStatusColor(d.status)}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleDownloadDispatch(d)}
                            className="w-9 h-9 bg-slate-50 text-slate-400 hover:bg-emerald-500 hover:text-white rounded-xl transition-all border border-slate-200 shadow-sm inline-flex items-center justify-center group-hover:shadow-md"
                            title="Download PDF"
                          >
                            <Download size={15} />
                          </button>
                          <button
                            onClick={() => handlePrint(d)}
                            className="w-9 h-9 bg-slate-50 text-slate-400 hover:bg-[#f97316] hover:text-white rounded-xl transition-all border border-slate-200 shadow-sm inline-flex items-center justify-center group-hover:shadow-md"
                            title="Print"
                          >
                            <Printer size={15} />
                          </button>
                        </div>
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