'use client';
import React from 'react';
import { useOffline } from '@/context/OfflineContext';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export default function OfflineStatusBar() {
  const { isOnline, isSyncing, startManualSync } = useOffline();

  if (isOnline && !isSyncing) return null;

  return (
    <div className={`fixed bottom-4 right-4 flex items-center gap-3 px-4 py-2 rounded-full shadow-lg text-white transition-all transform ${
      isOnline ? 'bg-blue-600' : 'bg-red-600'
    } ${isSyncing ? 'animate-pulse' : ''}`}>
      {isOnline ? (
        <Wifi size={18} className="text-blue-100" />
      ) : (
        <WifiOff size={18} className="text-red-100" />
      )}
      
      <span className="text-sm font-medium">
        {!isOnline ? 'أنت تعمل أوفلاين' : isSyncing ? 'جاري المزامنة...' : 'متصل'}
      </span>

      {isOnline && !isSyncing && (
        <button 
          onClick={startManualSync}
          className="p-1 hover:bg-blue-700 rounded-full transition-colors"
          title="مزامنة الآن"
        >
          <RefreshCw size={16} />
        </button>
      )}
    </div>
  );
}
