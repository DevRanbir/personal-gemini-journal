"use client";

import { useAuthContext } from "@/contexts/auth-context";

export function useOptimizedAuth() {
  const { isAuthenticated, isLoading, user, refreshAuth, retryAuth } = useAuthContext();

  return {
    isAuthenticated,
    isLoading,
    authTimeout: false,
    user,
    refreshAuth,
    retryAuth,
    isSignedIn: isAuthenticated && !!user,
    isSignedOut: !isLoading && !isAuthenticated,
    hasTimeout: false,
  };
}
