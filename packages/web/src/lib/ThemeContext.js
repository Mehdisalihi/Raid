'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('light');
    const [primaryColor, setPrimaryColor] = useState('#4f46e5');
    const [fontSize, setFontSize] = useState('14px');

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        let initialTheme = 'light';
        let initialColor = '#4f46e5';
        let initialFontSize = '14px';

        if (savedUser) {
            try {
                const user = JSON.parse(savedUser);
                if (user.theme) initialTheme = user.theme;
                if (user.primaryColor) initialColor = user.primaryColor;
            } catch (e) {
                console.error("ThemeContext: Error parsing user", e);
            }
        } else {
            initialTheme = localStorage.getItem('theme') || 'light';
            initialColor = localStorage.getItem('primaryColor') || '#4f46e5';
            initialFontSize = localStorage.getItem('fontSize') || '14px';
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
        
        // Convert hex to RGB for variables like --primary-rgb
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

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
    };

    const updatePrimaryColor = (color) => {
        setPrimaryColor(color);
        localStorage.setItem('primaryColor', color);
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
