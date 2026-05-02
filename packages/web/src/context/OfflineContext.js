'use client';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { SyncService } from '@/lib/SyncService';

const OfflineContext = createContext({
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  startManualSync: () => {}
});

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPendingCount = useCallback(async () => {
    const count = await SyncService.getPendingCount();
    setPendingCount(count);
  }, []);

  const performSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await SyncService.syncNow();
    } catch (e) {
      console.error('Sync error:', e);
    }
    setIsSyncing(false);
    await refreshPendingCount();
  }, [isSyncing, refreshPendingCount]);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      performSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic sync every 5 minutes
    const syncInterval = setInterval(() => {
      if (navigator.onLine) performSync();
    }, 5 * 60 * 1000);

    // Periodic pending count refresh every 10 seconds
    const countInterval = setInterval(() => {
      refreshPendingCount();
    }, 10 * 1000);

    // Initial pending count
    refreshPendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(syncInterval);
      clearInterval(countInterval);
    };
  }, [performSync, refreshPendingCount]);

  return (
    <OfflineContext.Provider value={{ isOnline, isSyncing, pendingCount, startManualSync: performSync }}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => useContext(OfflineContext);
