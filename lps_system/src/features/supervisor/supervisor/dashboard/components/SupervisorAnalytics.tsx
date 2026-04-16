import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend
} from 'recharts';
import { Activity } from 'lucide-react';

interface SupervisorAnalyticsProps {
    assignedModels: any[];
    verifications: any[];
}

export const SupervisorAnalytics = ({ assignedModels, verifications }: SupervisorAnalyticsProps) => {
    // 1. Line Work Progress — compute efficiency % per line
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

    // Convert to efficiency % for the chart
    const efficiencyData = (Object.values(lineAggregation) as { name: string, produced: number, planned: number }[])
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(l => {
            const efficiency = l.planned > 0 ? Math.round((l.produced / l.planned) * 100) : 0;
            const pending = l.planned > 0 ? Math.max(0, 100 - efficiency) : 0;
            return {
                name: l.name.toLowerCase(),
                'In Progress': Math.min(efficiency, 100),
                'Pending': pending,
            };
        });

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

    const cardClass = "bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col h-[380px] transition-all hover:shadow-md";

    return (
        <div className="space-y-2 pb-2 font-sans">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 px-2">
                {/* 1. Line Work Progress (Efficiency Bar Chart) */}
                <div className={cardClass}>
                    {/* Header — orange bar + title + LIVE MONITORING badge */}
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2.5">
                            <div className="w-1.5 h-7 bg-[#F37021] rounded-full"></div>
                            <h3 className="text-base font-extrabold text-[#F37021] tracking-tight">Line Work Progress</h3>
                        </div>
                        <span className="px-4 py-1.5 rounded-full border border-gray-300 text-[10px] font-black text-gray-700 uppercase tracking-widest">
                            Live Monitoring
                        </span>
                    </div>

                    {/* Chart */}
                    <div className="flex-1 w-full overflow-hidden">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={efficiencyData} margin={{ top: 5, right: 15, left: 5, bottom: 5 }} barGap={4} barCategoryGap="25%">
                                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E2E8F0" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#1E293B', fontSize: 11, fontWeight: 800 }} 
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }}
                                    domain={[0, 100]}
                                    ticks={[0, 25, 50, 75, 100]}
                                    label={{ value: 'Efficiency %', angle: -90, position: 'insideLeft', offset: 10, style: { fill: '#F37021', fontSize: 11, fontWeight: 800 } }}
                                />
                                <Tooltip 
                                    cursor={{ fill: 'rgba(243,112,33,0.04)' }} 
                                    contentStyle={{ 
                                        borderRadius: '12px', 
                                        border: '1px solid #E2E8F0', 
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.08)', 
                                        fontSize: '11px', 
                                        fontWeight: 'bold',
                                        padding: '10px 14px'
                                    }}
                                    formatter={(value: any, name: any) => [`${value}%`, name]}
                                />
                                <Legend 
                                    iconType="circle" 
                                    wrapperStyle={{ paddingTop: '12px' }} 
                                    formatter={(v) => <span className="text-[11px] font-black text-gray-600 uppercase tracking-wider ml-1">{v}</span>} 
                                />
                                <Bar dataKey="In Progress" fill="#10B981" radius={[4, 4, 0, 0]} barSize={50} />
                                <Bar dataKey="Pending" fill="#D1FAE5" radius={[4, 4, 0, 0]} barSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Model Assignments List */}
                <div className={cardClass}>
                    <div className="flex items-center gap-2.5 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white shadow-sm">
                            <Activity size={16} />
                        </div>
                        <div>
                            <h3 className="text-[11px] font-black text-[#F37021] leading-none uppercase tracking-tight">Active Assignments</h3>
                        </div>
                    </div>
                    <div className="flex-1 w-full overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
                        <div className="space-y-2 mt-1 pb-2">
                            {assignedModels.map((m, i) => {
                                const planned = m.target_quantity || m.planned_qty || 0;
                                const actual = m.actual_qty || 0;
                                const isComplete = actual >= planned && planned > 0;
                                
                                return (
                                    <div key={i} className="flex justify-between items-center p-3 rounded-xl border border-gray-200 hover:border-indigo-200 transition-all group hover:bg-indigo-50/30">
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
            <div className="px-2">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Section Header - matching admin LineStatusBoard style */}
                    <div className="flex items-center justify-between px-3 py-3 border-b border-gray-100 bg-white">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white shadow-sm">
                                <Activity size={16} />
                            </div>
                            <div>
                                <h3 className="text-[11px] font-black text-[#F37021] leading-none uppercase tracking-tight">Shop Floor Live Status</h3>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="w-full overflow-auto max-h-[250px] pr-1 custom-scrollbar">
                        <table className="w-full text-left border-separate border-spacing-0 min-w-[600px]">
                            <thead className="sticky top-0 z-10">
                                <tr>
                                    <th className="py-3 px-4 text-xs font-bold text-black uppercase tracking-wider bg-white border-b-2 border-[#f37021]">Operator (DEO)</th>
                                    <th className="py-3 px-4 text-xs font-bold text-black uppercase tracking-wider bg-white border-b-2 border-[#f37021]">Line</th>
                                    <th className="py-3 px-4 text-xs font-bold text-black uppercase tracking-wider bg-white border-b-2 border-[#f37021]">Model Assigned</th>
                                    <th className="py-3 px-4 text-xs font-bold text-black uppercase tracking-wider bg-white border-b-2 border-[#f37021] w-1/4">Progress</th>
                                    <th className="py-3 px-4 text-xs font-bold text-black uppercase tracking-wider bg-white border-b-2 border-[#f37021] text-right">State</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
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
        </div>
    );
};
