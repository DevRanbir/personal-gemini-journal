/**
 * Clerk configuration utilities for proper URL handling in production
 */

/**
 * Get the base URL for the application
 * This ensures we use the correct domain in production vs development
 */
export function getBaseUrl() {
  // In production, use the deployed domain
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_CLERK_DOMAIN || 
           process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
           process.env.RAILWAY_STATIC_URL ||
           'https://harmony-production-ready.up.railway.app';
  }
  
  // In development, use localhost
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

/**
 * Get properly formatted URLs for Clerk configuration
 */
export function getClerkUrls() {
  const baseUrl = getBaseUrl();
  
  return {
    signInUrl: `${baseUrl}/login`,
    signUpUrl: `${baseUrl}/login`,
    afterSignInUrl: `${baseUrl}/chat`,
    afterSignUpUrl: `${baseUrl}/chat`,
  };
}

/**
 * Clerk environment validation
 */
export function validateClerkConfig() {
  const requiredEnvVars = [
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY'
  ];
  
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    console.error('Missing required Clerk environment variables:', missing);
    return false;
  }
  
  return true;
}

/**
 * Log current Clerk configuration (for debugging)
 */
export function logClerkConfig() {
  if (process.env.NODE_ENV === 'development') {
    console.log('Clerk Configuration:', {
      baseUrl: getBaseUrl(),
      urls: getClerkUrls(),
      publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 20) + '...',
      hasSecretKey: !!process.env.CLERK_SECRET_KEY,
    });
  }
}
