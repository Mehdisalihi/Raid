import React, { useState } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, Lock, User, ShieldCheck, AlertCircle } from 'lucide-react';
import { translations } from '../i18n/translations';

const Auth = () => {
    const { login, loginGuest, language } = useAppStore();
    const t = translations[language];
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (login(username, password)) {
            // Login successful
        } else {
            setError(t.invalidLogin);
            setTimeout(() => setError(''), 3000);
        }
    };

    return (
        <div className="auth-container" style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0f172a', // Deep slate background
            position: 'relative',
            overflow: 'hidden',
            direction: language === 'ar' ? 'rtl' : 'ltr'
        }}>
            {/* Abstract Background Elements */}
            <div style={{
                position: 'absolute', top: '-10%', left: '-5%', width: '40%', height: '40%',
                background: 'radial-gradient(circle, rgba(79, 70, 229, 0.1) 0%, transparent 70%)',
                filter: 'blur(60px)', pointerEvents: 'none'
            }}></div>
            <div style={{
                position: 'absolute', bottom: '-10%', right: '-5%', width: '40%', height: '40%',
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, transparent 70%)',
                filter: 'blur(60px)', pointerEvents: 'none'
            }}></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card"
                style={{
                    width: '420px', padding: '3rem', zIndex: 1,
                    border: '1px solid rgba(255,255,255,0.05)',
                    background: 'rgba(30, 41, 59, 0.7)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '16px',
                        background: 'var(--primary)', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1.5rem', boxShadow: '0 0 20px rgba(79, 70, 229, 0.4)'
                    }}>
                        <ShieldCheck size={32} />
                    </div>
                    <h2 style={{ color: 'white', marginBottom: '0.5rem', fontSize: '1.75rem', fontWeight: 800 }}>{t.loginTitle}</h2>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>{t.loginSubtitle}</p>
                </div>

                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                            animate={{ height: 'auto', opacity: 1, marginBottom: '2rem' }}
                            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                            style={{
                                background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                                padding: '0.75rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.75rem',
                                color: '#fca5a5', fontSize: '0.85rem'
                            }}
                        >
                            <AlertCircle size={18} />
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>{t.usernameLabel}</label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', [language === 'ar' ? 'right' : 'left']: '14px', top: '14px', color: 'rgba(255,255,255,0.3)' }} />
                            <input
                                type="text"
                                className="form-control"
                                placeholder={t.usernamePlace}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                style={{
                                    [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '44px', background: 'rgba(15, 23, 42, 0.5)',
                                    border: '1px solid rgba(255,255,255,0.1)', color: 'white',
                                    height: '50px'
                                }}
                            />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '2.5rem' }}>
                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>{t.passwordLabel}</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', [language === 'ar' ? 'right' : 'left']: '14px', top: '14px', color: 'rgba(255,255,255,0.3)' }} />
                            <input
                                type="password"
                                className="form-control"
                                placeholder={t.passwordPlace}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                style={{
                                    [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '44px', background: 'rgba(15, 23, 42, 0.5)',
                                    border: '1px solid rgba(255,255,255,0.1)', color: 'white',
                                    height: '50px'
                                }}
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', fontSize: '1.1rem', fontWeight: 700 }}>
                        <span>{t.loginButton}</span>
                        <LogIn size={20} style={{ transform: language === 'ar' ? 'scaleX(-1)' : 'none' }} />
                    </button>

                    <button
                        type="button"
                        onClick={handleGuestLogin}
                        className="btn"
                        style={{
                            width: '100%',
                            marginTop: '1rem',
                            height: '50px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.7)',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            borderRadius: '12px'
                        }}
                    >
                        {language === 'ar' ? 'المتابعة بدون حساب' : 'Continue Without Account'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '2.5rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
                    <p>© 2026 {t.allRightsReserved}</p>
                </div>
            </motion.div>
        </div>
    );
};

export default Auth;

