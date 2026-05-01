'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('light');
    const [primaryColor, setPrimaryColor] = useState('#4f46e5');
    const [fontSize, setFontSize] = useState('14px');

    useEffect(() => {
        // Try individual keys first
        const savedTheme = localStorage.getItem('theme');
        const savedColor = localStorage.getItem('primaryColor');
        const savedFontSize = localStorage.getItem('fontSize');

        const savedUser = localStorage.getItem('user');
        let initialTheme = savedTheme || 'light';
        let initialColor = savedColor || '#4f46e5';
        let initialFontSize = savedFontSize || '14px';

        if (savedUser) {
            try {
                const user = JSON.parse(savedUser);
                if (!savedTheme && user.theme) initialTheme = user.theme;
                if (!savedColor && user.primaryColor) initialColor = user.primaryColor;
            } catch (e) {
                console.error("ThemeContext: Error parsing user", e);
            }
        }

        setTheme(initialTheme);
        document.documentElement.classList.toggle('dark', initialTheme === 'dark');
        
        setPrimaryColor(initialColor);
        applyColor(initialColor);
        
        setFontSize(initialFontSize);
        document.documentElement.style.setProperty('--font-base', initialFontSize);
    }, []);

    const applyColor = (color) => {
        document.documentElement.style.setProperty('--primary', color);
        
        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? 
                `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
                null;
        };
        const rgb = hexToRgb(color);
        if (rgb) {
            document.documentElement.style.setProperty('--primary-rgb', rgb);
        }

        const darkVariants = {
            '#4f46e5': '#3730a3',
            '#10b981': '#065f46',
            '#f59e0b': '#92400e',
            '#ef4444': '#991b1b',
            '#8b5cf6': '#5b21b6',
            '#ec4899': '#9d174d'
        };
        document.documentElement.style.setProperty('--primary-dark', darkVariants[color] || color);
    };

    const updateLocalStorageUser = (key, value) => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            try {
                const user = JSON.parse(savedUser);
                user[key] = value;
                localStorage.setItem('user', JSON.stringify(user));
            } catch (e) {
                console.error("ThemeContext: Error updating user", e);
            }
        }
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        updateLocalStorageUser('theme', newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
    };

    const updatePrimaryColor = (color) => {
        setPrimaryColor(color);
        localStorage.setItem('primaryColor', color);
        updateLocalStorageUser('primaryColor', color);
        applyColor(color);
    };

    const updateFontSize = (size) => {
        setFontSize(size);
        localStorage.setItem('fontSize', size);
        document.documentElement.style.setProperty('--font-base', size);
    };

    return (
        <ThemeContext.Provider value={{ 
            theme, setTheme, toggleTheme, 
            primaryColor, updatePrimaryColor,
            fontSize, updateFontSize
        }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
