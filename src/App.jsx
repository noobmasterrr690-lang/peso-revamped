import React, { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * PESO React Application Framework Bridge
 * Coordinates live SQLite Database synchronization, Capacitor Native iOS/Android
 * platform status, and PWA offline service worker lifecycle.
 */
export default function App() {
  const [dbConnected, setDbConnected] = useState(false);
  const [platform, setPlatform] = useState('web');
  const [lastSync, setLastSync] = useState(null);

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data?.ok) {
          setDbConnected(true);
          setLastSync(new Date().toISOString());
          if (window.pesoApp) {
            window.pesoApp.renderShellTelemetry();
          }
        }
      }
    } catch {
      setDbConnected(false);
    }
  }, []);

  useEffect(() => {
    try {
      setPlatform(Capacitor.getPlatform() || 'web');
    } catch {
      setPlatform('web');
    }
    checkHealth();
    const timer = setInterval(checkHealth, 15000);
    return () => clearInterval(timer);
  }, [checkHealth]);

  return (
    <div
      data-react-framework="React-19-Vite-Capacitor"
      data-platform={platform}
      data-sqlite-connected={String(dbConnected)}
      data-last-sync={lastSync || 'pending'}
    />
  );
}
