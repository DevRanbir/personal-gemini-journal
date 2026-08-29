'use client';

import { useAuthContext } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingSkeleton } from '@/components/loading-skeleton';

interface ClientRouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  lightLoading?: boolean;
}

export function ClientRouteGuard({ 
  children, 
  requireAuth = false, 
  redirectTo = '/login',
}: ClientRouteGuardProps) {
  const { isAuthenticated, isLoading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && requireAuth && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isLoading, isAuthenticated, requireAuth, redirectTo, router]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (requireAuth && !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
