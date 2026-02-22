import { useState, useEffect } from 'react';

/**
 * Custom hook for managing App Theme (Dark/Light mode)
 * Features:
 * 1. Checks localStorage for saved preference
 * 2. Fallbacks to OS system preference
 * 3. Listens for OS preference changes
 * 4. Persists manual choice to localStorage
 * 5. Applies 'dark' class to document documentElement
 */
const useTheme = () => {
    const [theme, setTheme] = useState(() => {
        // 1. Check local storage
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) return savedTheme;

        // 2. Check system preference
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return systemPrefersDark ? 'dark' : 'light';
    });

    useEffect(() => {
        const root = window.document.documentElement;

        // 3. Apply class to HTML tag
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        // 4. Persistence
        localStorage.setItem('theme', theme);
    }, [theme]);

    // 5. System Listener (Bonus)
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (e) => {
            // Only auto-update if the user hasn't explicitly set a preference in this session
            // Or if we want it to always follow system when no localStorage exists.
            // Requirement: "only if the user hasn't explicitly set a manual preference"
            const hasManualPreference = localStorage.getItem('theme');
            if (!hasManualPreference) {
                setTheme(e.matches ? 'dark' : 'light');
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    const toggleTheme = () => {
        setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    return { theme, toggleTheme };
};

export default useTheme;
