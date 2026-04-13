import React from 'react';
import { motion } from 'framer-motion';
import { User, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { LiveDEO } from '../../hooks/useAdminLive';

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

const STATUS_COLORS: Record<string, string> = {
    SUBMITTED: 'bg-blue-50 text-blue-700 border-blue-200',
    APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    REJECTED: 'bg-red-50 text-red-700 border-red-200',
    VERIFIED: 'bg-teal-50 text-teal-700 border-teal-200',
    'NO SUBMISSION': 'bg-gray-100 text-gray-500 border-gray-200',
    DRAFT: 'bg-purple-50 text-purple-700 border-purple-200',
};

interface Props {
    deos: LiveDEO[];
    isLoading: boolean;
}

export const DEOActivityPanel: React.FC<Props> = ({ deos, isLoading }) => {
    return (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm h-full">
            <div className="flex items-center justify-between px-3 py-3 border-b border-gray-100 bg-white">
                <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-6 bg-[#f37021] rounded-full"></div>
                    <div>
                        <h3 className="text-base font-bold text-[#f37021] tracking-tight">DEO Activity</h3>

                    </div>
                </div>
                {isLoading && <Loader2 size={14} className="text-teal-400 animate-spin" />}
            </div>

            <div className="p-3 space-y-2 overflow-y-auto max-h-[480px] custom-scrollbar">
                {deos.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                        {isLoading ? 'Loading DEO data…' : 'No DEO data for current filters.'}
                    </div>
                ) : (
                    deos.map((deo, i) => {
                        const total = deo.entries_submitted;
                        const pct = total > 0 ? Math.round((deo.entries_verified / total) * 100) : 0;
                        const initials = deo.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                        const statusColor = STATUS_COLORS[deo.log_status] || STATUS_COLORS['NO SUBMISSION'];

                        return (
                            <motion.div
                                key={deo.id}
                                initial={{ opacity: 0, x: 12 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.06 }}
                                className="bg-gray-50 border border-gray-100 rounded-xl p-3 hover:bg-white hover:shadow-sm transition-all"
                            >
                                <div className="flex items-start gap-3">
                                    {/* Avatar */}
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center text-white text-[0.65rem] font-black shrink-0 shadow">
                                        {initials}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <span className="font-bold text-gray-800 text-sm truncate capitalize">{deo.name}</span>
                                            <span className={`shrink-0 inline-block px-1.5 py-0.5 rounded border text-[0.5rem] font-bold ${statusColor}`}>
                                                {deo.log_status}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[0.55rem] text-gray-500 truncate">
                                                {deo.model !== '—' ? deo.model : 'No model'}
                                            </span>
                                            {deo.line !== '—' && (
                                                <>
                                                    <span className="text-gray-300">·</span>
                                                    <span className="text-[0.55rem] font-bold text-indigo-500">{deo.line}</span>
                                                </>
                                            )}
                                        </div>

                                        {/* Progress bar */}
                                        {total > 0 ? (
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[0.5rem] text-gray-400">
                                                        <CheckCircle2 size={8} className="inline text-emerald-500 mr-0.5" />
                                                        {deo.entries_verified}/{total} verified
                                                    </span>
                                                    <span className="text-[0.5rem] font-bold text-gray-600">{pct}%</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${pct}%` }}
                                                        transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.06 }}
                                                        className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
                                                    />
                                                </div>
                                                {deo.entries_pending > 0 && (
                                                    <div className="flex items-center gap-0.5 mt-1">
                                                        <AlertCircle size={8} className="text-amber-500" />
                                                        <span className="text-[0.5rem] text-amber-600">{deo.entries_pending} pending review</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-[0.5rem] text-gray-400 italic">No entries submitted yet</div>
                                        )}
                                    </div>
                                </div>

                                {/* Last submission */}
                                <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100">
                                    <Clock size={9} className="text-gray-300" />
                                    <span className="text-[0.5rem] text-gray-400">Last submission: {timeAgo(deo.last_submission)}</span>
                                    <span className="ml-auto text-[0.5rem] text-gray-400">{deo.logs_count} log{deo.logs_count !== 1 ? 's' : ''}</span>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
