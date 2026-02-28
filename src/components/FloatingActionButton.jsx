import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiPieChart, FiShoppingCart } from 'react-icons/fi';

const FloatingActionButton = () => {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    const toggleMenu = () => setIsOpen(!isOpen);

    const handleAction = (path) => {
        navigate(path);
        setIsOpen(false);
    };

    return (
        <div className="lg:hidden fixed bottom-24 right-5 z-50 flex items-center justify-center pointer-events-none">
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/5 backdrop-blur-[2px] pointer-events-auto animate-fade-in"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Splitter/Fair Share Action */}
            <button
                onClick={() => handleAction('/add-expense')}
                className={`absolute z-50 w-12 h-12 rounded-full bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/30 flex items-center justify-center hover:brightness-110 active:scale-90 transition-all pointer-events-auto will-change-transform will-change-opacity`}
                style={{
                    transition: 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 300ms ease',
                    transform: isOpen ? 'translateY(-4.8rem) scale(1)' : 'translateY(0) scale(0.5)',
                    opacity: isOpen ? 1 : 0,
                    visibility: isOpen ? 'visible' : 'hidden',
                }}
            >
                <FiPieChart size={22} />
            </button>

            {/* Shopping List Action */}
            <button
                onClick={() => handleAction('/purchase-list')}
                className={`absolute z-50 w-12 h-12 rounded-full bg-[var(--color-warning)] text-white shadow-lg shadow-[var(--color-warning)]/30 flex items-center justify-center hover:brightness-110 active:scale-90 transition-all pointer-events-auto will-change-transform will-change-opacity`}
                style={{
                    transition: 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 300ms ease',
                    transform: isOpen ? 'translateX(-4.8rem) scale(1)' : 'translateX(0) scale(0.5)',
                    opacity: isOpen ? 1 : 0,
                    visibility: isOpen ? 'visible' : 'hidden',
                    transitionDelay: isOpen ? '80ms' : '0ms'
                }}
            >
                <FiShoppingCart size={22} />
            </button>

            {/* Main Toggle Button */}
            <button
                onClick={toggleMenu}
                className={`relative z-50 w-12 h-12 rounded-full bg-[var(--color-primary)] text-white shadow-xl shadow-[var(--color-primary)]/40 flex items-center justify-center hover:brightness-105 active:scale-90 transition-all duration-300 pointer-events-auto will-change-transform`}
            >
                <FiPlus
                    size={26}
                    className={`transition-transform duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isOpen ? 'rotate-45' : ''}`}
                />
            </button>
        </div>
    );
};

export default FloatingActionButton;
