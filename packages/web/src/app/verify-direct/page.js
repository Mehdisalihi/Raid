'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '@/lib/api';

function VerifyDirectContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email');
    const code = searchParams.get('code');
    
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('');

    useEffect(() => {
        const verifyAccount = async () => {
            if (!email || !code) {
                setStatus('error');
                setMessage('رابط التفعيل غير صالح أو منتهي الصلاحية');
                return;
            }

            try {
                const response = await api.post('/auth/verify', { email, code });
                
                // Save user data
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
                
                setStatus('success');
                setMessage('تم تفعيل حسابك بنجاح! يتم توجيهك الآن...');
                
                // Redirect after success
                setTimeout(() => {
                    router.push('/dashboard');
                }, 2500);
            } catch (err) {
                setStatus('error');
                setMessage(err.response?.data?.error || 'فشل تفعيل الحساب، الرابط قد يكون مستخدماً أو غير صالح');
            }
        };

        verifyAccount();
    }, [email, code, router]);

    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 selection:bg-primary/30">
            {/* Background Animations */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 shadow-2xl text-center relative overflow-hidden group">
                    {/* Inner Glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5" />
                    
                    <div className="relative z-10">
                        <div className="flex justify-center mb-8">
                            <AnimatePresence mode="wait">
                                {status === 'verifying' && (
                                    <motion.div 
                                        key="verifying"
                                        initial={{ opacity: 0, rotate: -180 }}
                                        animate={{ opacity: 1, rotate: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="w-24 h-24 rounded-3xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-2xl shadow-primary/20"
                                    >
                                        <Loader2 className="text-primary animate-spin" size={40} />
                                    </motion.div>
                                )}

                                {status === 'success' && (
                                    <motion.div 
                                        key="success"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center shadow-2xl shadow-emerald-500/40 border-4 border-emerald-400/20"
                                    >
                                        <CheckCircle2 className="text-white" size={48} />
                                    </motion.div>
                                )}

                                {status === 'error' && (
                                    <motion.div 
                                        key="error"
                                        initial={{ scale: 0, rotate: 10 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center shadow-2xl shadow-red-500/40 border-4 border-red-400/20"
                                    >
                                        <XCircle className="text-white" size={48} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <h1 className="text-3xl font-black text-white mb-4 tracking-tight">
                            {status === 'verifying' && 'جاري التحقق...'}
                            {status === 'success' && 'تم التفعيل!'}
                            {status === 'error' && 'عذراً، فشل التفعيل'}
                        </h1>

                        <p className={`text-sm font-bold leading-relaxed mb-10 ${status === 'error' ? 'text-red-400' : 'text-slate-400'}`}>
                            {message || 'يرجى الانتظار بينما نقوم بمراجعة الرابط الخاص بك'}
                        </p>

                        <div className="pt-8 border-t border-white/5">
                            {status === 'error' ? (
                                <button 
                                    onClick={() => router.push('/login')}
                                    className="w-full h-14 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-sm transition-all border border-white/10 flex items-center justify-center gap-3"
                                >
                                    <ArrowRight size={18} className="rotate-180" />
                                    العودة لتسجيل الدخول
                                </button>
                            ) : status === 'success' ? (
                                <div className="flex items-center justify-center gap-3 text-emerald-400 font-black text-xs uppercase tracking-widest animate-pulse">
                                    <ShieldCheck size={16} />
                                    أمان حسابك مكتمل
                                </div>
                            ) : (
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">RAID SECURE VERIFICATION</p>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

import { AnimatePresence } from 'framer-motion';

export default function VerifyDirectPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <Loader2 className="text-primary animate-spin" size={40} />
            </div>
        }>
            <VerifyDirectContent />
        </Suspense>
    );
}
