import { NavLink, Outlet } from 'react-router-dom';
import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeProvider';
import BottomNav from './BottomNav';
import Avatar from './Avatar';
import Footer from './Footer';
import {
    FiLayout,
    FiPieChart,
    FiUsers,
    FiFileText,
    FiUser,
    FiLogOut,
    FiSun,
    FiMoon,
    FiChevronsLeft,
    FiChevronsRight,
} from 'react-icons/fi';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useNavigate } from 'react-router-dom';

const navItems = [
    { label: 'Journal', icon: FiLayout, path: '/journal' },
    { label: 'Splitter', icon: FiPieChart, path: '/split' },
    { label: 'Friends', icon: FiUsers, path: '/friends' },
    { label: 'Statement', icon: FiFileText, path: '/statement' },
    { label: 'Profile', icon: FiUser, path: '/profile' },
];

const Layout = () => {
    const { user } = useContext(AuthContext);
    const { theme, toggleTheme } = useContext(ThemeContext);
    const navigate = useNavigate();

    const [sidebarOpen, setSidebarOpen] = useState(() => {
        const saved = localStorage.getItem('sidebar-open');
        return saved === null ? true : saved === 'true';
    });

    useEffect(() => {
        localStorage.setItem('sidebar-open', sidebarOpen);
    }, [sidebarOpen]);

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/login');
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning,';
        if (hour < 17) return 'Good Afternoon,';
        if (hour < 21) return 'Good Evening,';
        return 'Good Night,';
    };

    const firstName = user?.displayName?.split(' ')[0] || user?.username?.split(' ')[0] || 'User';

    const sidebarWidth = sidebarOpen ? 'w-64' : 'w-20';
    const mainMargin = sidebarOpen ? 'lg:ml-64' : 'lg:ml-20';

    const linkClasses = ({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${sidebarOpen ? '' : 'justify-center'
        } ${isActive
            ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)] font-bold'
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
        }`;

    return (
        <div className="min-h-screen bg-[var(--color-bg)] flex">
            {/* Desktop Sidebar */}
            <aside className={`hidden lg:flex flex-col ${sidebarWidth} bg-[var(--color-surface)] border-r border-[var(--color-border-light)] fixed h-screen z-30 transition-all duration-300`}>
                {/* Greeting + Toggle */}
                <div className={`p-4 pb-3 flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
                    <div className={`flex flex-col ${sidebarOpen ? '' : 'hidden'} overflow-hidden`}>
                        <span className="text-[10px] font-bold text-[var(--color-text-muted)] tracking-wider uppercase mb-0.5">{getGreeting()}</span>
                        <span className="font-extrabold text-[var(--color-text)] text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] truncate">
                            {firstName}!
                        </span>
                    </div>

                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className={`p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-all`}
                        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                    >
                        {sidebarOpen ? <FiChevronsLeft size={16} /> : <FiChevronsRight size={16} />}
                    </button>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 px-3 space-y-1 mt-2">
                    {sidebarOpen && (
                        <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest px-3 mb-2">Menu</p>
                    )}
                    {navItems.map((item) => (
                        <NavLink key={item.path} to={item.path} className={linkClasses} title={!sidebarOpen ? item.label : undefined}>
                            <item.icon size={18} className="shrink-0" />
                            {sidebarOpen && <span className="transition-opacity duration-200">{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>

                {/* Theme Toggle + User Section */}
                <div className="px-3 pb-4 space-y-2 mt-auto">
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-all ${sidebarOpen ? '' : 'justify-center'}`}
                        title={!sidebarOpen ? (theme === 'light' ? 'Dark Mode' : 'Light Mode') : undefined}
                    >
                        {theme === 'light' ? <FiMoon size={18} /> : <FiSun size={18} />}
                        {sidebarOpen && (theme === 'light' ? 'Dark Mode' : 'Light Mode')}
                    </button>

                    <div className="border-t border-[var(--color-border-light)] pt-3 px-1">
                        {sidebarOpen ? (
                            <>
                                <div className="flex items-center gap-3 mb-3">
                                    <Avatar
                                        name={user?.displayName || user?.email}
                                        photoURL={user?.photoURL}
                                        size="sm"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-[var(--color-text)] truncate">
                                            {user?.displayName || 'User'}
                                        </p>
                                        <p className="text-xs text-[var(--color-text-muted)] truncate">{user?.email}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] transition-all w-full"
                                >
                                    <FiLogOut size={16} />
                                    Log out
                                </button>
                            </>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <Avatar
                                    name={user?.displayName || user?.email}
                                    photoURL={user?.photoURL}
                                    size="sm"
                                />
                                <button
                                    onClick={handleLogout}
                                    className="p-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] transition-all"
                                    title="Log out"
                                >
                                    <FiLogOut size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className={`flex flex-col min-h-screen flex-1 ${mainMargin} transition-all duration-300`}>
                {/* Mobile Header */}
                <header className="lg:hidden sticky top-0 z-20 bg-[var(--color-nav-bg)] backdrop-blur-xl border-b border-[var(--color-border-light)] shadow-[0_1px_3px_var(--color-shadow)]">
                    <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3 w-full max-w-[70%]">
                            <NavLink to="/profile" className="flex shrink-0">
                                <Avatar
                                    name={user?.displayName || user?.email}
                                    photoURL={user?.photoURL}
                                    size="md"
                                />
                            </NavLink>
                            <div className="flex flex-col flex-1 justify-center min-w-0 h-full py-0.5">
                                <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider leading-none mb-1">{getGreeting()}</span>
                                <span className="font-extrabold text-[var(--color-text)] text-base tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] truncate">
                                    {firstName}!
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] transition-colors"
                            >
                                {theme === 'light' ? <FiMoon size={18} /> : <FiSun size={18} />}
                            </button>
                        </div>
                    </div>
                </header>

                <main className="max-w-5xl mx-auto w-full flex-1">
                    <Outlet />
                </main>

                <div className="hidden lg:block mt-auto pb-4 px-4 lg:px-6">
                    <Footer />
                </div>
            </div>

            {/* Mobile Bottom Nav */}
            <BottomNav />
        </div>
    );
};

export default Layout;
