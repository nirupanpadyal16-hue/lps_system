import React from 'react';
import { motion } from 'framer-motion';
import { UserCheck, CheckCircle2, XCircle, Clock, Loader2, TrendingUp } from 'lucide-react';
import type { LiveSupervisor } from '../../hooks/useAdminLive';

function timeAgo(isoString: string | null): string {
    if (!isoString) return 'No activity';
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

const EfficiencyGauge: React.FC<{ pct: number }> = ({ pct }) => {
    const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
    const r = 22;
    const circ = 2 * Math.PI * r;
    const dashOffset = circ - (pct / 100) * circ;

    return (
        <div className="relative flex items-center justify-center w-14 h-14">
            <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
                <circle cx="28" cy="28" r={r} fill="none" stroke="#f1f5f9" strokeWidth="5" />
                <circle
                    cx="28" cy="28" r={r}
                    fill="none" stroke={color} strokeWidth="5"
                    strokeDasharray={circ}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
            </svg>
            <span className="absolute text-[0.6rem] font-black" style={{ color }}>{pct}%</span>
        </div>
    );
};

interface Props {
    supervisors: LiveSupervisor[];
    isLoading: boolean;
}

export const SupervisorActivityPanel: React.FC<Props> = ({ supervisors, isLoading }) => {
    return (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm h-full">
            <div className="flex items-center justify-between px-3 py-3 border-b border-gray-100 bg-white">
                <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-6 bg-[#f37021] rounded-full"></div>
                    <div>
                        <h3 className="text-base font-bold text-[#f37021] tracking-tight">Supervisor Activity</h3>

                    </div>
                </div>
                {isLoading && <Loader2 size={14} className="text-indigo-400 animate-spin" />}
            </div>

            <div className="p-3 space-y-2.5 overflow-y-auto max-h-[480px] custom-scrollbar">
                {supervisors.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                        {isLoading ? 'Loading supervisors…' : 'No supervisor data for current filters.'}
                    </div>
                ) : (
                    supervisors.map((sup, i) => {
                        const effColor = sup.efficiency_pct >= 80
                            ? 'text-emerald-600' : sup.efficiency_pct >= 50
                                ? 'text-amber-600' : 'text-red-600';
                        const initials = sup.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

                        return (
                            <motion.div
                                key={sup.id}
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.06 }}
                                className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-2 hover:bg-white hover:shadow-sm transition-all"
                            >
                                {/* Avatar */}
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[0.65rem] font-black shrink-0 shadow">
                                    {initials}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-gray-800 text-sm truncate capitalize">{sup.name}</div>
                                    <div className="text-[0.55rem] text-gray-400 mb-1.5">
                                        {sup.assigned_models.length > 0
                                            ? sup.assigned_models.slice(0, 2).join(', ') + (sup.assigned_models.length > 2 ? '…' : '')
                                            : 'No models assigned'}
                                    </div>
                                    {/* Stats chips */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                                            <CheckCircle2 size={8} /> {sup.logs_approved_today} Approved
                                        </span>
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700">
                                            <Clock size={8} /> {sup.logs_pending_review} Pending
                                        </span>
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700">
                                            <XCircle size={8} /> {sup.logs_rejected_today} Rejected
                                        </span>
                                    </div>
                                </div>

                                {/* Gauge on right */}
                                <div className="flex flex-col items-center shrink-0">
                                    <EfficiencyGauge pct={Math.round(sup.efficiency_pct)} />
                                    <span className="text-[0.5rem] text-gray-400 mt-0.5">Efficiency</span>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
