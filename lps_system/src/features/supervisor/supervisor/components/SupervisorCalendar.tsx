import { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

// ─── Indian Festivals & Holidays ─────────────────────────────────────────────
// "MM-DD"       → repeats every year (fixed-date holidays)
// "YYYY-MM-DD"  → specific year only (lunar/variable festivals)

const FESTIVALS: Record<string, string> = {
    // Fixed national holidays (every year)
    '01-01': "New Year's Day",
    '01-26': 'Republic Day',
    '04-14': 'Ambedkar Jayanti',
    '05-01': 'Labour Day',
    '08-15': 'Independence Day',
    '10-02': 'Gandhi Jayanti',
    '12-25': 'Christmas',

    // 2025 lunar/variable festivals
    '2025-01-14': 'Makar Sankranti',
    '2025-02-26': 'Maha Shivratri',
    '2025-03-14': 'Holi',
    '2025-03-30': 'Gudi Padwa',
    '2025-04-06': 'Ram Navami',
    '2025-04-10': 'Mahavir Jayanti',
    '2025-04-18': 'Good Friday',
    '2025-04-30': 'Akshaya Tritiya',
    '2025-05-12': 'Buddha Purnima',
    '2025-06-07': 'Eid ul-Adha',
    '2025-07-07': 'Muharram',
    '2025-08-09': 'Raksha Bandhan',
    '2025-08-16': 'Janmashtami',
    '2025-08-27': 'Ganesh Chaturthi',
    '2025-09-05': 'Onam',
    '2025-09-22': 'Navratri begins',
    '2025-10-02': 'Dussehra',
    '2025-10-10': 'Karva Chauth',
    '2025-10-20': 'Dhanteras',
    '2025-10-21': 'Diwali',
    '2025-10-23': 'Bhai Dooj',
    '2025-10-28': 'Chhath Puja',
    '2025-11-05': 'Guru Nanak Jayanti',

    // 2026 lunar/variable festivals
    '2026-01-14': 'Makar Sankranti',
    '2026-02-15': 'Maha Shivratri',
    '2026-03-03': 'Holi',
    '2026-03-19': 'Gudi Padwa',
    '2026-03-26': 'Ram Navami',
    '2026-03-31': 'Mahavir Jayanti',
    '2026-04-03': 'Good Friday',
    '2026-04-20': 'Akshaya Tritiya',
    '2026-05-27': 'Eid ul-Adha',
    '2026-05-31': 'Buddha Purnima',
    '2026-07-29': 'Raksha Bandhan',
    '2026-08-05': 'Janmashtami',
    '2026-08-16': 'Ganesh Chaturthi',
    '2026-09-11': 'Navratri begins',
    '2026-09-21': 'Dussehra',
    '2026-10-08': 'Dhanteras',
    '2026-10-09': 'Diwali',
    '2026-10-24': 'Guru Nanak Jayanti',
};

/** Returns the festival/holiday name for a "YYYY-MM-DD" string, or null. */
function getFestival(dateStr: string): string | null {
    // 1. Exact match — year-specific festival
    if (FESTIVALS[dateStr]) return FESTIVALS[dateStr];
    // 2. Recurring match — fixed "MM-DD" holiday
    const mmdd = dateStr.slice(5);
    return FESTIVALS[mmdd] ?? null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SupervisorCalendarProps {
    value: string;
    onChange: (date: string) => void;
    onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SupervisorCalendar({ value, onChange, onClose }: SupervisorCalendarProps) {
    // Parse value safely — avoid UTC/local timezone offset issues
    const getInitialDate = () => {
        if (!value) return new Date();
        const [y, m, d] = value.split('-').map(Number);
        return new Date(y, m - 1, d);
    };

    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(getInitialDate);
    const [hoveredFestival, setHoveredFestival] = useState<string | null>(null);

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const padding = Array.from({ length: firstDay }, (_, i) => i);

    const MONTHS = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ];

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentMonth(new Date(year, month - 1));
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentMonth(new Date(year, month + 1));
    };

    const handleSelectDay = (day: number) => {
        const mm = String(month + 1).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        onChange(`${year}-${mm}-${dd}`);
    };

    // Build ISO string for a day number in the current view
    const makeDateStr = (day: number) =>
        `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Active festival label: hovered > selected date
    const activeFestivalLabel =
        hoveredFestival ?? (value ? getFestival(value) : null);

    return (
        <div
            className="absolute top-[115%] right-0 z-50 w-[300px] bg-white rounded-2xl shadow-2xl shadow-orange-900/10 border border-orange-100 p-5 animate-in zoom-in-95 slide-in-from-top-2"
            onClick={e => e.stopPropagation()}
        >
            {/* ── Month navigation ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-5">
                <button
                    onClick={handlePrev}
                    className="p-2 hover:bg-orange-50 rounded-xl text-gray-500 hover:text-orange-600 transition-colors"
                >
                    <ChevronLeft size={16} />
                </button>

                <div className="font-black text-gray-900 text-[13px] uppercase tracking-widest">
                    {MONTHS[month]} {year}
                </div>

                <button
                    onClick={handleNext}
                    className="p-2 hover:bg-orange-50 rounded-xl text-gray-500 hover:text-orange-600 transition-colors"
                >
                    <ChevronRight size={16} />
                </button>
            </div>

            {/* ── Day-of-week headers (Sun highlighted red) ────────────────── */}
            <div className="grid grid-cols-7 gap-1 text-center mb-3">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div
                        key={i}
                        className={`text-[10px] font-black uppercase tracking-widest py-1 ${i === 0 ? 'text-red-500' : 'text-gray-400'
                            }`}
                    >
                        {d}
                    </div>
                ))}
            </div>

            {/* ── Day grid ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-7 gap-1">
                {/* Empty padding cells for offset */}
                {padding.map(p => (
                    <div key={`pad-${p}`} className="h-9" />
                ))}

                {days.map(d => {
                    const dateStr = makeDateStr(d);
                    const isSelected = value === dateStr;
                    const isToday = (
                        today.getDate() === d &&
                        today.getMonth() === month &&
                        today.getFullYear() === year
                    );
                    const isSunday = new Date(year, month, d).getDay() === 0;
                    const festival = getFestival(dateStr);

                    // ── Text colour priority: selected > sunday > normal
                    let textClass = 'text-gray-700 hover:bg-orange-50 hover:text-orange-600';
                    if (isSelected) {
                        textClass = 'bg-orange-500 text-white shadow-md shadow-orange-500/20';
                    } else if (isToday) {
                        textClass = 'bg-orange-50 text-orange-600 border border-orange-200';
                    } else if (isSunday) {
                        // Red text for Sundays, light red hover
                        textClass = 'text-red-500 font-bold hover:bg-red-50';
                    }

                    return (
                        <button
                            key={d}
                            onClick={() => handleSelectDay(d)}
                            onMouseEnter={() => setHoveredFestival(festival)}
                            onMouseLeave={() => setHoveredFestival(null)}
                            title={festival ?? undefined}
                            className={`
                                relative h-9 w-9 mx-auto rounded-full flex flex-col
                                items-center justify-center transition-all text-[12px] font-bold
                                ${textClass}
                            `}
                        >
                            {/* Date number — shift up slightly when dot is shown */}
                            <span className={`leading-none ${festival ? '-translate-y-[1px]' : ''}`}>
                                {d}
                            </span>

                            {/* Green festival dot */}
                            {festival && (
                                <span
                                    className={`block rounded-full flex-shrink-0 ${isSelected ? 'bg-white/90' : 'bg-green-500'
                                        }`}
                                    style={{ width: 4, height: 4, marginTop: 1 }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ── Festival / holiday name bar (animated) ───────────────────── */}
            <div
                className={`overflow-hidden transition-all duration-200 ${activeFestivalLabel ? 'max-h-12 opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'
                    }`}
            >
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl">
                    <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                    <span className="text-[11px] font-bold text-green-800 truncate">
                        {activeFestivalLabel}
                    </span>
                </div>
            </div>

            {/* ── Legend ───────────────────────────────────────────────────── */}
            <div className="mt-3 flex items-center gap-5">
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-red-50 border border-red-300 flex-shrink-0" />
                    <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">
                        Sunday
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
                    <span className="text-[9px] font-black text-green-700 uppercase tracking-widest">
                        Festival / Holiday
                    </span>
                </div>
            </div>

            {/* ── Footer actions ───────────────────────────────────────────── */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                <button
                    onClick={() => { onChange(''); onClose(); }}
                    className="text-[10px] font-black uppercase text-gray-400 hover:text-red-500 tracking-widest transition-colors flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-red-50"
                >
                    <X size={12} strokeWidth={3} /> Clear
                </button>
                <button
                    onClick={onClose}
                    className="text-[10px] font-black uppercase text-orange-500 hover:text-orange-600 tracking-widest transition-colors py-1 px-3 rounded-lg hover:bg-orange-50"
                >
                    Close
                </button>
            </div>
        </div>
    );
}
