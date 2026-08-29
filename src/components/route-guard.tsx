"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthContext } from '@/contexts/auth-context';
import { LoadingSkeleton } from '@/components/loading-skeleton';

interface RouteGuardProps {
  children: React.ReactNode;
  protectedRoutes?: string[];
}

export function RouteGuard({ children, protectedRoutes = ['/chat', '/admin'] }: RouteGuardProps) {
  const { isAuthenticated, isLoading, authTimeout, retryAuth } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't do anything while loading, unless there's a timeout
    if (isLoading && !authTimeout) return;

    // Skip protection for SSO callback and login routes
    if (pathname === '/login/sso-callback' || pathname.startsWith('/login')) {
      return;
    }

    // Chat supports local anonymous fallback, so never redirect it.
    if (pathname === '/chat' || pathname.startsWith('/chat/')) {
      return;
    }

    // Check if current route is protected
    const isProtectedRoute = protectedRoutes.some(route => {
      if (route.endsWith('*')) {
        return pathname.startsWith(route.slice(0, -1));
      }
      return pathname === route || pathname.startsWith(route + '/');
    });

    // Redirect to login if accessing protected route while not authenticated
    // or if auth timed out and we're on a protected route
    if (isProtectedRoute && (!isAuthenticated || authTimeout)) {
      const loginUrl = `/login?redirect_url=${encodeURIComponent(pathname)}`;
      router.push(loginUrl);
    }
  }, [isAuthenticated, isLoading, authTimeout, pathname, router, protectedRoutes]);

  // Show loading state while checking auth, unless there's a timeout
  if (isLoading && !authTimeout) {
    return <LoadingSkeleton />;
  }

  // If auth timed out, show a timeout message with retry option
  if (authTimeout && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-lg font-medium">Authentication timeout</div>
          <div className="text-sm text-muted-foreground">
            Taking longer than expected. Please try again or refresh the page.
          </div>
          <div className="flex gap-2 justify-center">
            <button 
              onClick={retryAuth}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Retry
            </button>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
