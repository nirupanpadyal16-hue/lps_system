import { useState } from 'react';
import { FileText, Download, Filter, Calendar } from 'lucide-react';
import { SupervisorCalendar } from '../../components/SupervisorCalendar';

export const SupervisorReports = () => {
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const mockReports = [
        { id: 'REP-001', name: 'Daily Production Verification', date: 'Oct 10, 2026', status: 'Generated' },
        { id: 'REP-002', name: 'Shift B Efficiency Analysis', date: 'Oct 09, 2026', status: 'Available' },
        { id: 'REP-003', name: 'Shortage Log Archive', date: 'Oct 08, 2026', status: 'Generated' },
        { id: 'REP-004', name: 'Quality Rejection Summaries', date: 'Oct 07, 2026', status: 'Available' },
    ];

    const handleDownload = (reportName: string, format: 'CSV' | 'EXCEL') => {
        const timestamp = new Date().toISOString().split('T')[0];
        
        // Mock data structure tailored to the report type
        let content = '';
        if (reportName.includes('Shortage')) {
            content = "Date,Model,Status,Shortage Reason,Resolution\n" + 
                      `${timestamp},Model X,Pending,Microcontroller,Escalated\n` +
                      `${timestamp},Model Y,Verified,N/A,Approved\n`;
        } else {
            content = "Date,Line,Total Planned,Total Produced,OEE Performance\n" +
                      `${timestamp},Main Assy 1,1200,1150,95.8%\n` +
                      `${timestamp},Main Assy 2,800,800,100%\n`;
        }

        let type = '';
        let filename = '';

        if (format === 'CSV') {
            type = 'text/csv;charset=utf-8;';
            filename = `${reportName.replace(/\s+/g, '_').toLowerCase()}_${timestamp}.csv`;
        } else {
            // Replace commas with tabs to trigger Excel columns properly in old xls format
            content = content.replace(/,/g, '\t');
            type = 'application/vnd.ms-excel;charset=utf-8;';
            filename = `${reportName.replace(/\s+/g, '_').toLowerCase()}_${timestamp}.xls`;
        }

        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 font-sans">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-[24px] font-black text-ind-text tracking-tight  leading-none">
                   
                        Production Reports
                    </h2>
                    <p className="text-ind-text3 font-bold text-xs uppercase tracking-[0.2em] mt-1 ml-10">
                        Export and analyze historical compliance data
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative z-50">
                        <button 
                            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-ind-border/50 rounded-xl text-[10px] font-black uppercase text-ind-text2 tracking-widest hover:border-ind-primary transition-all shadow-sm"
                        >
                            <Calendar size={14} />
                            {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Select Date'}
                        </button>
                        
                        {isCalendarOpen && (
                            <SupervisorCalendar 
                                value={selectedDate}
                                onChange={(date) => {
                                    setSelectedDate(date);
                                }}
                                onClose={() => setIsCalendarOpen(false)}
                            />
                        )}
                    </div>
                    
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-ind-border/50 rounded-xl text-[10px] font-black uppercase text-ind-text2 tracking-widest hover:border-ind-primary transition-all shadow-sm">
                        <Filter size={14} />
                        Filter
                    </button>
                </div>
            </div>

            <div className="bg-white border border-ind-border/50 shadow-sm rounded-3xl overflow-hidden">
                <div className="max-h-[450px] overflow-auto custom-scrollbar">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-50 border-b-2 border-slate-200">
                                <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] bg-slate-50 text-black">Report ID</th>
                                <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] bg-slate-50 text-black">Description</th>
                                <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] bg-slate-50 text-black">Date Run</th>
                                <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] bg-slate-50 text-black">Formats</th>
                                <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] bg-slate-50 text-black text-right">Download Export</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ind-border/50 bg-white">
                            {mockReports.map(report => (
                                <tr key={report.id} className="hover:bg-orange-50/30 transition-colors group">
                                    <td className="py-4 px-6 text-xs font-black text-ind-primary uppercase tracking-widest">{report.id}</td>
                                    <td className="py-4 px-6 text-sm font-bold text-ind-text">{report.name}</td>
                                    <td className="py-4 px-6 text-xs font-bold text-ind-text3">{report.date}</td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-1.5">
                                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[8px] font-black uppercase tracking-widest border border-blue-100">CSV</span>
                                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest border border-emerald-100">XLS</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => handleDownload(report.name, 'CSV')}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-ind-border hover:border-blue-500 bg-white text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm group"
                                            >
                                                <Download size={12} className="group-hover:-translate-y-0.5 transition-transform" />
                                                CSV
                                            </button>
                                            <button 
                                                onClick={() => handleDownload(report.name, 'EXCEL')}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-ind-border hover:border-emerald-500 bg-white text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:text-emerald-600 hover:bg-emerald-50 transition-all shadow-sm group"
                                            >
                                                <Download size={12} className="group-hover:-translate-y-0.5 transition-transform" />
                                                Excel
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
