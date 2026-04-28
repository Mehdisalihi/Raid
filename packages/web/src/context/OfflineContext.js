'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { SyncService } from '@/lib/SyncService';

const OfflineContext = createContext({
  isOnline: true,
  isSyncing: false,
  startManualSync: () => {}
});

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      performSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      if (navigator.onLine) performSync();
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const performSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    await SyncService.syncNow();
    setIsSyncing(false);
  };

  return (
    <OfflineContext.Provider value={{ isOnline, isSyncing, startManualSync: performSync }}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => useContext(OfflineContext);

