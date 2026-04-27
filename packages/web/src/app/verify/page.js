'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function VerifyRedirectContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        // Redirect to verify-direct with all query params preserved
        const params = searchParams.toString();
        router.replace(`/verify-direct${params ? `?${params}` : ''}`);
    }, [router, searchParams]);

    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-white">
                <Loader2 className="text-primary animate-spin" size={40} />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">
                    جاري التحقق...
                </p>
            </div>
        </div>
    );
}

export default function VerifyPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <Loader2 className="text-primary animate-spin" size={40} />
            </div>
        }>
            <VerifyRedirectContent />
        </Suspense>
    );
}
