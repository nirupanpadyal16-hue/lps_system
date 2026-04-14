import { useMemo, useState } from 'react';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    Legend,
    LabelList,
    AreaChart,
    Area
} from 'recharts';
import { TrendingUp, Activity, PieChart as PieIcon, LineChart as ChartIcon } from 'lucide-react';

interface DEOAnalyticsProps {
    assignedModels: any[];
    submissionHistory: any[];
    shortageRequests: any[];
    selectedDate: string;
}

const COLORS = {
    indigo: '#6366F1',
    emerald: '#10B981',
    amber: '#F59E0B',
    rose: '#EF4444',
    mint: '#bbf7d0',
    orange: '#f37021',
    blue: '#3b82f6',
    slate: '#94A3B8',

};

export const DEOAnalytics = ({ assignedModels, submissionHistory, shortageRequests, selectedDate }: DEOAnalyticsProps) => {
    // 0. Filter submission history for the selected date
    const todaysSubmissions = useMemo(() => {
        if (!selectedDate) return submissionHistory;
        try {
            const dateStr = new Date(selectedDate).toISOString().split('T')[0];
            return submissionHistory.filter(s => s.date?.split('T')[0] === dateStr);
        } catch (e) {
            return submissionHistory;
        }
    }, [submissionHistory, selectedDate]);

    // 1. Aggregated Model Performance (Grouped by Shortage Request Progress)
    const performanceData = useMemo(() => {
        const groups: Record<string, { name: string; originalName: string; output: number; planned: number }> = {};

        // 1. Initialize groups with assigned models (Ensures they appear even with 0 requests)
        assignedModels.forEach(m => {
            const name = (m.name || 'PART').toUpperCase();
            if (!groups[name]) {
                const shortName = name.length > 8 ? name.substring(0, 8) + '..' : name;
                groups[name] = { name: shortName, originalName: name, output: 0, planned: 0 };
            }
        });

        // 2. Add shortage request data to the groups
        shortageRequests.forEach(r => {
            const name = (r.inventory_item?.vehicle_name || r.vehicle_name || 'PART').trim().toUpperCase();
            
            // Use shortage_quantity if available, otherwise fallback to demand_quantity for the baseline
            const actualValue = r.shortage_quantity > 0 ? r.shortage_quantity : (r.inventory_item?.demand_quantity || 0);
            const isCompleted = ['COMPLETED', 'DEO_FILLED', 'VERIFIED'].includes(r.status);
            
            if (!groups[name]) {
                const shortName = name.length > 8 ? name.substring(0, 8) + '..' : name;
                groups[name] = { name: shortName, originalName: name, output: 0, planned: 0 };
            }

            // Planned = Total sum of all request targets (Pending + In Progress + Completed)
            groups[name].planned += actualValue;
            
            // Produced = Sum only for completed models
            groups[name].output += isCompleted ? actualValue : 0;
        });

        return Object.values(groups).sort((a, b) => b.output - a.output);
    }, [assignedModels, shortageRequests]);

    // 2. Model Status Mix (Order Status mapped to Shortage Requests)
    const statusData = useMemo(() => {
        const completed = shortageRequests.filter(r => r.status === 'COMPLETED' || r.status === 'DEO_FILLED').length;
        const pending = shortageRequests.filter(r => r.status === 'PENDING').length;
        const inProgress = shortageRequests.filter(r => r.status === 'IN_PROGRESS').length;
        const rejected = shortageRequests.filter(r => r.status === 'REJECTED').length;

        return [
            { name: 'Pending', value: pending, color: COLORS.amber },
            { name: 'In Progress', value: inProgress, color: COLORS.blue },
            { name: 'Completed', value: completed, color: COLORS.emerald },
            { name: 'Rejected', value: rejected, color: COLORS.rose }
        ].filter(d => d.value > 0);
    }, [shortageRequests]);

    // 2b. Shortages by Line Distribution
    const shortageByLineData = useMemo(() => {
        const counts: Record<string, number> = {};
        shortageRequests.filter(r => ['PENDING', 'REJECTED'].includes(r.status)).forEach(r => {
            const line = r.line_name || 'Generic';
            counts[line] = (counts[line] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({
            name,
            value,
            color: name.toLowerCase().includes('u301') ? COLORS.amber : COLORS.rose
        })).sort((a, b) => b.value - a.value);
    }, [shortageRequests]);

    // 3. Historical Production Trend (Week/Month)
    const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year'>('month');

    const trendData = useMemo(() => {
        if (timeframe === 'year') {
            const yearsMap: Record<string, any> = {};
            const currentYear = new Date().getFullYear();

            // Pre-fill the last 5 years so the chart always has a timeline
            for (let i = 4; i >= 0; i--) {
                const yr = (currentYear - i).toString();
                yearsMap[yr] = { name: yr, production: 0, models: {}, modelCount: 0 };
            }

            shortageRequests.forEach(s => {
                const dateRaw = s.created_at || s.updated_at || new Date().toISOString();
                const d = new Date(dateRaw);
                const yr = d.getFullYear().toString();

                if (!yearsMap[yr]) {
                    yearsMap[yr] = { name: yr, production: 0, models: {}, modelCount: 0 };
                }

                const qty = s.status === 'COMPLETED' ? (s.inventory_item?.demand_quantity || s.shortage_quantity || 0) : (s.shortage_quantity || 0);
                if (qty > 0) {
                    yearsMap[yr].production += qty;
                    const modelName = s.inventory_item?.vehicle_name || s.vehicle_name || 'Generic';
                    yearsMap[yr].models[modelName] = (yearsMap[yr].models[modelName] || 0) + qty;
                    yearsMap[yr].modelCount = Object.keys(yearsMap[yr].models).length;
                }
            });

            return Object.values(yearsMap).sort((a: any, b: any) => parseInt(a.name) - parseInt(b.name));

        } else if (timeframe === 'month') {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthlyCounts = months.map(m => ({ name: m, production: 0, models: {} as any }));

            shortageRequests.forEach(s => {
                const dateRaw = s.created_at || s.updated_at || new Date().toISOString();
                const date = new Date(dateRaw);
                const monthIdx = date.getMonth();
                const qty = s.status === 'COMPLETED' ? (s.inventory_item?.demand_quantity || s.shortage_quantity || 0) : (s.shortage_quantity || 0);

                if (qty > 0) {
                    monthlyCounts[monthIdx].production += qty;
                    const modelName = s.inventory_item?.vehicle_name || s.vehicle_name || 'Generic';
                    monthlyCounts[monthIdx].models[modelName] = (monthlyCounts[monthIdx].models[modelName] || 0) + qty;
                    (monthlyCounts[monthIdx] as any).modelCount = Object.keys(monthlyCounts[monthIdx].models).length;
                }
            });
            return monthlyCounts;
        } else {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const dayCounts: any[] = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                dayCounts.push({
                    name: days[d.getDay()],
                    fullDate: d.toISOString().split('T')[0],
                    production: 0,
                    models: {} as any
                });
            }

            shortageRequests.forEach(s => {
                const dateRaw = s.created_at || s.updated_at || new Date().toISOString();
                const sDate = dateRaw.split('T')[0];
                const match = dayCounts.find(d => d.fullDate === sDate);
                if (match) {
                    const qty = s.status === 'COMPLETED' ? (s.inventory_item?.demand_quantity || s.shortage_quantity || 0) : (s.shortage_quantity || 0);
                    if (qty > 0) {
                        match.production += qty;
                        const modelName = s.inventory_item?.vehicle_name || s.vehicle_name || 'Generic';
                        match.models[modelName] = (match.models[modelName] || 0) + qty;
                        (match as any).modelCount = Object.keys(match.models).length;
                    }
                }
            });
            return dayCounts;
        }
    }, [shortageRequests, timeframe]);

    // 2. Pending Models Backlog (Derived directly from shortage requests)
    const pendingChartData = useMemo(() => {
        const groups: Record<string, { name: string; quantity: number }> = {};

        shortageRequests.forEach(r => {
            // Only count models with active backlog
            if (['PENDING', 'IN_PROGRESS', 'REJECTED'].includes(r.status)) {
                const name = (r.inventory_item?.vehicle_name || r.vehicle_name || 'PART').toUpperCase().trim();
                if (!groups[name]) {
                    groups[name] = { name, quantity: 0 };
                }
                groups[name].quantity += (r.shortage_quantity || 0);
            }
        });

        return Object.values(groups).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
    }, [shortageRequests]);

    const renderHeader = (title: string, subtitle: string, icon: any, bgColor: string) => (
        <div className="flex items-center gap-3 mb-6">
            <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center text-white shadow-sm border border-white/10`}>
                {icon}
            </div>
            <div>
                <h3 className="text-sm font-[950] text-ind-text leading-none tracking-tight">{title}</h3>
                <p className="text-[10px] font-bold text-ind-text3 mt-1.5 uppercase tracking-widest">{subtitle}</p>
            </div>
        </div>
    );

    const CustomTrendTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const modelEntries = Object.entries(data.models || {});
            return (
                <div className="bg-white/95 backdrop-blur-2xl border border-white/40 p-5 rounded-[1.5rem] shadow-2xl animate-in zoom-in-95 duration-200">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-ind-primary mb-3">{data.name}</p>
                    <div className="space-y-2">
                        {modelEntries.length > 0 ? (
                            modelEntries.map(([name, qty]: any) => (
                                <div key={name} className="flex items-center gap-6 justify-between min-w-[140px]">
                                    <span className="text-[10px] font-bold text-ind-text2 uppercase tracking-tight">{name} FINISHED:</span>
                                    <span className="text-[10px] font-black text-ind-text">{qty}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-[10px] font-bold text-ind-text3 uppercase italic">No production logged</p>
                        )}
                        {data.production > 0 && (
                            <div className="mt-3 pt-3 border-t border-ind-border/50/50 space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">MODELS ASSIGNED:</span>
                                    <span className="text-[10px] font-black text-ind-text">{data.modelCount || 0}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">TOTAL PRODUCTION:</span>
                                    <span className="text-[10px] font-black text-ind-text">{data.production} Units</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    const cardClass = "bg-white rounded-[1.5rem] p-8 border border-ind-border/50 shadow-sm flex flex-col h-[400px] transition-all hover:shadow-md";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 font-sans overflow-hidden">
            {/* 1. Primary Production Progress Chart (Left) */}
            <div className="bg-white rounded-2xl p-3 border border-ind-border/50 shadow-sm flex flex-col h-[420px] transition-all hover:shadow-md">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-ind-border/50">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-5 bg-orange-600 rounded-full" />
                        <h3 className="text-base font-bold text-[#f37021] tracking-tight">
                            Quantity Produced vs Planned Target
                        </h3>
                    </div>
                    {performanceData.length > 4 && (
                        <div className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-full flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-slate-400" />
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Scroll for more models</span>
                        </div>
                    )}
                </div>

                <div className="flex-1 w-full mt-4 overflow-x-auto overflow-y-hidden pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                    <div style={{ minWidth: performanceData.length > 4 ? `${performanceData.length * 150}px` : '100%', height: 'calc(100% - 20px)' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={performanceData}
                                margin={{ top: 30, right: 10, left: -20, bottom: 0 }}
                                barGap={12}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#1e293b', fontSize: 10, fontWeight: 900 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94A3B8', fontSize: 9, fontWeight: 700 }}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', fontSize: '10px', fontWeight: 'bold' }}
                                />
                                <Legend
                                    verticalAlign="top"
                                    align="right"
                                    height={40}
                                    iconType="circle"
                                    iconSize={8}
                                    wrapperStyle={{
                                        fontSize: '9px',
                                        fontWeight: 900,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.1em',
                                        color: '#475569',
                                        paddingBottom: '20px'
                                    }}
                                />
                                <Bar name="PLANNED" dataKey="planned" fill={COLORS.mint} radius={[6, 6, 0, 0]} barSize={28}>
                                    <LabelList dataKey="planned" position="top" style={{ fill: '#10b981', fontSize: 10, fontWeight: 900, marginBottom: 8 }} />
                                </Bar>
                                <Bar name="PRODUCED" dataKey="output" fill={COLORS.orange} radius={[6, 6, 0, 0]} barSize={28}>
                                    <LabelList dataKey="output" position="top" style={{ fill: '#f97316', fontSize: 10, fontWeight: 900, marginBottom: 8 }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* 2. Top Pending Models (Right - Horizontal Bar Chart) */}
            <div className="bg-white rounded-2xl p-3 border border-ind-border/50 shadow-sm flex flex-col h-[420px] transition-all hover:shadow-md">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-ind-border/50">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-5 bg-orange-600 rounded-full" />
                        <h3 className="text-base font-bold text-[#f37021] tracking-tight">Top Pending Vehicle Models</h3>
                    </div>
                    <span className="bg-rose-50 text-rose-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-rose-100">Top 5 Pending</span>
                </div>

                <div className="flex-1 w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            layout="vertical"
                            data={pendingChartData}
                            margin={{ top: 5, right: 60, left: 40, bottom: 5 }}
                        >
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#1e293b', fontSize: 11, fontWeight: 900 }}
                                width={100}
                            />
                            <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }} />
                            <Bar
                                dataKey="quantity"
                                fill="url(#pendingGradient)"
                                radius={[10, 10, 10, 10]}
                                barSize={24}
                            >
                                <LabelList dataKey="quantity" position="right" style={{ fill: '#ef4444', fontSize: 12, fontWeight: 900, paddingLeft: 10 }} />
                            </Bar>
                            <defs>
                                <linearGradient id="pendingGradient" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#fee2e2" />
                                    <stop offset="100%" stopColor="#ef4444" />
                                </linearGradient>
                            </defs>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 3. Order Status (Bottom Left) */}
            <div className="bg-white rounded-2xl p-3 border border-ind-border/50 shadow-sm flex flex-col h-[420px] transition-all hover:shadow-md">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-ind-border/50">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-5 bg-orange-600 rounded-full" />
                        <h3 className="text-base font-bold text-[#f37021] tracking-tight">Order Status</h3>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Live Monitoring</span>
                    </div>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                    <div className="md:col-span-3 h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={95}
                                    paddingAngle={8}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="md:col-span-2 space-y-4 pr-4">
                        {statusData.map((item, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{item.name}</span>
                                </div>
                                <span className="text-sm font-black text-slate-900">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 4. Production Trend (Bottom Right) */}
            <div className="bg-white rounded-2xl p-3 border border-ind-border/50 shadow-sm flex flex-col h-[420px] transition-all hover:shadow-md">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-ind-border/50">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-5 bg-orange-600 rounded-full" />
                        <h3 className="text-base font-bold text-[#f37021] tracking-tight">Production Trend</h3>
                    </div>
                    <div className="relative">
                        <select
                            value={timeframe}
                            onChange={(e) => setTimeframe(e.target.value as any)}
                            className="appearance-none bg-slate-50 border border-slate-200 text-slate-900 text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors pr-8 outline-none"
                        >
                            <option value="week">WEEK</option>
                            <option value="month">MONTH</option>
                            <option value="year">YEAR</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="flex-1 w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }}
                            />
                            <Tooltip content={<CustomTrendTooltip />} cursor={{ stroke: '#10b981', strokeWidth: 2 }} />
                            <Area
                                type="monotone"
                                dataKey="production"
                                stroke="#10b981"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#trendGradient)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
