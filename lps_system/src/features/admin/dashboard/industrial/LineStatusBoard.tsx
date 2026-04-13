import React from 'react';
import { motion } from 'framer-motion';
import { Factory, User, UserCheck, Clock, CheckCircle2, AlertTriangle, Zap, Loader2 } from 'lucide-react';
import type { LiveLine } from '../../hooks/useAdminLive';

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string; border: string }> = {
    SUBMITTED: { label: 'SUBMITTED', dot: 'bg-blue-500 animate-pulse', badge: 'bg-blue-50 text-blue-700 border-blue-200', border: 'border-l-blue-500' },
    APPROVED: { label: 'APPROVED', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', border: 'border-l-emerald-500' },
    PENDING: { label: 'PENDING', dot: 'bg-amber-500 animate-pulse', badge: 'bg-amber-50 text-amber-700 border-amber-200', border: 'border-l-amber-500' },
    IN_PROGRESS: { label: 'IN PROGRESS', dot: 'bg-indigo-500 animate-pulse', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', border: 'border-l-indigo-500' },
    REJECTED: { label: 'REJECTED', dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 border-red-200', border: 'border-l-red-500' },
    VERIFIED: { label: 'VERIFIED', dot: 'bg-teal-500', badge: 'bg-teal-50 text-teal-700 border-teal-200', border: 'border-l-teal-500' },
    IDLE: { label: 'IDLE', dot: 'bg-gray-300', badge: 'bg-gray-50 text-gray-500 border-gray-200', border: 'border-l-gray-300' },
    'NO SUBMISSION': { label: 'NO LOG', dot: 'bg-gray-300', badge: 'bg-gray-50 text-gray-500 border-gray-200', border: 'border-l-gray-300' },
};

const getConfig = (status: string) => STATUS_CONFIG[status] || STATUS_CONFIG['IDLE'];

function timeAgo(isoString: string | null): string {
    if (!isoString) return '—';
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

interface Props {
    lines: LiveLine[];
    isLoading: boolean;
}

export const LineStatusBoard: React.FC<Props> = ({ lines, isLoading }) => {
    return (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm mb-2">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-3 border-b border-gray-100 bg-white">
                <div className="flex items-center gap-2.5">

                    <div className="w-1.5 h-6 bg-[#f37021] rounded-full"></div>

                    <div>
                        <h3 className="text-base font-bold text-[#f37021] tracking-tight">Shop Floor Live Status</h3>

                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isLoading && <Loader2 size={14} className="text-indigo-400 animate-spin" />}
                    <span className="text-sm font-bold text-black uppercase tracking-widest">
                        {lines.length} Line{lines.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            {/* Lines Grid */}
            <div className="p-3">
                {lines.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                        {isLoading ? 'Loading lines…' : 'No production lines found for current filters.'}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                        {lines.map((line, i) => {
                            const cfg = getConfig(line.log_status);
                            const oee = line.today_planned > 0
                                ? Math.round((line.today_actual / line.today_planned) * 100)
                                : null;

                            return (
                                <motion.div
                                    key={line.line_name}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                    className={`relative bg-white border border-l-4 ${cfg.border} border-slate-200 rounded-xl p-3 hover:shadow-md transition-all group`}
                                >
                                    {/* Status dot */}
                                    <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${cfg.dot}`} />

                                    {/* Line + Model */}
                                    <div className="mb-2">
                                        <div className="text-xs font-black text-black uppercase tracking-[0.15em] mb-0.5">{line.line_name}</div>
                                        {/* <div className="text-base font-black text-gray-800 truncate">{line.model}</div> */}
                                        {line.model_code && (
                                            <div className="text-[0.55rem] text-gray-400 font-mono">{line.model_code}</div>
                                        )}
                                    </div>

                                    {/* Assignments */}
                                    <div className="space-y-1.5 mb-3">
                                        <div className="flex items-center gap-2">
                                            <User size={11} className="text-teal-500 shrink-0" />
                                            <span className="text-xs capitalize font-semibold text-gray-600 truncate">{line.deo_name}</span>
                                            <span className="text-xs text-gray-800 font-medium ml-auto shrink-0">DEO</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <UserCheck size={11} className="text-indigo-500 shrink-0" />
                                            <span className="text-xs capitalize font-semibold text-gray-600 truncate">{line.supervisor_name}</span>
                                            <span className="text-xs text-gray-800 font-medium ml-auto shrink-0">SUP</span>
                                        </div>
                                    </div>

                                    {/* Stats row */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.55rem] font-bold border ${cfg.badge}`}>
                                            {cfg.label}
                                        </span>
                                        {line.entries_count > 0 && (
                                            <span className="text-[0.55rem] text-gray-500 font-mono">
                                                {line.entries_count} entries
                                            </span>
                                        )}
                                        {line.pending_reviews > 0 && (
                                            <span className="inline-flex items-center gap-0.5 text-[0.55rem] text-amber-600 font-bold">
                                                <AlertTriangle size={9} /> {line.pending_reviews} pending
                                            </span>
                                        )}
                                    </div>

                                    {/* OEE & Last Update */}
                                    <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                                        {oee !== null ? (
                                            <div className="flex items-center gap-1">
                                                <Zap size={10} className={oee >= 80 ? 'text-emerald-500' : oee >= 50 ? 'text-amber-500' : 'text-red-500'} />
                                                <span className={`text-[0.6rem] font-black ${oee >= 80 ? 'text-emerald-600' : oee >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                                    {oee}% OEE
                                                </span>
                                            </div>
                                        ) : <span />}
                                        <div className="flex items-center gap-1 text-gray-400">
                                            <Clock size={9} />
                                            <span className="text-[0.55rem]">{timeAgo(line.last_updated)}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
