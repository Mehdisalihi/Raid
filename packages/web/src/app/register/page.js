'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/lib/api';
import { motion } from 'framer-motion';
import { User, Mail, Lock, ChevronRight, ArrowLeft, Sun, Moon, CheckCircle2, BarChart3, Cloud } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { useTheme } from '@/lib/ThemeContext';

export default function RegisterPage() {
    const { t, isRTL, lang, toggleLang } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await authService.register(formData.name, formData.email, formData.password);
            // Instead of verify code page, we can show a success message or a dedicated 'check email' page
            setFormData({ name: '', email: '', password: '' });
            alert(isRTL ? 'تم التسجيل بنجاح! يرجى مراجعة بريدك الإلكتروني لتفعيل الحساب.' : 'Inscription réussie ! Veuillez vérifier votre e-mail pour activer votre compte.');
            router.push('/login');
        } catch (err) {
            setError(err.response?.data?.error || t('register_error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`relative min-h-screen flex items-center justify-center p-4 md:p-6 overflow-hidden transition-colors duration-500 ${theme === 'dark' ? 'bg-[#020617] text-white' : 'bg-slate-50 text-slate-900'} ${isRTL ? 'direction-rtl font-arabic' : 'direction-ltr font-sans'}`}>
            {/* Background Elements */}
            <div className="absolute inset-0 z-0">
                <div className={`absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[140px] animate-pulse ${theme === 'dark' ? 'bg-primary/20' : 'bg-primary/10'}`}></div>
                <div className={`absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] animate-pulse ${theme === 'dark' ? 'bg-blue-600/10' : 'bg-blue-600/5'}`} style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Top Toolbar */}
            <div className={`absolute top-6 z-50 flex items-center gap-3 ${isRTL ? 'left-6' : 'right-6'}`}>
                <div className={`flex gap-1 p-1 backdrop-blur-xl rounded-2xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/5'}`}>
                    <button onClick={() => toggleLang('ar')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${lang === 'ar' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>AR</button>
                    <button onClick={() => toggleLang('fr')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${lang === 'fr' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>FR</button>
                </div>
                <button onClick={toggleTheme} className={`p-3 rounded-2xl backdrop-blur-xl border transition-all ${theme === 'dark' ? 'bg-white/5 border-white/10 text-yellow-400 hover:bg-white/10' : 'bg-black/5 border-black/5 text-slate-600 hover:bg-black/10'}`}>
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
            </div>

            <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center justify-center gap-12 relative z-10">
                {/* Left Side: Features */}
                <motion.div
                    initial={{ opacity: 0, x: isRTL ? 40 : -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    className="hidden lg:flex flex-col flex-1 max-w-md space-y-10"
                >
                    <div className="space-y-4">
                        <img src="/Raed.png" alt="Raid Logo" className={`w-48 h-auto drop-shadow-sm ${theme === 'dark' ? 'brightness-110' : ''}`} />
                        <h1 className={`text-4xl font-black leading-tight tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {t('create_account_title') || t('register_new_account')}
                        </h1>
                        <p className={`text-lg font-medium ${theme === 'dark' ? 'text-white/50' : 'text-slate-500'}`}>
                            {t('join_community_desc') || 'Join thousands of businesses managing their finances with Raid.'}
                        </p>
                    </div>
                    <div className="space-y-6">
                        <FeatureItem icon={<CheckCircle2 className="text-primary"/>} title={t('instant_setup') || "Instant Setup"} desc={t('instant_setup_desc') || "Get started in less than 2 minutes."} theme={theme} />
                        <FeatureItem icon={<BarChart3 className="text-secondary"/>} title={t('realtime_sync') || "Real-time Sync"} desc={t('realtime_sync_desc') || "Your data is always up to date across all devices."} theme={theme} />
                        <FeatureItem icon={<Cloud className="text-accent"/>} title={t('unlimited_storage') || "Unlimited Storage"} desc={t('unlimited_storage_desc') || "Store all your invoices and records securely."} theme={theme} />
                    </div>
                </motion.div>

                {/* Right Side: Form */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6 }}
                    className="w-full max-w-md"
                >
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-blue-600/20 rounded-[3rem] blur-2xl opacity-50 group-hover:opacity-75 transition-opacity duration-1000"></div>
                        <div className={`relative p-8 md:p-10 rounded-[3rem] border shadow-2xl backdrop-blur-3xl overflow-hidden ${theme === 'dark' ? 'glass-premium border-white/10' : 'bg-white/80 border-slate-200'}`}>
                            <div className="text-center mb-8">
                                <Link href="/login" className={`inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] mb-6 hover:text-primary transition-colors ${theme === 'dark' ? 'text-white/30' : 'text-slate-400'}`}>
                                    <ArrowLeft size={14} className={isRTL ? 'rotate-180' : ''} /> {t('back_to_login')}
                                </Link>
                                <h2 className={`text-2xl font-black mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                    {t('get_started') || t('register_new_account')}
                                </h2>
                                <p className={`text-sm font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-white/40' : 'text-slate-400'}`}>
                                    {t('create_new_workspace') || 'Create your workspace'}
                                </p>
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs mb-6 flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <RegisterInput icon={User} label={t('full_name')} placeholder="Ahmed Salek" value={formData.name} onChange={v => setFormData({...formData, name: v})} isRTL={isRTL} theme={theme} />
                                <RegisterInput icon={Mail} label={t('email_address')} placeholder="ahmed@example.com" type="email" value={formData.email} onChange={v => setFormData({...formData, email: v})} isRTL={isRTL} theme={theme} />
                                <RegisterInput icon={Lock} label={t('password')} placeholder="••••••••" type="password" value={formData.password} onChange={v => setFormData({...formData, password: v})} isRTL={isRTL} theme={theme} />

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full h-16 bg-gradient-to-r from-primary to-blue-600 text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-lg relative overflow-hidden group/btn"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 skew-x-[-20deg]"></div>
                                        {loading
                                            ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            : <><span>{t('register_now')}</span><ChevronRight size={20} className={isRTL ? 'rotate-180' : ''} /></>
                                        }
                                    </button>
                                </div>
                            </form>

                            <div className="mt-8 text-center">
                                <p className={`text-sm font-bold ${theme === 'dark' ? 'text-white/30' : 'text-slate-400'}`}>
                                    {t('already_have_account')}{' '}
                                    <Link href="/login" className="text-primary hover:text-primary/80 transition-all mx-2 underline underline-offset-4 decoration-2">
                                        {t('login_here') || 'Login Now'}
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            <div className={`absolute -bottom-10 -left-10 text-[15vw] font-black select-none pointer-events-none uppercase italic ${theme === 'dark' ? 'text-white/[0.02]' : 'text-slate-900/[0.02]'}`}>
                RAID REGISTER
            </div>
        </div>
    );
}

function RegisterInput({ icon: Icon, label, placeholder, type = "text", value, onChange, isRTL, theme }) {
    return (
        <div className="space-y-2">
            <label className={`text-[10px] font-black uppercase tracking-widest px-1 flex items-center gap-2 ${theme === 'dark' ? 'text-white/30' : 'text-slate-400'}`}>
                <Icon size={12} /> {label}
            </label>
            <div className="relative group/input">
                <input
                    type={type}
                    required
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={`w-full border rounded-2xl py-4 px-6 outline-none transition-all text-sm font-bold placeholder:opacity-20 ${theme === 'dark' ? 'bg-white/5 border-white/5 text-white focus:border-primary/50 focus:bg-white/10 placeholder:text-white' : 'bg-slate-100 border-slate-200 text-slate-900 focus:border-primary/50 focus:bg-white placeholder:text-slate-900'} ${isRTL ? 'text-right' : 'text-left'}`}
                />
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
