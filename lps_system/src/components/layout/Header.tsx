import { User, Menu } from 'lucide-react';
import { getUser } from '../../lib/storage';
import NotificationBell from './NotificationBell';

interface HeaderProps {
    onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
    const user = getUser();

    return (
        <header className="h-14 bg-white/90 backdrop-blur-xl border-b border-ind-border/50 px-6 md:px-10 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.02)] sticky top-0 z-50">
            <div className="flex items-center gap-4 md:gap-6">
                <button
                    onClick={onMenuToggle}
                    className="md:hidden p-2 -ml-2 text-ind-text2 hover:text-ind-text transition-colors"
                >
                    <Menu size={24} />
                </button>
            </div>

            {/* Right side: notification bell */}
            <div className="flex items-center gap-3">
                <NotificationBell />
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-ind-text flex items-center justify-center text-white text-xs font-black">
                        {(user?.name || user?.username || 'A')?.[0]?.toUpperCase()}
                    </div>
                    <div className="hidden md:block text-right">
                        <p className="text-xs font-black text-ind-text leading-none">{user?.name || user?.username}</p>
                        <p className="text-[9px] text-ind-primary font-bold uppercase tracking-widest">{user?.role}</p>
                    </div>
                </div>
            </div>
        </header>
    );
}

