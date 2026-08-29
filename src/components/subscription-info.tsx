"use client";

import { useAuthContext } from "@/contexts/auth-context";
import { Badge } from "@/components/badge";
import { useSidebar } from "@/components/sidebar";
import { RiVipCrownLine, RiTeamLine } from "@remixicon/react";

export function SubscriptionInfo() {
  const { isAuthenticated, isLoading } = useAuthContext();
  const { state } = useSidebar();

  if (isLoading) {
    return (
      <div className="px-3 py-2">
        <div className="bg-sidebar-accent/50 rounded-lg p-3 border border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-sidebar-foreground/20 animate-pulse rounded"></div>
            {state !== "collapsed" && (
              <div className="w-16 h-4 bg-sidebar-foreground/20 animate-pulse rounded"></div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const currentPlan = isAuthenticated ? {
    name: 'Gemini 2.0 Flash Lite',
    icon: RiVipCrownLine,
    color: 'text-white border',
    description: 'Authenticated Cloud Run'
  } : {
    name: 'Free Harmony',
    icon: RiTeamLine,
    color: 'text-white border',
    description: ''
  };

  const Icon = currentPlan.icon;

  if (state === "collapsed") {
    return (
      <div className="px-3 py-2">
        <div className="bg-sidebar-accent/50 rounded-lg p-3 border border-sidebar-border flex items-center justify-center" title={currentPlan.name}>
          <Icon size={20} className="text-sidebar-foreground/70" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-2">
      <div className="bg-sidebar-accent/50 rounded-lg p-3 border border-sidebar-border">
        <div className="flex items-center gap-2 mb-1">
          <Icon size={16} className="text-sidebar-foreground/70" />
          <span className="text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wide">
            Current Plan
          </span>
        </div>
        
        <div>
          <div>
            <Badge 
              variant="outline" 
              className={`${currentPlan.color} font-medium`}
            >
              {currentPlan.name}
            </Badge>
            <p className="text-xs text-sidebar-foreground/60 mt-1">
              {currentPlan.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
