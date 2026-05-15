import { useState, useEffect } from 'react';
import { deoMachineApi } from '../../api/newRolesApi';
import { ChevronDown, ChevronRight, Clock, AlertTriangle, Loader2, Factory, Wrench, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { FillModal, ViewFillModal } from './components/DEOShortageModals';
import type { ShortageRequest } from './components/DEOShortageModals';

interface SubMachine { id: number; name: string; }
interface ShortagePartEntry extends Omit<ShortageRequest, 'total_days' | 'deo_name'> {
  id: number;
  formatted_id: string;
  sap_part_number: string;
  part_description: string;
  shortage_quantity: number;
  status: string;
  days_remaining: number | null;
  total_days: number | null;
  demand_formatted_id: string | null;
  demand_start_date: string | null;
  demand_end_date: string | null;
  sub_machines: SubMachine[];
  deo_name: string | null;
}
interface MachineGroup {
  machine_name: string;
  machine_id: number | null;
  sub_machines: SubMachine[];
  parts: ShortagePartEntry[];
}

function DeadlineBadge({ days, total }: { days: number | null; total: number | null }) {
  if (days === null) return <span className="text-xs text-slate-400">No deadline</span>;
  const pct = total && total > 0 ? Math.max(0, Math.min(100, ((total - days) / total) * 100)) : 0;
  const isUrgent = days <= 2;
  const isWarning = days <= 5 && days > 2;
  const color = isUrgent ? 'text-rose-600 bg-rose-50 border-rose-200' : isWarning ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-emerald-600 bg-emerald-50 border-emerald-200';
  const barColor = isUrgent ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-400';
  return (
    <div className="flex flex-col gap-1 min-w-[110px]">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black border ${color}`}>
        <Clock size={10} />
        {days < 0 ? `${Math.abs(days)}d OVERDUE` : `${days}d left`}
      </span>
      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-1 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING: { label: 'Pending', cls: 'bg-slate-100 text-slate-600' },
    IN_PROGRESS: { label: 'In Progress', cls: 'bg-blue-50 text-blue-700' },
    DEO_FILLED: { label: 'Filled', cls: 'bg-amber-50 text-amber-700' },
    COMPLETED: { label: 'Done', cls: 'bg-emerald-50 text-emerald-700' },
  };
  const cfg = map[status] || { label: status, cls: 'bg-slate-100 text-slate-500' };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${cfg.cls}`}>{cfg.label}</span>;
}

export default function DEOShortagePartsPage({ readOnly = false }: { readOnly?: boolean }) {
  const navigate = useNavigate();
  const [machines, setMachines] = useState<MachineGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [expandedSub, setExpandedSub] = useState<Set<string>>(new Set());
  const [selectedPart, setSelectedPart] = useState<ShortagePartEntry | null>(null);
  const [showFill, setShowFill] = useState(false);
  const [showView, setShowView] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await deoMachineApi.getShortagePartsByMachine();
      const data: MachineGroup[] = res.data?.data || [];
      setMachines(data);
      // Auto-expand first machine
      if (data.length > 0) setExpanded(new Set([data[0].machine_name]));
    } catch {
      toast.error('Failed to load shortage parts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const toggleMachine = (name: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(name)) { next.delete(name); } else { next.add(name); }
      return next;
    });
  };

  const toggleSub = (key: string) => {
    setExpandedSub(prev => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  };

  const totalParts = machines.reduce((s, m) => s + m.parts.length, 0);
  const urgentParts = machines.reduce((s, m) => s + m.parts.filter(p => p.days_remaining !== null && p.days_remaining <= 2).length, 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Shortage Parts by Machine</h1>
          <p className="text-sm text-slate-500 mt-1">
            {readOnly ? 'Supervisor view — observe production status' : 'Parts assigned to each machine for production'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {urgentParts > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200">
              <AlertTriangle size={14} className="text-rose-500" />
              <span className="text-rose-700 text-xs font-black">{urgentParts} URGENT</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-100">
            <Factory size={14} className="text-blue-500" />
            <span className="text-blue-700 text-xs font-black">{totalParts} Parts Active</span>
          </div>
          <button onClick={fetchData} className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 transition-all">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={32} className="animate-spin text-orange-400" />
        </div>
      ) : machines.length === 0 ? (
        <div className="text-center py-24 text-slate-300">
          <Factory size={56} strokeWidth={1} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm font-black uppercase tracking-widest">No shortage parts active</p>
          <p className="text-xs text-slate-400 mt-2">Parts will appear here once RM is accepted by the Store Keeper</p>
        </div>
      ) : (
        <div className="space-y-4">
          {machines.map(machine => {
            const isOpen = expanded.has(machine.machine_name);
            const urgentCount = machine.parts.filter(p => p.days_remaining !== null && p.days_remaining <= 2).length;

            // Group parts by sub-machine
            const subMap: Record<string, ShortagePartEntry[]> = {};
            machine.parts.forEach(p => {
              const subNames = p.sub_machines.length > 0 ? p.sub_machines.map(s => s.name) : ['MAIN'];
              subNames.forEach(sn => {
                if (!subMap[sn]) subMap[sn] = [];
                if (!subMap[sn].find(x => x.id === p.id)) subMap[sn].push(p);
              });
            });

            return (
              <div key={machine.machine_name} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Machine Header */}
                <button
                  onClick={() => toggleMachine(machine.machine_name)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-sm">
                      <Factory size={18} className="text-white" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-3">
                        <h2 className="text-base font-black text-slate-900">{machine.machine_name}</h2>
                        {urgentCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black flex items-center gap-1">
                            <AlertTriangle size={9} /> {urgentCount} urgent
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{machine.parts.length} parts · {machine.sub_machines.length} sub-machines</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex gap-2">
                      {machine.sub_machines.slice(0, 4).map(sm => (
                        <span key={sm.id} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                          {sm.name}
                        </span>
                      ))}
                      {machine.sub_machines.length > 4 && <span className="text-xs text-slate-400">+{machine.sub_machines.length - 4}</span>}
                    </div>
                    {isOpen ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                  </div>
                </button>

                {/* Sub-machines */}
                {isOpen && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {Object.entries(subMap).map(([subName, parts]) => {
                      const subKey = `${machine.machine_name}::${subName}`;
                      const isSubOpen = expandedSub.has(subKey);

                      return (
                        <div key={subName}>
                          {/* Sub-machine row */}
                          <button
                            onClick={() => toggleSub(subKey)}
                            className="w-full flex items-center justify-between px-8 py-3 hover:bg-slate-50/60 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-orange-50 flex items-center justify-center transition-colors">
                                <Wrench size={12} className="text-slate-400 group-hover:text-orange-500 transition-colors" />
                              </div>
                              <span className="text-sm font-bold text-slate-700">{subName}</span>
                              <span className="text-xs text-slate-400">{parts.length} part{parts.length !== 1 ? 's' : ''}</span>
                            </div>
                            {isSubOpen ? <ChevronDown size={15} className="text-slate-300" /> : <ChevronRight size={15} className="text-slate-300" />}
                          </button>

                          {/* Parts table */}
                          {isSubOpen && (
                            <div className="bg-slate-50/40 px-6 pb-4">
                              <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
                                      <th className="px-4 py-2.5 text-left font-black">SAP Part No.</th>
                                      <th className="px-4 py-2.5 text-left font-black">Description</th>
                                      <th className="px-4 py-2.5 text-center font-black">Shortage Qty</th>
                                      <th className="px-4 py-2.5 text-center font-black">Deadline</th>
                                      <th className="px-4 py-2.5 text-center font-black">Status</th>
                                      {!readOnly && <th className="px-4 py-2.5 text-center font-black">Action</th>}
                                      {readOnly && <th className="px-4 py-2.5 text-center font-black">DEO</th>}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                    {parts.map(part => (
                                      <tr key={part.id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="px-4 py-3">
                                          <span className="font-mono font-bold text-orange-600">{part.sap_part_number}</span>
                                          {part.demand_formatted_id && (
                                            <div className="text-[9px] text-slate-400 font-mono mt-0.5">{part.demand_formatted_id}</div>
                                          )}
                                        </td>
                                        <td className="px-4 py-3 max-w-[200px]">
                                          <p className="text-slate-700 font-medium truncate" title={part.part_description || ''}>{part.part_description || '—'}</p>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                          <span className="font-black text-slate-800">{part.shortage_quantity}</span>
                                          <span className="text-slate-400 ml-1">pcs</span>
                                        </td>
                                        <td className="px-4 py-3">
                                          <div className="flex justify-center">
                                            <DeadlineBadge days={part.days_remaining} total={part.total_days} />
                                          </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                          <StatusBadge status={part.status} />
                                        </td>
                                        {!readOnly && (
                                          <td className="px-4 py-3 text-center">
                                            <button
                                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all shadow-sm ${part.status === 'DEO_FILLED'
                                                ? 'bg-indigo-500 hover:bg-indigo-600'
                                                : 'bg-orange-500 hover:bg-orange-600'
                                                } text-white`}
                                              onClick={() => {
                                                setSelectedPart(part);
                                                if (part.status === 'DEO_FILLED') {
                                                  setShowView(true);
                                                } else {
                                                  setShowFill(true);
                                                }
                                              }}
                                            >
                                              {part.status === 'DEO_FILLED' ? 'View/Edit' : 'Fill Entry'}
                                            </button>
                                          </td>
                                        )}
                                        {readOnly && (
                                          <td className="px-4 py-3 text-center text-slate-500 text-xs">{part.deo_name || '—'}</td>
                                        )}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showFill && selectedPart && (
        <FillModal
          request={selectedPart}
          onClose={() => setShowFill(false)}
          onSuccess={() => {
            fetchData();
            toast.success('G-Chart updated successfully');
          }}
        />
      )}

      {showView && selectedPart && (
        <ViewFillModal
          request={selectedPart}
          onClose={() => setShowView(false)}
        />
      )}
    </div>
  );
}
