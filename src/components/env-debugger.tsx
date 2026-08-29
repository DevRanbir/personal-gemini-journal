"use client";

import { useEffect } from 'react';

/**
 * Development helper component to debug environment variables and configuration
 * Only shows in development mode
 */
export function EnvDebugger() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.group('🔧 Environment Debug Info');
      console.log('Node Environment:', process.env.NODE_ENV);
      console.log('Base URL:', window.location.origin);
      
      console.group('Clerk Configuration');
      console.log('Publishable Key:', process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 20) + '...');
      console.log('Sign In URL:', process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL);
      console.log('Sign Up URL:', process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL);
      console.log('After Sign In URL:', process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL);
      console.log('After Sign Up URL:', process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL);
      console.log('Domain:', process.env.NEXT_PUBLIC_CLERK_DOMAIN);
      console.groupEnd();
      
      console.group('Other Environment Variables');
      console.log('Groq API Key:', 'Server-only variable');
      console.log('Firebase Config:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'Set' : 'Not set');
      console.groupEnd();
      
      console.groupEnd();
    }
  }, []);

  // Don't render anything in production
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '10px', 
      right: '10px', 
      background: 'rgba(0,0,0,0.8)', 
      color: 'white', 
      padding: '8px 12px', 
      borderRadius: '4px', 
      fontSize: '12px',
      zIndex: 9999 
    }}>
      🔧 Check console for debug info
    </div>
  );
}
