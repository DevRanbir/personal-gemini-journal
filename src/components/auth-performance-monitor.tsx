"use client";

import { useEffect, useState } from 'react';
import { useOptimizedAuth } from '@/hooks/use-optimized-auth';

interface AuthPerformanceMonitorProps {
  enabled?: boolean;
}

export function AuthPerformanceMonitor({ enabled = false }: AuthPerformanceMonitorProps) {
  const [checkCount, setCheckCount] = useState(0);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const { isAuthenticated, isLoading } = useOptimizedAuth();

  useEffect(() => {
    if (enabled) {
      setCheckCount(prev => prev + 1);
      setLastCheckTime(new Date());
    }
  }, [isAuthenticated, isLoading, enabled]);

  if (!enabled || process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 rounded text-xs z-50">
      <div>Auth checks: {checkCount}</div>
      <div>Last check: {lastCheckTime?.toLocaleTimeString()}</div>
      <div>Status: {isLoading ? 'Loading' : isAuthenticated ? 'Authenticated' : 'Not authenticated'}</div>
    </div>
  );
}
