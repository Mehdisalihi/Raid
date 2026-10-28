'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/LanguageContext';

export function CorporateHeader({ isRTL, printDate }) {
    const { lang } = useLanguage();
    const [storeInfo, setStoreInfo] = useState({ name: '', logo: null, slogan: '', address: '', phone: '', email: '', taxId: '' });

    useEffect(() => {
        try {
            const savedUser = localStorage.getItem('user');
            if (savedUser) {
                const user = JSON.parse(savedUser);
                setStoreInfo({
                    name: user.storeName || (isRTL ? 'اسم مؤسستك' : 'Your Institution Name'),
                    logo: user.storeLogo || null,
                    slogan: user.storeSlogan || (isRTL ? 'لإدارة أموالك بذكاء' : 'Smart Financial Management'),
                    address: user.storeAddress || '',
                    phone: user.storePhone || '',
                    email: user.storeEmail || '',
                    taxId: user.storeTaxId || ''
                });
            }
        } catch (_err) {
            // Ignore storage parse errors
        }
    }, [isRTL]);

    return (
        <div className="hidden print:block mb-4 border-b-2 border-slate-900 pb-4">
            <div className={`flex items-center gap-1.5 mb-2 text-[8px] font-bold text-slate-400 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <img src="/Raed.png" alt="App Logo" className="w-3.5 h-3.5 grayscale opacity-40" />
                <span>{isRTL ? 'رائد المحاسبي' : 'Raid Accounting'}</span>
            </div>

            <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden p-1">
                        {storeInfo.logo ? (
                            <img src={storeInfo.logo} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                            <span className="text-[9px] text-slate-400 text-center font-bold">{isRTL ? 'شعار المؤسسة' : 'Institution Logo'}</span>
                        )}
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                            {storeInfo.name}
                        </h1>
                        <div className="flex flex-col text-[9px] font-bold text-slate-600 uppercase tracking-tight">
                            {storeInfo.address && <span>{isRTL ? 'العنوان: ' : 'Address: '}{storeInfo.address}</span>}
                            {storeInfo.phone && <span>{isRTL ? 'الهاتف: ' : 'Tel: '}{storeInfo.phone}</span>}
                            {storeInfo.email && <span>{isRTL ? 'الإيميل: ' : 'Email: '}{storeInfo.email}</span>}
                            {storeInfo.taxId && <span className="mt-1 text-slate-900">{isRTL ? 'الرقم الضريبي: ' : 'Tax ID: '}{storeInfo.taxId}</span>}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                    <h2 className="text-3xl font-black text-sky-700 uppercase tracking-widest leading-none">
                        {isRTL ? 'كشف حساب' : (lang === 'fr' ? 'RELEVÉ DE COMPTE' : 'Statement')}
                    </h2>
                    <table className="text-[10px] font-bold text-slate-800 border-collapse">
                        <tbody>
                            <tr>
                                <td className="pr-4 py-0.5">{isRTL ? 'التاريخ:' : 'Date:'}</td>
                                <td className="border border-slate-300 px-2 py-0.5 bg-white min-w-[100px]">{printDate}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export function PrintFooter({ isRTL, finalBalance, fmt }) {
    const { lang } = useLanguage();
    return (
        <div className="hidden print:flex flex-col items-center mt-12 text-[11px] text-slate-800 break-inside-avoid">
            <p className="font-bold mb-3">
                {isRTL 
                    ? `رصيد حسابك هو ${fmt(Math.abs(finalBalance))} MRU. يرجى تسوية الحسابات المعلقة.`
                    : (lang === 'fr' 
                        ? `Le solde du compte est de ${fmt(Math.abs(finalBalance))} MRU. Veuillez régulariser les soldes impayés.`
                        : `Your account balance is ${fmt(Math.abs(finalBalance))} MRU. Please settle outstanding balances.`)}
            </p>
            <h4 className="text-base font-black mb-4">
                {isRTL ? 'شكراً لتعاملكم معنا!' : (lang === 'fr' ? 'Merci de votre confiance !' : 'Thank you for your business!')}
            </h4>
            
            <div className="w-full border-t border-slate-300 pt-3 text-center space-y-1 text-[10px]">
                <p>
                    {isRTL 
                        ? 'إذا كان لديك أي استفسارات بخصوص كشف الحساب، يرجى التواصل معنا'
                        : (lang === 'fr' 
                            ? 'Pour toute question concernant ce relevé, n\'hésitez pas à nous contacter'
                            : 'Should you have any enquiries concerning this statement, please contact us')}
                </p>
            </div>
        </div>
    );
}

export function EntityPrintSection({ entity, entityLabel, fmtDate, isRTL, fmtNumber, summary }) {
    const { lang } = useLanguage();
    if (!entity) return null;

    return (
        <div className="hidden print:grid grid-cols-2 gap-4 mb-2 break-inside-avoid">
            <div className="flex flex-col border border-slate-300">
                <div className="bg-sky-600 text-white font-bold text-[12px] px-3 py-1 uppercase print-exact">
                    {entityLabel || (isRTL ? 'الجهة:' : 'Entity:')}
                </div>
                <div className="p-3 text-[11px] font-bold text-slate-800 leading-relaxed">
                    <p>{entity.name}</p>
                    {entity.phone && <p>{entity.phone}</p>}
                    {entity.address && <p>{entity.address}</p>}
                    {entity.email && <p>{entity.email}</p>}
                </div>
            </div>

            <div className="flex flex-col border border-slate-300">
                <div className="bg-sky-600 text-white font-bold text-[12px] px-3 py-1 uppercase print-exact">
                    {isRTL ? 'ملخص الحساب:' : (lang === 'fr' ? 'RÉSUMÉ DU COMPTE :' : 'Account Summary:')}
                </div>
                <div className="p-3 text-[11px] font-bold text-slate-800 space-y-1">
                    <div className="flex justify-between">
                        <span>{isRTL ? 'إجمالي المدين:' : 'Total Debit:'}</span>
                        <span>{fmtNumber(summary?.totalDebit || 0)} MRU</span>
                    </div>
                    <div className="flex justify-between">
                        <span>{isRTL ? 'إجمالي الدائن:' : 'Total Credit:'}</span>
                        <span>{fmtNumber(summary?.totalCredit || 0)} MRU</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-1 text-sky-800 font-black">
                        <span>{isRTL ? 'الرصيد النهائي:' : 'Final Balance:'}</span>
                        <span>{fmtNumber(summary?.balance || 0)} MRU</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
