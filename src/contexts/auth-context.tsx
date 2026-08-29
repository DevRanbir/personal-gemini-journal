"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  User as FirebaseUser, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  isLoading: boolean;
  loading: boolean;
  authTimeout: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail?: (email: string, pass: string) => Promise<void>;
  signUpWithEmail?: (email: string, pass: string) => Promise<void>;
  resetPassword?: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAuth: () => void;
  retryAuth: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  isLoading: true,
  loading: true,
  authTimeout: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshAuth: () => {},
  retryAuth: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Google sign-in error:", error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.error("Email sign-in error:", error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.error("Email sign-up error:", error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Password reset error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('harmony-active-journal-date');
      }
      await firebaseSignOut(auth);
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (error) {
      console.error("Sign out error:", error);
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  };

  const value: AuthContextType = {
    isAuthenticated: !!user,
    user,
    isLoading: loading,
    loading,
    authTimeout: false,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    signOut,
    refreshAuth: () => {},
    retryAuth: () => {},
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}

export function useAuth() {
  return useContext(AuthContext);
}
