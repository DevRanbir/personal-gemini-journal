// Utility functions for subscription management
// Note: In production, use Clerk's actual billing API

export type SubscriptionPlan = 'free' | 'pro' | 'education' | 'enterprise';

export interface SubscriptionInfo {
  plan: SubscriptionPlan;
  status: 'active' | 'inactive' | 'trial' | 'canceled';
  billingPeriod?: 'monthly' | 'yearly';
  nextBillingDate?: string;
  features?: string[];
}

// Simulate getting subscription info from user metadata
export function getSubscriptionInfo(userMetadata: Record<string, unknown> | null | undefined): SubscriptionInfo {
  return (userMetadata?.subscription as SubscriptionInfo) || {
    plan: 'free',
    status: 'active',
    features: ['Basic features', 'Community support']
  };
}

// Plan features mapping
export const PLAN_FEATURES = {
  free: [
    'Up to 3 team members',
    'Basic workspace features',
    'Community support',
    '5GB storage'
  ],
  pro: [
    'Up to 25 team members',
    'Advanced collaboration tools',
    'Priority email support',
    '100GB storage',
    'Advanced integrations',
    'Analytics dashboard'
  ],
  education: [
    'Up to 50 team members',
    'Educational features',
    'Priority support',
    '50GB storage',
    'Student-friendly tools'
  ],
  enterprise: [
    'Unlimited team members',
    'Enterprise-grade security',
    'Dedicated account manager',
    'Unlimited storage',
    'Custom integrations',
    '24/7 phone support'
  ]
};

// Simulate updating subscription (in production, use Clerk's billing API)
export async function updateSubscription(plan: SubscriptionPlan): Promise<boolean> {
  try {
    // This would be replaced with actual Clerk billing API calls
    console.log(`Updating subscription to ${plan} plan`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In production, this would update the user's metadata via Clerk
    return true;
  } catch (error) {
    console.error('Failed to update subscription:', error);
    return false;
  }
}

// Helper to check if user has access to a feature
export function hasFeatureAccess(userPlan: SubscriptionPlan, feature: string): boolean {
  // Enterprise has access to everything
  if (userPlan === 'enterprise') return true;
  
  // Check specific feature access based on plan
  switch (feature) {
    case 'advanced_analytics':
      return ['pro', 'enterprise'].includes(userPlan);
    case 'custom_integrations':
      return ['enterprise'].includes(userPlan);
    case 'priority_support':
      return ['pro', 'education', 'enterprise'].includes(userPlan);
    default:
      return true; // Basic features available to all
  }
}
