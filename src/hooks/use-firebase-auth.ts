import { useAuthContext } from "@/contexts/auth-context";

export function useFirebaseAuth() {
  const { user, isLoading, isAuthenticated } = useAuthContext();

  return {
    isReady: !isLoading,
    username: user?.displayName || (typeof user?.email === 'string' ? user.email.split('@')[0] : user?.uid) || null,
    user,
    isAuthenticated,
  };
}
