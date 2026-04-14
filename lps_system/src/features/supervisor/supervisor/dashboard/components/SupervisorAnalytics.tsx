import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    Legend
} from 'recharts';
import { Activity, Target, ClipboardList } from 'lucide-react';

interface SupervisorAnalyticsProps {
    assignedModels: any[];
    verifications: any[];
}

const COLORS = {
    indigo: '#6366F1',
    emerald: '#10B981',
    amber: '#F59E0B',
    rose: '#EF4444',
    slate: '#94A3B8',
    orange: '#F37021',
};

export const SupervisorAnalytics = ({ assignedModels, verifications }: SupervisorAnalyticsProps) => {
    // 1. Line Work Progress (Actual vs Target by Line) - Grouped Bar
    const lineAggregation = assignedModels.reduce((acc, m) => {
        const line = m.line_name || 'Unassigned';
        if (!acc[line]) {
            acc[line] = { name: line, produced: 0, planned: 0 };
        }
        
        const planned = m.target_quantity || m.planned_qty || 0;
        const modelLogs = verifications.filter(v => v.car_model_id === m.id || v.model_name === m.name);
        const isVerified = modelLogs.some(v => v.status === 'VERIFIED' || v.status === 'APPROVED' || v.status === 'READY' || v.status === 'DONE');
        
        acc[line].planned += planned;
        acc[line].produced += isVerified ? planned : (m.actual_qty || 0);
        
        return acc;
    }, {} as Record<string, { name: string, produced: number, planned: number }>);

    const performanceData = (Object.values(lineAggregation) as { name: string, produced: number, planned: number }[])
        .filter(l => l.planned > 0)
        .sort((a, b) => a.name.localeCompare(b.name));

    // WorkForce deployment logic removed as per user request

    // 3. Shop Floor Live Status Data preparation
    const activeDeos = assignedModels.filter(m => m.assigned_deo_name).map(m => {
        const planned = m.target_quantity || m.planned_qty || 0;
        const actual = m.actual_qty || 0;
        const progress = planned > 0 ? (actual / planned) * 100 : 0;
        const isComplete = actual >= planned && planned > 0;
        const isIdle = actual === 0;

        return {
            deo: m.assigned_deo_name,
            line: m.line_name || 'N/A',
            model: m.name,
            progress: progress > 100 ? 100 : progress,
            status: isComplete ? 'Complete' : (isIdle ? 'Idle' : 'Active'),
        };
    });

    const renderHeader = (title: string, subtitle: string, icon: any, bgColor: string) => (
        <div className="flex items-center gap-3 mb-4">
            <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center text-white shadow-sm`}>
                {icon}
            </div>
            <div>
                <h3 className="text-[11px] font-black text-slate-800 leading-none uppercase tracking-tight">{title}</h3>
                <p className="text-[9px] font-bold text-ind-text3 mt-1">{subtitle}</p>
            </div>
        </div>
    );

    const cardClass = "bg-white rounded-2xl p-6 border border-ind-border/50 shadow-sm flex flex-col h-[320px] transition-all hover:shadow-md";

    return (
        <div className="space-y-3 pb-8 font-sans">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* 1. Line Work Progress (Grouped Bar Chart) */}
                <div className={cardClass}>
                    {renderHeader("Line Work Progress", "Planned vs produced output per line", <Target size={16} />, "bg-[#F37021]")}
                    <div className="flex-1 w-full overflow-hidden">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={performanceData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }} barGap={6}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#94A3B8', fontSize: 9, fontWeight: 700 }} 
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 9, fontWeight: 700 }} />
                                <Tooltip 
                                    cursor={{ fill: '#F8FAFC' }} 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.05)', fontSize: '10px', fontWeight: 'bold' }} 
                                />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '8px' }} formatter={(v) => <span className="text-[9px] font-bold text-ind-text2 uppercase tracking-wide">{v} units</span>} />
                                <Bar dataKey="produced" fill={COLORS.emerald} radius={[3, 3, 0, 0]} barSize={20} name="produced" />
                                <Bar dataKey="planned" fill={COLORS.orange} radius={[3, 3, 0, 0]} barSize={20} name="planned" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Model Assignments List */}
                <div className={cardClass}>
                    {renderHeader("Active Assignments", "Models assigned to supervision", <Activity size={16} />, "bg-indigo-500")}
                    <div className="flex-1 w-full overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
                        <div className="space-y-2 mt-1 pb-2">
                            {assignedModels.map((m, i) => {
                                const planned = m.target_quantity || m.planned_qty || 0;
                                const actual = m.actual_qty || 0;
                                const isComplete = actual >= planned && planned > 0;
                                
                                return (
                                    <div key={i} className="flex justify-between items-center p-3 rounded-xl border border-ind-border/30 hover:border-indigo-200 transition-all group hover:bg-indigo-50/30">
                                        <div>
                                            <h4 className="text-[10px] font-black tracking-widest uppercase text-slate-800">{m.name}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">
                                                    {m.line_name || 'No Line'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-[12px] font-black text-indigo-600 tabular-nums leading-none tracking-tight">{actual}</span>
                                                <span className="text-[8px] font-bold text-slate-400">/ {planned}</span>
                                            </div>
                                            <span className={`text-[7px] font-black tracking-widest mt-1 uppercase ${isComplete ? 'text-emerald-500' : 'text-orange-500'}`}>
                                                {isComplete ? 'Completed' : 'In Progress'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            {assignedModels.length === 0 && (
                                <div className="h-40 flex items-center justify-center text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                    No models assigned
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Shop Floor Live Status */}
            <div className={`${cardClass} h-auto min-h-[350px] overflow-hidden`}>
                {renderHeader("Shop Floor Live Status", "Real-time operator activity under supervision", <Activity size={16} />, "bg-emerald-500")}
                <div className="flex-1 w-full overflow-auto mt-2 max-h-[250px] pr-1 custom-scrollbar">
                    <table className="w-full text-left border-separate border-spacing-0 min-w-[600px]">
                        <thead className="sticky top-0 z-10">
                            <tr>
                                <th className="py-3 px-4 text-[9px] font-black uppercase tracking-[0.15em] bg-slate-50 text-black border-b-2 border-slate-200">Operator (DEO)</th>
                                <th className="py-3 px-4 text-[9px] font-black uppercase tracking-[0.15em] bg-slate-50 text-black border-b-2 border-slate-200">Line</th>
                                <th className="py-3 px-4 text-[9px] font-black uppercase tracking-[0.15em] bg-slate-50 text-black border-b-2 border-slate-200">Model Assigned.</th>
                                <th className="py-3 px-4 text-[9px] font-black uppercase tracking-[0.15em] bg-slate-50 text-black border-b-2 border-slate-200 w-1/4">Progress.</th>
                                <th className="py-3 px-4 text-[9px] font-black uppercase tracking-[0.15em] bg-slate-50 text-black border-b-2 border-slate-200 text-right">State</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ind-border/40">
                            {activeDeos.map((deo, i) => (
                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-3 px-4 text-[11px] font-black text-slate-800 uppercase tracking-widest">{deo.deo}</td>
                                    <td className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{deo.line}</td>
                                    <td className="py-3 px-4 text-[10px] font-bold text-indigo-600 tracking-wider truncate max-w-[150px]">{deo.model}</td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full ${deo.status === 'Complete' ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                                                    style={{ width: `${deo.progress}%` }} 
                                                />
                                            </div>
                                            <span className="text-[9px] font-bold text-slate-500 tabular-nums">{Math.round(deo.progress)}%</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <span className={`inline-flex px-2 py-1 rounded shadow-sm text-[8px] font-black uppercase tracking-widest
                                            ${deo.status === 'Active' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : ''}
                                            ${deo.status === 'Idle' ? 'bg-orange-50 text-orange-600 border border-orange-100' : ''}
                                            ${deo.status === 'Complete' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : ''}
                                        `}>
                                            {deo.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {activeDeos.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        No active operators found on floor
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
