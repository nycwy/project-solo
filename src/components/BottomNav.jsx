import { useState, useContext, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { FiLayout, FiPieChart, FiUsers, FiFileText, FiPlus, FiShoppingBag } from 'react-icons/fi';
import { NotificationContext } from '../context/NotificationContext';

const tabs = [
    { id: 'journal', label: 'Journal', icon: FiLayout, path: '/journal' },
    { id: 'dashboard', label: 'Fair Share', icon: FiPieChart, path: '/split' },
    { id: 'friends', label: 'Friends', icon: FiUsers, path: '/friends' },
    { id: 'statement', label: 'Statement', icon: FiFileText, path: '/statement' },
];

const BottomNav = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isFabOpen, setIsFabOpen] = useState(false);
    const navRef = useRef(null);
    const { friendRequestsCount, splitRequestsCount } = useContext(NotificationContext);

    // Close FAB when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (navRef.current && !navRef.current.contains(event.target)) {
                setIsFabOpen(false);
            }
        };

        if (isFabOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isFabOpen]);

    // Close FAB on navigation
    useEffect(() => {
        setIsFabOpen(false);
    }, [location.pathname]);

    const handleAction = (path) => {
        navigate(path);
        setIsFabOpen(false);
    };

    const toggleFab = () => setIsFabOpen(!isFabOpen);

    const renderTab = (tab) => {
        const isActive = location.pathname.startsWith(tab.path);
        const hasNotification =
            (tab.id === 'friends' && friendRequestsCount > 0) ||
            (tab.id === 'dashboard' && splitRequestsCount > 0);

        return (
            <NavLink
                key={tab.id}
                to={tab.path}
                className="flex flex-col items-center justify-center gap-0.5 py-1 w-14 relative"
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
                    className={`text-[10px] font-semibold whitespace-nowrap transition-colors ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
                        }`}
                >
                    {tab.label}
                </span>
            </NavLink>
        );
    };

    return (
        <nav ref={navRef} className="fixed bottom-0 left-0 right-0 z-50 lg:hidden pointer-events-none">
            {/* Backdrop */}
            {isFabOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px] pointer-events-auto animate-fade-in"
                    onClick={() => setIsFabOpen(false)}
                />
            )}

            {/* The wrapper area allows events. */}
            <div className="pointer-events-auto z-50 relative bg-[var(--color-nav-bg)] backdrop-blur-xl border-t border-[var(--color-border-light)] safe-area-bottom shadow-[0_-2px_10px_var(--color-shadow)]">
                <div className="flex justify-between items-center h-16 max-w-md mx-auto relative px-2">
                    {/* Left half */}
                    <div className="flex justify-around items-center flex-1">
                        {tabs.slice(0, 2).map(renderTab)}
                    </div>

                    {/* Central FAB Area */}
                    <div className="w-16 flex justify-center items-center shrink-0">
                        {/* Pop-out Action: Shop (Left) */}
                        <button
                            onClick={() => handleAction('/purchase-list')}
                            className={`absolute z-40 w-12 h-12 rounded-full bg-[var(--color-warning)] text-white shadow-lg shadow-[var(--color-warning)]/30 flex items-center justify-center hover:brightness-110 active:scale-90 pointer-events-auto will-change-transform will-change-opacity`}
                            style={{
                                transition: isFabOpen
                                    ? 'transform 450ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 300ms ease, visibility 0ms 0ms'
                                    : 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 300ms ease, visibility 0ms 400ms',
                                transform: isFabOpen ? 'translate(-2.5rem, -4.5rem) scale(1)' : 'translate(0, 0) scale(0.1)',
                                opacity: isFabOpen ? 1 : 0,
                                visibility: isFabOpen ? 'visible' : 'hidden',
                            }}
                            aria-label="Add Shopping"
                        >
                            <FiShoppingBag size={20} />
                        </button>

                        {/* Pop-out Action: Split (Right) */}
                        <button
                            onClick={() => handleAction('/add-expense')}
                            className={`absolute z-40 w-12 h-12 rounded-full bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/30 flex items-center justify-center hover:brightness-110 active:scale-90 pointer-events-auto will-change-transform will-change-opacity`}
                            style={{
                                transition: isFabOpen
                                    ? 'transform 450ms cubic-bezier(0.34, 1.56, 0.64, 1) 40ms, opacity 300ms ease 40ms, visibility 0ms 0ms'
                                    : 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 300ms ease, visibility 0ms 400ms',
                                transform: isFabOpen ? 'translate(2.5rem, -4.5rem) scale(1)' : 'translate(0, 0) scale(0.1)',
                                opacity: isFabOpen ? 1 : 0,
                                visibility: isFabOpen ? 'visible' : 'hidden',
                            }}
                            aria-label="Add Split"
                        >
                            <FiPieChart size={20} />
                        </button>

                        {/* Main FAB Trigger */}
                        <button
                            onClick={toggleFab}
                            className={`relative z-50 w-12 h-12 bg-[var(--color-primary)] text-white rounded-full flex justify-center items-center shadow-lg border-[3px] border-[var(--color-nav-bg)] hover:scale-105 active:scale-95 pointer-events-auto will-change-transform ${isFabOpen ? 'shadow-none ring-2 ring-[var(--color-primary)]/40 bg-[var(--color-surface-hover)] !text-[var(--color-text-muted)] border-[var(--color-border)]' : 'shadow-[var(--color-primary)]/40'}`}
                            style={{ transition: 'all 300ms ease' }}
                            aria-label="Toggle Actions"
                        >
                            <FiPlus
                                size={24}
                                className={isFabOpen ? 'text-[var(--color-text)] relative -left-[1px]' : 'text-white'}
                                style={{
                                    transition: 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                                    transform: isFabOpen ? 'rotate(45deg)' : 'rotate(0deg)'
                                }}
                            />
                        </button>
                    </div>

                    {/* Right half */}
                    <div className="flex justify-around items-center flex-1">
                        {tabs.slice(2, 4).map(renderTab)}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default BottomNav;
