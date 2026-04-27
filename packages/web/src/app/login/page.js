'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, ChevronRight, ShieldCheck, CheckCircle2, BarChart3, Cloud, LayoutDashboard, Sun, Moon } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { useTheme } from '@/lib/ThemeContext';

export default function LoginPage() {
    const { t, isRTL, lang, toggleLang } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        
        // Basic Client-side Validation
        if (!email || !email.includes('@')) {
            setError(t('invalid_email') || 'Please enter a valid email address');
            return;
        }
        if (password.length < 4) {
            setError(t('short_password') || 'Password is too short');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const data = await authService.login(email, password);
            if (data && data.token) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // Show a brief success state before redirecting
                setMessage(t('login_success') || 'Login successful! Redirecting...');
                setTimeout(() => {
                    router.push('/dashboard');
                }, 800);
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (err) {
            console.error('Login Error:', err);
            if (err.response?.data?.needsVerification) {
                router.push(`/check-email?email=${encodeURIComponent(email)}`);
                return;
            }
            setError(err.response?.data?.error || t('login_error'));
        } finally {
            setLoading(false);
        }
    };

    const handleGuestLogin = async () => {
        setError('');
        setLoading(true);
        try {
            const data = await authService.loginGuest();
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            setMessage(t('guest_login_success') || 'Entering as guest...');
            setTimeout(() => {
                router.push('/dashboard');
            }, 800);
        } catch (err) {
            setError(t('guest_error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`relative min-h-screen flex items-center justify-center p-4 md:p-6 overflow-hidden transition-colors duration-500 ${theme === 'dark' ? 'bg-[#020617] text-white' : 'bg-slate-50 text-slate-900'} ${isRTL ? 'direction-rtl font-arabic' : 'direction-ltr font-sans'}`}>
            {/* --- Advanced Background --- */}
            <div className="absolute inset-0 z-0">
                <div className={`absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full blur-[140px] animate-pulse ${theme === 'dark' ? 'bg-primary/20' : 'bg-primary/10'}`}></div>
                <div className={`absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] animate-pulse ${theme === 'dark' ? 'bg-blue-600/10' : 'bg-blue-600/5'}`} style={{ animationDelay: '3s' }}></div>
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] ${theme === 'dark' ? 'opacity-[0.03]' : 'opacity-[0.01]'}`}></div>
            </div>

            {/* Top Toolbar: Language & Theme */}
            <div className={`absolute top-6 z-50 flex items-center gap-3 ${isRTL ? 'left-6' : 'right-6'}`}>
                <div className={`flex gap-1 p-1 backdrop-blur-xl rounded-2xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/5'}`}>
                    <button
                        onClick={() => toggleLang('ar')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${lang === 'ar' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        AR
                    </button>
                    <button
                        onClick={() => toggleLang('fr')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${lang === 'fr' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        FR
                    </button>
                </div>
                
                <button
                    onClick={toggleTheme}
                    className={`p-3 rounded-2xl backdrop-blur-xl border transition-all ${theme === 'dark' ? 'bg-white/5 border-white/10 text-yellow-400 hover:bg-white/10' : 'bg-black/5 border-black/5 text-slate-600 hover:bg-black/10'}`}
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
            </div>

            <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center justify-center gap-12 relative z-10">
                
                {/* --- Left Side: Branding & Features (Hidden on mobile) --- */}
                <motion.div 
                    initial={{ opacity: 0, x: isRTL ? 40 : -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    className="hidden lg:flex flex-col flex-1 max-w-md space-y-10"
                >
                    <div className="space-y-4">
                        <img src="/Raed.png" alt="Raid Logo" className={`w-48 h-auto drop-shadow-sm ${theme === 'dark' ? 'brightness-110' : ''}`} />
                        <h1 className={`text-4xl font-black leading-tight tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {t('system_name_full') || 'Raid Financial Manager'}
                        </h1>
                        <p className={`text-lg font-medium ${theme === 'dark' ? 'text-white/50' : 'text-slate-500'}`}>
                            {t('system_description') || 'The next generation of intelligent accounting and warehouse management.'}
                        </p>
                    </div>

                    <div className="space-y-6">
                        <FeatureItem icon={<BarChart3 className="text-primary"/>} title={t('smart_reports') || "Smart Reports"} desc={t('smart_reports_desc') || "Advanced analytics for your business growth."} theme={theme} />
                        <FeatureItem icon={<ShieldCheck className="text-secondary"/>} title={t('secure_cloud') || "Secure Cloud"} desc={t('secure_cloud_desc') || "Your data is protected with military-grade encryption."} theme={theme} />
                        <FeatureItem icon={<Cloud className="text-accent"/>} title={t('anywhere_access') || "Anywhere Access"} desc={t('anywhere_access_desc') || "Manage your business from any device, anywhere."} theme={theme} />
                    </div>

                    <div className={`pt-4 flex items-center gap-4 opacity-30 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        <div className="flex -space-x-3 rtl:space-x-reverse">
                            {[1,2,3,4].map(i => (
                                <div key={i} className={`w-8 h-8 rounded-full border flex items-center justify-center text-[10px] font-black ${theme === 'dark' ? 'bg-white/10 border-white/20' : 'bg-black/5 border-black/10'}`}>U{i}</div>
                            ))}
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest">+1k {t('active_users') || 'Active Users'}</p>
                    </div>
                </motion.div>

                {/* --- Right Side: Login Form --- */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6 }}
                    className="w-full max-w-md"
                >
                    <div className="relative group">
                        {/* Glowing effect behind card */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-blue-600/20 rounded-[3rem] blur-2xl opacity-50 group-hover:opacity-75 transition-opacity duration-1000"></div>
                        
                        <div className={`relative p-8 md:p-10 rounded-[3rem] border shadow-2xl backdrop-blur-3xl overflow-hidden ${theme === 'dark' ? 'glass-premium border-white/10' : 'bg-white/80 border-slate-200'}`}>
                            <div className="text-center mb-8">
                                <div className="lg:hidden mb-6 flex justify-center">
                                    <img src="/Raed.png" alt="Raid" className="w-32 h-auto" />
                                </div>
                                <h2 className={`text-2xl font-black mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{t('welcome_back') || t('login_to_system')}</h2>
                                <p className={`text-sm font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-white/40' : 'text-slate-400'}`}>{t('secure_access_required') || 'Enter your credentials'}</p>
                            </div>

                            <AnimatePresence mode="wait">
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs mb-6 flex items-center gap-3"
                                    >
                                        <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                                        {error}
                                    </motion.div>
                                )}
                                {message && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-4 rounded-2xl text-xs mb-6 flex items-center gap-3"
                                    >
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                        {message}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <div className="relative group/input">
                                        <Mail size={18} className={`absolute top-1/2 -translate-y-1/2 opacity-20 group-focus-within/input:opacity-100 group-focus-within/input:text-primary transition-all ${isRTL ? 'right-5' : 'left-5'} ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`} />
                                        <input
                                            type="email"
                                            required
                                            className={`w-full border rounded-2xl py-4 focus:border-primary/50 outline-none transition-all text-sm font-bold placeholder:opacity-20 ${theme === 'dark' ? 'bg-white/5 border-white/5 text-white focus:bg-white/10 placeholder:text-white' : 'bg-slate-100 border-slate-200 text-slate-900 focus:bg-white placeholder:text-slate-900'} ${isRTL ? 'pr-14 pl-6 text-right' : 'pl-14 pr-6 text-left'}`}
                                            placeholder={t('email_address')}
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="relative group/input">
                                        <Lock size={18} className={`absolute top-1/2 -translate-y-1/2 opacity-20 group-focus-within/input:opacity-100 group-focus-within/input:text-primary transition-all ${isRTL ? 'right-5' : 'left-5'} ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`} />
                                        <input
                                            type="password"
                                            required
                                            className={`w-full border rounded-2xl py-4 focus:border-primary/50 outline-none transition-all text-sm font-bold tracking-[0.3em] placeholder:opacity-20 ${theme === 'dark' ? 'bg-white/5 border-white/5 text-white focus:bg-white/10 placeholder:text-white' : 'bg-slate-100 border-slate-200 text-slate-900 focus:bg-white placeholder:text-slate-900'} ${isRTL ? 'pr-14 pl-6 text-right font-sans' : 'pl-14 pr-6 text-left'}`}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between px-1">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all group-hover:border-primary/50 ${theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-100'}`}>
                                            <input type="checkbox" className="hidden" />
                                            <div className="w-2.5 h-2.5 bg-primary rounded-sm opacity-0 transition-opacity"></div>
                                        </div>
                                        <span className={`text-[11px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white/30' : 'text-slate-400'}`}>{t('remember_me') || 'Remember Me'}</span>
                                    </label>
                                    <Link href="#" className="text-[11px] font-black text-primary/60 hover:text-primary uppercase tracking-widest transition-colors">
                                        {t('forgot_password') || 'Forgot Password?'}
                                    </Link>
                                </div>

                                <div className="space-y-4 pt-2">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        onClick={handleSubmit}
                                        className="w-full h-16 bg-gradient-to-r from-primary to-blue-600 hover:shadow-[0_10px_30px_-10px_rgba(var(--primary-rgb),0.5)] text-white font-black rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-3 text-lg relative overflow-hidden group/btn z-10"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 skew-x-[-20deg] pointer-events-none"></div>
                                        {loading ? (
                                            <div className="w-6 h-6 border-[3px] border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <div className="flex items-center gap-3 pointer-events-none">
                                                <span>{t('secure_login')}</span>
                                                <ChevronRight size={20} className={isRTL ? 'rotate-180' : ''} />
                                            </div>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleGuestLogin}
                                        disabled={loading}
                                        className={`w-full h-14 font-black rounded-2xl border transition-all text-xs uppercase tracking-[0.2em] z-10 ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border-white/5' : 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 border-slate-200'}`}
                                    >
                                        {t('guest_login')}
                                    </button>
                                </div>
                            </form>

                            <div className="mt-10 flex flex-col items-center gap-6">
                                <div className={`flex items-center gap-3 text-xs w-full ${theme === 'dark' ? 'text-white/20' : 'text-slate-300'}`}>
                                    <div className={`h-[1px] flex-1 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-200'}`}></div>
                                    <span className="font-black uppercase tracking-widest">{t('or_join_us') || 'OR'}</span>
                                    <div className={`h-[1px] flex-1 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-200'}`}></div>
                                </div>
                                
                                <div className="text-sm font-bold">
                                    <span className={`${theme === 'dark' ? 'text-white/30' : 'text-slate-400'}`}>{t('no_account')}</span>
                                    <Link href="/register" className="text-primary hover:text-primary/80 transition-all mx-2 underline underline-offset-4 decoration-2">
                                        {t('register_now')}
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Background Branding (Big subtle text) */}
            <div className={`absolute -bottom-10 -right-10 text-[15vw] font-black select-none pointer-events-none uppercase italic ${theme === 'dark' ? 'text-white/[0.02]' : 'text-slate-900/[0.02]'}`}>
                RAID SYSTEM
            </div>
        </div>
    );
}

function FeatureItem({ icon, title, desc, theme }) {
    return (
        <div className={`flex items-start gap-4 p-4 rounded-3xl border transition-all cursor-default ${theme === 'dark' ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-primary/20'}`}>
            <div className={`p-3 rounded-2xl shadow-inner ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-50'}`}>{icon}</div>
            <div>
                <h3 className={`font-black text-[15px] ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{title}</h3>
                <p className={`text-xs font-bold leading-relaxed ${theme === 'dark' ? 'text-white/40' : 'text-slate-400'}`}>{desc}</p>
            </div>
        </div>
    );
}
