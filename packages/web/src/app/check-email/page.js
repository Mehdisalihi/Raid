'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

function CheckEmailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const email = searchParams.get('email');

    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 text-center shadow-2xl"
            >
                <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center mb-8 mx-auto">
                    <Mail size={32} className="text-primary" />
                </div>
                
                <h1 className="text-3xl font-black text-white mb-4 italic">تفقد بريدك!</h1>
                <p className="text-slate-400 font-bold text-sm leading-relaxed mb-10">
                    لقد أرسلنا رابط تفعيل إلى <span className="text-primary">{email || 'بريدك الإلكتروني'}</span>. 
                    يرجى النقر على الرابط لتتمكن من الدخول إلى حسابك.
                </p>

                <div className="space-y-4">
                    <button 
                        onClick={() => router.push('/login')}
                        className="w-full h-14 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-sm transition-all border border-white/10 flex items-center justify-center gap-3"
                    >
                        <ArrowLeft size={18} className="rotate-180" />
                        العودة لتسجيل الدخول
                    </button>
                </div>
                
                <p className="mt-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">RAID SECURE SYSTEM</p>
            </motion.div>
        </div>
    );
}

export default function CheckEmailPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#020617]" />}>
            <CheckEmailContent />
        </Suspense>
    );
}
