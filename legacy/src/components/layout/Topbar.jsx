import React from 'react';
import { useAppStore } from '../../hooks/useAppStore';
import { Sun, Moon, Bell, Search } from 'lucide-react';
import { translations } from '../../i18n/translations';

const Topbar = () => {
    const { currentUser, language, theme, toggleTheme } = useAppStore();
    const t = translations[language];

    const hour = new Date().getHours();
    let greetingKey = 'welcome';
    if (hour < 12) greetingKey = 'goodMorning';
    else if (hour < 17) greetingKey = 'goodAfternoon';
    else if (hour < 21) greetingKey = 'goodEvening';
    else greetingKey = 'goodNight';

    const greetingText = t[greetingKey];

    return (
        <header className="no-print" style={{
            height: '80px',
            padding: '0 2.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(2, 6, 23, 0.5)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--glass-border)',
            position: 'sticky',
            top: 0,
            zIndex: 50,
            direction: language === 'ar' ? 'rtl' : 'ltr',
            transition: 'all 0.3s ease'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
                <div style={{ position: 'relative', width: '350px' }}>
                    <Search size={16} style={{ position: 'absolute', [language === 'ar' ? 'right' : 'left']: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                    <input
                        type="text"
                        placeholder={t.search}
                        className="form-control"
                        style={{
                            [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '46px',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '12px',
                            fontSize: '0.9rem',
                            width: '100%',
                            height: '46px',
                            color: 'white'
                        }}
                    />
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ position: 'relative', cursor: 'pointer', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', transition: 'all 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}>
                        <Bell size={20} color="var(--text-muted)" />
                        <span style={{
                            position: 'absolute', top: '10px', [language === 'ar' ? 'left' : 'right']: '10px',
                            width: '8px', height: '8px', background: 'var(--primary)',
                            borderRadius: '50%', border: '2px solid #020617',
                            boxShadow: '0 0 10px var(--primary)'
                        }}></span>
                    </div>
                </div>

                <div style={{ width: '1px', height: '32px', background: 'var(--glass-border)' }}></div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
                        <p style={{ fontSize: '0.95rem', fontWeight: 800, color: 'white', lineHeight: 1.1 }}>{currentUser?.name || "المدير العام"}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{greetingText}</p>
                    </div>
                    <div style={{
                        width: '46px', height: '46px', borderRadius: '14px',
                        background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                        color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 900, fontSize: '1.2rem', border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 4px 15px var(--primary-glow)'
                    }}>
                        {currentUser?.name?.charAt(0) || "A"}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Topbar;
