'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectInvoicesNew() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard/invoices');
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <div className="w-12 h-12 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-[--text-muted] text-sm animate-pulse font-bold">جاري الانتقال لصفحة الفواتير...</p>
        </div>
    );
}
