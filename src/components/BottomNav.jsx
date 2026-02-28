import { useContext } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { FiLayout, FiPieChart, FiUsers, FiFileText } from 'react-icons/fi';
import { NotificationContext } from '../context/NotificationContext';

const tabs = [
    { id: 'journal', label: 'Journal', icon: FiLayout, path: '/journal' },
    { id: 'dashboard', label: 'Fair Share', icon: FiPieChart, path: '/split' },
    { id: 'friends', label: 'Friends', icon: FiUsers, path: '/friends' },
    { id: 'statement', label: 'Statement', icon: FiFileText, path: '/statement' },
];

const BottomNav = () => {
    const location = useLocation();
    const { friendRequestsCount, splitRequestsCount } = useContext(NotificationContext);

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
            <div className="bg-[var(--color-nav-bg)] backdrop-blur-xl border-t border-[var(--color-border-light)] safe-area-bottom shadow-[0_-2px_10px_var(--color-shadow)]">
                <div className="flex justify-around items-center h-16 max-w-md mx-auto">
                    {tabs.map((tab) => {
                        const isActive = location.pathname.startsWith(tab.path);
                        const hasNotification =
                            (tab.id === 'friends' && friendRequestsCount > 0) ||
                            (tab.id === 'dashboard' && splitRequestsCount > 0);

                        return (
                            <NavLink
                                key={tab.id}
                                to={tab.path}
                                className="flex flex-col items-center justify-center gap-0.5 py-1 px-3 relative"
                            >
                                <div className="relative">
                                    <tab.icon
                                        size={20}
                                        className={`transition-all duration-200 ${isActive ? 'text-[var(--color-primary)] scale-110' : 'text-[var(--color-text-muted)]'
                                            }`}
                                    />
                                    {hasNotification && (
                                        <div className={`absolute -top-1.5 -right-2 flex items-center justify-center w-4 h-4 rounded-full border-[1.5px] border-[var(--color-nav-bg)] shadow-sm ${tab.id === 'friends' ? 'bg-rose-500' : 'bg-purple-500'
                                            }`}>
                                            <span className="text-[10px] font-bold text-white leading-none pt-[1px] transform scale-90">
                                                {tab.id === 'friends' ? friendRequestsCount : splitRequestsCount}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <span
                                    className={`text-xs font-semibold transition-colors transform scale-90 ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
                                        }`}
                                >
                                    {tab.label}
                                </span>
                            </NavLink>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
};

export default BottomNav;
