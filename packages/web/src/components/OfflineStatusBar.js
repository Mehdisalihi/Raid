'use client';
import React, { useState, useEffect } from 'react';
import { useOffline } from '@/context/OfflineContext';
import { Wifi, WifiOff, RefreshCw, CloudOff, Upload } from 'lucide-react';

export default function OfflineStatusBar() {
  const { isOnline, isSyncing, pendingCount, startManualSync } = useOffline();
  const [showDetails, setShowDetails] = useState(false);

  // Always show when offline or has pending items
  if (isOnline && !isSyncing && pendingCount === 0) return null;

  return (
    <div className="fixed bottom-14 right-4 z-[150] flex flex-col items-end gap-2 print:hidden">
      {/* Details tooltip */}
      {showDetails && !isOnline && (
        <div className="bg-slate-900/95 backdrop-blur-xl text-white rounded-2xl p-4 shadow-2xl border border-white/10 w-72 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2 mb-3">
            <CloudOff size={16} className="text-amber-400" />
            <span className="text-sm font-black">وضع بدون اتصال</span>
          </div>
          <div className="space-y-2 text-xs">
            <p className="text-slate-300 leading-relaxed">
              التطبيق يعمل من البيانات المحلية المخزنة على جهازك.
              كل التعديلات ستُحفظ محلياً وتُزامن تلقائياً عند عودة الاتصال.
            </p>
            {pendingCount > 0 && (
              <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <Upload size={14} className="text-amber-400" />
                <span className="text-amber-300 font-bold">
                  {pendingCount} عملية في انتظار المزامنة
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main status pill */}
      <button
        onClick={() => {
          if (isOnline && !isSyncing) {
            startManualSync();
          } else {
            setShowDetails(!showDetails);
          }
        }}
        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-xl text-white transition-all duration-300 hover:scale-105 active:scale-95 backdrop-blur-xl border ${
          isOnline 
            ? 'bg-blue-600/90 border-blue-400/20 shadow-blue-500/20' 
            : 'bg-red-600/90 border-red-400/20 shadow-red-500/20'
        } ${isSyncing ? 'animate-pulse' : ''}`}
      >
        {isOnline ? (
          isSyncing ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <Wifi size={16} />
          )
        ) : (
          <WifiOff size={16} />
        )}
        
        <span className="text-xs font-black tracking-tight">
          {!isOnline 
            ? 'أوفلاين' 
            : isSyncing 
              ? 'جاري المزامنة...' 
              : 'مزامنة'
          }
        </span>

        {pendingCount > 0 && (
          <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-white/20 text-[10px] font-black">
            {pendingCount}
          </span>
        )}
      </button>
    </div>
  );
}
