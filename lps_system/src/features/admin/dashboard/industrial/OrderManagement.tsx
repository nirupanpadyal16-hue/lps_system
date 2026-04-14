import React from 'react';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    RadialLinearScale,
    Filler
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { motion, AnimatePresence } from 'framer-motion';
import { MailOpen, ChevronDown, Search, Calendar, MessageSquare, User, Cpu, ClipboardCheck } from 'lucide-react';
import type { MailOrder } from '../../hooks/useIndustrialState';

// Register ChartJS
ChartJS.register(
    ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement,
    PointElement, LineElement, RadialLinearScale, Filler
);

interface MailOrderProps {
    orders: MailOrder[];
    onViewDetail: (id: string) => void;
}

const OrderCard: React.FC<{
    order: MailOrder;
    isExpanded: boolean;
    onToggle: () => void;
}> = ({ order: o, isExpanded, onToggle }) => {

    return (
        <div className={`bg-white border transition-all duration-300 rounded-[2rem] overflow-hidden group relative shadow-xs ${isExpanded ? 'border-blue-300 shadow-xl ring-2 ring-blue-500/5' : 'border-ind-border/50 hover:border-blue-200'
            }`}>
            {/* Entity Header - Clickable Area */}
            <div
                onClick={onToggle}
                className="p-6 md:p-8 cursor-pointer flex items-start justify-between gap-6 hover:bg-slate-50/50 transition-colors"
            >
                <div className="flex items-center gap-6">
                    <div className={`w-14 h-14 md:w-16 md:h-16 rounded-[1.25rem] flex items-center justify-center transition-all duration-500 ${isExpanded ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105' : 'bg-ind-bg text-ind-text3 border border-ind-border/50 ring-4 ring-slate-50/50'
                        }`}>
                        <User size={28} strokeWidth={isExpanded ? 2 : 1.5} />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="text-xl md:text-2xl font-black text-ind-text tracking-tight">To car model</div>
                            {isExpanded && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[0.6rem] font-black uppercase tracking-widest rounded-md"
                                >
                                    Detailed View
                                </motion.div>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-black text-slate-800">{o.customer || o.company}</span>
                            <span className="text-sm font-bold text-ind-text3 hidden md:inline-block">&lt;{o.email}&gt;</span>
                        </div>
                        <div className="text-[0.65rem] md:text-[0.7rem] font-bold text-ind-text3 mt-1.5 opacity-60">Received: {o.date}, 03:26 PM</div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                    <div className={`text-[0.7rem] font-black tracking-widest px-4 py-2 rounded-xl border-2 transition-all duration-300 ${o.status === 'pending' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                        o.status === 'accepted' || o.status === 'approved' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-ind-bg text-ind-text3 border-ind-border/50'
                        }`}>
                        {o.status.toUpperCase()}
                    </div>
                    <div className={`p-2 rounded-full transition-transform duration-300 ${isExpanded ? 'bg-blue-50 text-blue-600 rotate-180' : 'bg-ind-bg text-ind-text3'}`}>
                        <ChevronDown size={16} strokeWidth={2.5} />
                    </div>
                </div>
            </div>

            {/* Accordion Content Area */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                        className="overflow-hidden"
                    >
                        <div className="px-8 pb-8 space-y-6">
                            {/* Data Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-blue-100/50 rounded-[1.5rem] overflow-hidden bg-blue-50/20 shadow-xs">
                                <div className="p-6 border-b md:border-b-0 md:border-r border-blue-100/30 flex flex-col items-center justify-center gap-3">
                                    <div className="flex items-center gap-2 text-[0.65rem] font-black text-ind-text3 uppercase tracking-widest">
                                        <Cpu size={14} className="text-orange-500" />
                                        Model detected
                                    </div>
                                    <div className="text-xl font-black text-slate-800">{o.model}</div>
                                </div>
                                <div className="p-6 border-b md:border-b-0 md:border-r border-blue-100/30 flex flex-col items-center justify-center gap-3">
                                    <div className="flex items-center gap-2 text-[0.65rem] font-black text-ind-text3 uppercase tracking-widest">
                                        <ClipboardCheck size={14} className="text-emerald-500" />
                                        Required quantity
                                    </div>
                                    <div className="text-xl font-black text-slate-800">{o.qty} Units</div>
                                </div>
                                <div className="p-6 flex flex-col items-center justify-center gap-3">
                                    <div className="flex items-center gap-2 text-[0.65rem] font-black text-ind-text3 uppercase tracking-widest">
                                        <div className="w-2.5 h-2.5 rounded-full border-2 border-blue-500" />
                                        System status
                                    </div>
                                    <div className={`text-xl font-black ${o.status === 'pending' ? 'text-orange-500' : 'text-blue-500'}`}>
                                        {o.status.toUpperCase()}
                                    </div>
                                </div>
                            </div>

                            {/* Message Body Area */}
                            <div className="relative pt-6 border-t border-ind-border/30">
                                <div className="absolute -top-3 left-8 px-4 bg-white text-[0.65rem] font-black text-blue-500 tracking-widest uppercase border border-ind-border/30 rounded-full flex items-center gap-2 shadow-sm">
                                    <MessageSquare size={12} />
                                    Message body
                                </div>
                                <div className="text-[0.9rem] text-ind-text2 leading-[1.8] font-medium pt-4 px-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                    {o.msg}
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onToggle(); }}
                                    className="px-8 py-3 rounded-xl bg-slate-900 text-white font-bold text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95"
                                >
                                    Hide Intelligence
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export const MailOrderSection: React.FC<Pick<MailOrderProps, 'orders'>> = ({ orders }) => {
    const [statusFilter, setStatusFilter] = React.useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [dateFilter, setDateFilter] = React.useState('');
    const [isFilterOpen, setIsFilterOpen] = React.useState(false);
    const [expandedOrderId, setExpandedOrderId] = React.useState<string | null>(null);

    // Accordion Logic
    const handleToggle = (id: string) => {
        setExpandedOrderId(prev => prev === id ? null : id);
    };

    // Filter Logic
    const filteredOrders = orders.filter(o => {
        const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
        const matchesSearch = o.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
            o.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
            o.model.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDate = !dateFilter || o.date === dateFilter;
        return matchesStatus && matchesSearch && matchesDate;
    });

    // Stats for Chart
    const pendingCount = orders.filter(o => o.status === 'pending').length;
    const acceptedCount = orders.filter(o => o.status === 'accepted' || o.status === 'approved').length;
    const rejectedCount = orders.filter(o => o.status === 'rejected').length;

    const chartData = {
        labels: ['Pending', 'Accepted', 'Rejected'],
        datasets: [{
            data: [pendingCount, acceptedCount, rejectedCount],
            backgroundColor: ['#F37021', '#4285F4', '#94A3B8'],
            borderWidth: 0,
            hoverOffset: 4,
            cutout: '78%',
            borderRadius: 8
        }]
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { display: false }
        },
        maintainAspectRatio: false
    };

    const filterOptions = [
        { id: 'all', label: 'All Statuses' },
        { id: 'pending', label: 'Pending' },
        { id: 'accepted', label: 'Accepted' },
        { id: 'rejected', label: 'Rejected' }
    ];

    return (
        <div className="bg-white border border-ind-border/60 rounded-2xl overflow-hidden shadow-sm animate-in fade-in zoom-in-95 duration-500  flex flex-col">
            {/* Header */}
            <div className="p-2 border-b border-ind-border/50 bg-white space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100/50">
                            <MailOpen size={22} />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-slate-800 tracking-tight">Mail order requests</h2>
                            <p className="text-[0.7rem] font-bold text-ind-text3 mt-0.5">Real-time production demand monitoring</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <button
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className="flex items-center gap-3 px-5 py-2.5 bg-ind-bg border border-ind-border/60 rounded-xl text-[0.75rem] font-bold text-ind-text2 hover:border-blue-400 transition-all shadow-xs"
                            >
                                {filterOptions.find(o => o.id === statusFilter)?.label}
                                <ChevronDown size={14} className={`text-ind-text3 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isFilterOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-white border border-ind-border rounded-2xl shadow-2xl z-50 overflow-hidden py-1">
                                    {filterOptions.map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => {
                                                setStatusFilter(opt.id as any);
                                                setIsFilterOpen(false);
                                            }}
                                            className={`w-full px-5 py-3 text-left text-[0.75rem] font-bold transition-colors ${statusFilter === opt.id ? 'text-blue-600 bg-blue-50/50' : 'text-ind-text2 hover:bg-ind-bg'
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-orange-50 text-orange-600 border border-orange-100 px-5 py-2.5 rounded-xl text-[0.75rem] font-black tracking-wider shadow-xs">
                            {pendingCount} Pending
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1 group">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ind-text3 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by company, customer or model..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-ind-bg/50 border border-ind-border/60 rounded-xl py-3.5 pl-12 pr-4 text-[0.75rem] font-bold text-slate-700 placeholder:text-ind-text3 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all shadow-xs"
                        />
                    </div>
                    <div className="relative group md:w-64">
                        <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ind-text3 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="w-full bg-ind-bg/50 border border-ind-border/60 rounded-xl py-3.5 pl-12 pr-4 text-[0.75rem] font-bold text-slate-700 focus:border-blue-500 outline-none transition-all shadow-xs"
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden bg-ind-bg">
                <div className="flex-1 p-2 bg-gray-50 overflow-y-auto">

                    <div className="bg-white rounded-2xl shadow-sm border-b border-ind-border overflow-hidden">

                        {/* 🔹 Table Header */}
                        <div className="grid grid-cols-12 px-6 py-2 bg-white border-b-2 border-[#f37021] text-xs font-bold text-black uppercase tracking-wider">
                            <div className="col-span-5">Request</div>
                            <div className="col-span-3">Customer</div>
                            <div className="col-span-2">Date</div>
                            <div className="col-span-1 text-center">Status</div>
                            <div className="col-span-1 text-right">Action</div>
                        </div>

                        {/* 🔹 Table Body */}
                        <div className="border-b border-ind-border h-[calc(100vh-400px)] overflow-y-auto">

                            {filteredOrders.map((o) => {
                                const isOpen = expandedOrderId === o.id;

                                return (
                                    <div key={o.id}>

                                        {/* 🔸 Row */}
                                        <div
                                            className={`grid grid-cols-12 items-center px-6 py-2 cursor-pointer transition border-b border-ind-border ${isOpen ? "bg-blue-50" : "hover:bg-gray-50"
                                                }`}
                                            onClick={() => handleToggle(o.id)}
                                        >

                                            {/* Request */}
                                            <div className="col-span-5 flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                                                    <User size={18} className="text-gray-500" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-800 text-sm">
                                                        To car model
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {o.company || 'N/A'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Customer */}
                                            <div className="col-span-3 text-sm text-gray-600">
                                                {o.customer || '<orders@cie-automotive.in>'}
                                            </div>

                                            {/* Date */}
                                            <div className="col-span-2 text-xs text-gray-500">
                                                {o.date}
                                            </div>

                                            {/* Status */}
                                            <div className="col-span-1 text-center">
                                                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-orange-100 text-orange-600">
                                                    {o.status?.toUpperCase() || 'PENDING'}
                                                </span>
                                            </div>

                                            {/* Action */}
                                            <div className="col-span-1 flex justify-end">
                                                <ChevronDown
                                                    size={16}
                                                    className={`transition-transform ${isOpen ? "rotate-180" : ""
                                                        }`}
                                                />
                                            </div>
                                        </div>

                                        {/* 🔸 Expandable Content (YOUR CARD DETAILS) */}
                                        {isOpen && (
                                            <div className="px-6 py-2 bg-white">
                                                <div className="bg-white rounded-xl  p-4 shadow-sm bg-white border  border-ind-border">

                                                    {/* You can keep your full card UI here */}
                                                    <div className="text-sm text-gray-700 space-y-2">
                                                        <div className='border-b  border-ind-border p-2 rounded-lg'><strong>Company:</strong> {o.company}</div>
                                                        <div className='border-b  border-ind-border p-2 rounded-lg'><strong>Customer:</strong> {o.customer}</div>
                                                        <div className='border-b  border-ind-border p-2 rounded-lg'><strong>Email:</strong> {o.email}</div>
                                                        <div className='border-b  border-ind-border p-2 rounded-lg'><strong>Quantity:</strong> {o.qty}</div>
                                                        <div className='border-b  border-ind-border p-2 rounded-lg'><strong>Model:</strong> {o.model}</div>
                                                    </div>

                                                </div>
                                            </div>
                                        )}

                                    </div>
                                );
                            })}

                        </div>
                    </div>
                </div>

                {/* Right Analytics Sidebar */}
                <div className="w-[380px] p-4 hidden xl:flex flex-col gap-6 bg-white">
                    <div className=" flex items-center justify-between">
                        <div className="text-[0.65rem] font-black text-blue-500 uppercase tracking-[0.1em] flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                            Live monitoring
                        </div>
                        <h3 className="text-base font-bold text-slate-800 tracking-tight">Demand intelligence</h3>
                    </div>

                    <div className="relative h-48 w-48 mx-auto group">
                        <Doughnut data={chartData} options={chartOptions} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[0.5rem] font-black text-ind-text3 uppercase tracking-[0.2em] mb-0.5">Total</span>
                            <span className="text-2xl font-black text-slate-800 leading-none">{orders.length}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { label: 'Accepted', val: acceptedCount, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', dot: 'bg-blue-500' },
                            { label: 'Pending', val: pendingCount, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', dot: 'bg-orange-500' },
                            { label: 'Rejected', val: rejectedCount, color: 'text-ind-text3', bg: 'bg-ind-bg', border: 'border-ind-border/50', dot: 'bg-slate-300' }
                        ].map((s, i) => (
                            <div key={i} className={`flex flex-col items-center justify-center p-3 rounded-2xl border ${s.border} ${s.bg} shadow-xs`}>
                                <div className="text-lg font-black text-slate-800 mb-1">{s.val}</div>
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                    <div className={`text-[0.55rem] font-black tracking-tighter uppercase ${s.color}`}>{s.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>


                </div>
            </div>
        </div>
    );
};
