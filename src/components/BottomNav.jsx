import { NavLink, useLocation } from 'react-router-dom';
import { FiLayout, FiPieChart, FiUsers, FiFileText } from 'react-icons/fi';

const tabs = [
    { id: 'journal', label: 'Journal', icon: FiLayout, path: '/journal' },
    { id: 'dashboard', label: 'Splitter', icon: FiPieChart, path: '/split' },
    { id: 'friends', label: 'Friends', icon: FiUsers, path: '/friends' },
    { id: 'statement', label: 'Statement', icon: FiFileText, path: '/statement' },
];

const BottomNav = () => {
    const location = useLocation();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
            <div className="bg-[var(--color-nav-bg)] backdrop-blur-xl border-t border-[var(--color-border-light)] safe-area-bottom shadow-[0_-2px_10px_var(--color-shadow)]">
                <div className="flex justify-around items-center h-[60px] max-w-md mx-auto">
                    {tabs.map((tab) => {
                        const isActive = location.pathname.startsWith(tab.path);
                        return (
                            <NavLink
                                key={tab.id}
                                to={tab.path}
                                className="flex flex-col items-center justify-center gap-0.5 py-1 px-3 relative"
                            >
                                {isActive && (
                                    <span className="absolute -top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-[var(--color-primary)] rounded-full" />
                                )}
                                <tab.icon
                                    size={20}
                                    className={`transition-all duration-200 ${isActive ? 'text-[var(--color-primary)] scale-110' : 'text-[var(--color-text-muted)]'
                                        }`}
                                />
                                <span
                                    className={`text-[10px] font-semibold transition-colors ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
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
