"use client";

import { Button } from "@/components/button";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/sidebar";
import Link from "next/link";
import Hyperspeed from "@/components/Hyperspeed";
import Dock from "@/components/Dock";
import { useAuthContext } from "@/contexts/auth-context";
import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { RiChatSmileLine, RiSeedlingLine } from "@remixicon/react";

// Custom hook for scroll-triggered animations
const useScrollAnimation = () => {
  const [visibleElements, setVisibleElements] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Create the intersection observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleElements((prev) => {
              if (prev.has(entry.target.id)) return prev;
              const newSet = new Set(prev);
              newSet.add(entry.target.id);
              return newSet;
            });
          }
        });
      },
      {
        threshold: 0.2, // Increased threshold to 20%
        rootMargin: '0px', // Removed negative margin to trigger easier
      }
    );

    // Function to observe elements
    const observeElements = () => {
      const elements = document.querySelectorAll('[data-scroll-animate]');
      elements.forEach((el) => {
        if (el.id && observerRef.current) {
          observerRef.current.observe(el);
        }
      });
    };

    // Listen for retrigger event
    const handleRetrigger = () => {
      observeElements();
    };

    // Initial observation attempts
    observeElements();
    
    // Try again after DOM is ready
    const timeoutId = setTimeout(observeElements, 500);
    const timeoutId2 = setTimeout(observeElements, 1500);

    // Listen for custom retrigger event
    window.addEventListener('retrigger-scroll-animation', handleRetrigger);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(timeoutId2);
      window.removeEventListener('retrigger-scroll-animation', handleRetrigger);
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return visibleElements;
};
export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuthContext();
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const visibleElements = useScrollAnimation();

  // Force re-trigger intersection observer after component mounts
  useEffect(() => {
    const retriggerObserver = () => {
      const elements = document.querySelectorAll('[data-scroll-animate]');
      if (elements.length > 0) {
        // Dispatch a custom event to retrigger observation
        window.dispatchEvent(new CustomEvent('retrigger-scroll-animation'));
      }
    };

    const timeoutId = setTimeout(retriggerObserver, 1000);
    return () => clearTimeout(timeoutId);
  }, []);

  // Memoize Hyperspeed effect options to prevent re-initialization
  const hyperspeedOptions = useMemo(() => ({
    distortion: 'turbulentDistortion' as const,
    length: 400,
    roadWidth: 10,
    islandWidth: 2,
    lanesPerRoad: 4,
    fov: 90,
    fovSpeedUp: 150,
    speedUp: 2,
    carLightsFade: 0.4,
    totalSideLightSticks: 20,
    lightPairsPerRoadWay: 40,
    shoulderLinesWidthPercentage: 0.05,
    brokenLinesWidthPercentage: 0.1,
    brokenLinesLengthPercentage: 0.5,
    lightStickWidth: [0.12, 0.5] as [number, number],
    lightStickHeight: [1.3, 1.7] as [number, number],
    movingAwaySpeed: [60, 80] as [number, number],
    movingCloserSpeed: [-120, -160] as [number, number],
    carLightsLength: [400 * 0.03, 400 * 0.2] as [number, number],
    carLightsRadius: [0.05, 0.14] as [number, number],
    carWidthPercentage: [0.3, 0.5] as [number, number],
    carShiftX: [-0.8, 0.8] as [number, number],
    carFloorSeparation: [0, 5] as [number, number],
    colors: {
      roadColor: 0x080808,
      islandColor: 0x0a0a0a,
      background: 0x000000,
      shoulderLines: 0xFFFFFF,
      brokenLines: 0xFFFFFF,
      leftCars: [0xD856BF, 0x6750A2, 0xC247AC],
      rightCars: [0x03B3C3, 0x0E5EA5, 0x324555],
      sticks: 0x03B3C3,
    }
  }), []);

  const toggleSidebar = () => {
    // Use the SidebarTrigger approach or dispatch a custom event
    const sidebarTrigger = document.querySelector('[data-sidebar="trigger"]') as HTMLButtonElement;
    if (sidebarTrigger) {
      sidebarTrigger.click();
    } else {
      // Fallback to direct DOM manipulation
      const sidebarElement = document.querySelector('[data-sidebar="sidebar"]');
      if (sidebarElement) {
        const currentState = sidebarElement.getAttribute('data-state');
        sidebarElement.setAttribute('data-state', currentState === 'collapsed' ? 'expanded' : 'collapsed');
      }
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const dockItems = useMemo(() => [
    {
      icon: (
        <RiChatSmileLine className="w-6 h-6" />
      ),
      label: isAuthenticated ? "Go to Chat" : "Get Started",
      onClick: () => router.push(isAuthenticated ? "/chat" : "/login"),
    },
    {
      icon: (
        <RiSeedlingLine className="w-6 h-6" />
      ),
      label: "FAQ",
      onClick: () => router.push("/help"),
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
      label: "Trigger Sidebar",
      onClick: toggleSidebar,
    },
    {
      icon: isDarkMode ? (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ),
      label: isDarkMode ? "Light Mode" : "Dark Mode",
      onClick: toggleTheme,
    },
  ], [isAuthenticated, isDarkMode, router, toggleSidebar, toggleTheme]);

  useEffect(() => {
    // Initialize theme
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, []); // Run only once on mount

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar collapsible="offcanvas" />
      <SidebarInset className="bg-sidebar group/sidebar-inset">
        {/* Hidden sidebar trigger for programmatic access */}
        <SidebarTrigger className="hidden" data-sidebar="trigger" />
        <div className="min-h-screen bg-background relative">
          {/* Hyperspeed Background */}
          <div className="fixed inset-0 z-0 w-full h-full min-h-screen">
            <Hyperspeed
              key="hyperspeed-background"
              effectOptions={hyperspeedOptions}
            />
          </div>

          {/* Content Layer */}
          <div className="relative z-10">
          {/* Hero Section */}
          <div className="container mx-auto px-4 py-24 text-center mt-20">
        <div 
          id="hero-content"
          data-scroll-animate
          className={`max-w-4xl mx-auto transition-all duration-1200 ease-out ${
            visibleElements.has('hero-content') 
              ? 'transform scale-100 opacity-100 translate-y-0' 
              : 'transform scale-85 opacity-70 translate-y-12'
          }`}
        >
          <h1 className="text-6xl font-bold text-foreground mb-6 drop-shadow-lg">
            Reflect & Audit with
            <span className="text-primary block text-[100px] leading-none">Harmony</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto drop-shadow-md">
            An AI-powered personal journal auditing web app. Capture daily reflections, audit personal progress, track mood insights, and visualize your growth with interactive charts.
          </p>
          
          {/* Dock Navigation - Centered in hero */}
          <div className="flex justify-center mt-8">
            <div className="h-20 flex items-center justify-center opacity-100">
              <Dock 
                items={dockItems}
                className={`${isDarkMode ? 'text-white' : 'text-gray-800'} bg-transparent`}
                magnification={80}
                distance={100}
                panelHeight={64}
              />
            </div>
          </div>

          {/* Core Features Section */}
          <div className="mt-16 space-y-12">
            {/* AI-Powered Chat Showcase */}
            <div 
              id="ai-showcase"
              data-scroll-animate
              className={`relative transition-all duration-1000 ease-out ${
                visibleElements.has('ai-showcase') 
                  ? 'transform scale-100 opacity-100' 
                  : 'transform scale-90 opacity-60'
              }`}
            >
              <div className="bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 backdrop-blur-sm border border-primary/20 rounded-2xl p-6 md:p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">AI-Powered Journal Auditing</h3>
                      <p className="text-sm text-primary">Gemini AI Integration</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-3">
                    <div className="bg-background/50 backdrop-blur-xl border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-muted-foreground">Smart Journal Auditing</span>
                      </div>
                      <p className="text-sm text-foreground">Context-aware reflection analysis with auto-extracted daily highlights</p>
                    </div>
                    <div className="bg-background/50 backdrop-blur-xl border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-muted-foreground">Interactive Chart Audits</span>
                      </div>
                      <p className="text-sm text-foreground">AI creates visual progress line charts, score trends, and data metrics on demand</p>
                    </div>
                  </div>
                  <div className="bg-background/30 backdrop-blur-xl border rounded-lg p-4 text-center">
                    <div className="text-4xl font-bold text-primary mb-2">100%</div>
                    <div className="text-sm text-muted-foreground">Owner Data Isolation</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Platform Features Grid */}
            <div 
              id="features-grid"
              data-scroll-animate
              className={`grid md:grid-cols-2 lg:grid-cols-4 gap-4 transition-all duration-1000 ease-out ${
                visibleElements.has('features-grid') 
                  ? 'transform scale-100 opacity-100' 
                  : 'transform scale-90 opacity-60'
              }`}
            >
              {/* Progress Charts */}
              <div 
                id="feature-3d"
                data-scroll-animate
                className={`bg-card/60 backdrop-blur-md border border-border/50 rounded-xl p-6 text-center group hover:bg-card/80 transition-all duration-500 ${
                  visibleElements.has('feature-3d') 
                    ? 'transform scale-100 opacity-100 translate-y-0' 
                    : 'transform scale-75 opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: visibleElements.has('features-grid') ? '100ms' : '0ms' }}
              >
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-foreground mb-1">Progress Charts</h4>
                <p className="text-xs text-muted-foreground">Interactive Recharts bar, line, pie, and scatter analytics</p>
              </div>

              {/* Firestore Journal Sync */}
              <div 
                id="feature-collab"
                data-scroll-animate
                className={`bg-card/60 backdrop-blur-md border border-border/50 rounded-xl p-6 text-center group hover:bg-card/80 transition-all duration-500 ${
                  visibleElements.has('feature-collab') 
                    ? 'transform scale-100 opacity-100 translate-y-0' 
                    : 'transform scale-75 opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: visibleElements.has('features-grid') ? '200ms' : '0ms' }}
              >
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-foreground mb-1">Firestore Journal Sync</h4>
                <p className="text-xs text-muted-foreground">Owner-isolated Firestore storage for chats, logs & calendar</p>
              </div>

              {/* Security */}
              <div 
                id="feature-security"
                data-scroll-animate
                className={`bg-card/60 backdrop-blur-md border border-border/50 rounded-xl p-6 text-center group hover:bg-card/80 transition-all duration-500 ${
                  visibleElements.has('feature-security') 
                    ? 'transform scale-100 opacity-100 translate-y-0' 
                    : 'transform scale-75 opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: visibleElements.has('features-grid') ? '300ms' : '0ms' }}
              >
                <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-foreground mb-1">Firebase Security</h4>
                <p className="text-xs text-muted-foreground">Federated Google Sign-In & strict UID security rules</p>
              </div>

              {/* Automated Highlights */}
              <div 
                id="feature-highlights"
                data-scroll-animate
                className={`bg-card/60 backdrop-blur-md border border-border/50 rounded-xl p-6 text-center group hover:bg-card/80 transition-all duration-500 ${
                  visibleElements.has('features-grid') 
                    ? 'transform scale-100 opacity-100 translate-y-0' 
                    : 'transform scale-75 opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: '400ms' }}
              >
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h4 className="font-semibold text-foreground mb-1">Auto Highlights</h4>
                <p className="text-xs text-muted-foreground">Auto-extracts daily reflection logs, birthdays, and checkable tasks</p>
              </div>
            </div>

            {/* Journal Workspace Hub */}
            <div 
              id="workspace-hub"
              data-scroll-animate
              className={`transition-all duration-1000 ease-out ${
                visibleElements.has('workspace-hub') 
                  ? 'transform scale-100 opacity-100' 
                  : 'transform scale-90 opacity-60'
              }`}
            >
              <div className="bg-gradient-to-br from-emerald/10 via-transparent to-teal/10 backdrop-blur-xl border border-emerald/20 rounded-2xl p-6 md:p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-foreground mb-2">Your Digital Journal Auditing Workspace</h3>
                <p className="text-muted-foreground">Everything you need to reflect, audit goals, and track your life journey in one place</p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8 items-center">
                {/* Workspace Features */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-background/50 backdrop-blur-xl border border-border/30 rounded-xl group hover:bg-background/60 transition-all duration-300">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Intelligent Journal Conversations</h4>
                      <p className="text-sm text-muted-foreground">AI-enhanced journaling with context-aware memory & past log auditing</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-background/50 backdrop-blur-xl border border-border/30 rounded-xl group hover:bg-background/60 transition-all duration-300">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Visual Progress Analytics</h4>
                      <p className="text-sm text-muted-foreground">Dynamic performance graphs, test score trackers, and sentiment trends</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-background/50 backdrop-blur-xl border border-border/30 rounded-xl group hover:bg-background/60 transition-all duration-300">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2a4 4 0 014-4h4m0 0l-3-3m3 3l-3 3M5 5h6a2 2 0 012 2v2M5 5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Knowledge & Journal Workflows</h4>
                      <p className="text-sm text-muted-foreground">Search history, compare past entries, export highlights, and copy clean summaries</p>
                    </div>
                  </div>
                </div>

                {/* Workspace Preview */}
                <div className="bg-background/30 backdrop-blur-xl border border-border/20 rounded-xl p-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-foreground mb-2">Unified Harmony Dashboard</h4>
                    <p className="text-sm text-muted-foreground mb-4">All your daily logs, reflection charts, and upcoming calendar events in one place</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="h-2 bg-blue-500/30 rounded-full"></div>
                      <div className="h-2 bg-green-500/30 rounded-full"></div>
                      <div className="h-2 bg-purple-500/30 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>

            {/* Stats Section */}
            <div 
              id="stats-section"
              data-scroll-animate
              className={`grid md:grid-cols-3 gap-6 transition-all duration-1000 ease-out ${
                visibleElements.has('stats-section') 
                  ? 'transform scale-100 opacity-100' 
                  : 'transform scale-90 opacity-60'
              }`}
            >
              <div className="bg-background/40 backdrop-blur-sm border border-border/50 rounded-xl p-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">∞</div>
                <div className="text-sm font-medium text-foreground mb-1">Personal Memories</div>
                <div className="text-xs text-muted-foreground">Structured daily reflections auto-summarized and safely preserved</div>
              </div>
              <div className="bg-background/40 backdrop-blur-sm border border-border/50 rounded-xl p-6 text-center">
                <div className="text-3xl font-bold text-secondary mb-2">100%</div>
                <div className="text-sm font-medium text-foreground mb-1">UID Privacy</div>
                <div className="text-xs text-muted-foreground">Strict owner-bound Firestore security rules with zero hardcoded keys</div>
              </div>
              <div className="bg-background/40 backdrop-blur-sm border border-border/50 rounded-xl p-6 text-center">
                <div className="text-3xl font-bold text-green-500 mb-2">24/7</div>
                <div className="text-sm font-medium text-foreground mb-1">AI Reflection Companion</div>
                <div className="text-xs text-muted-foreground">Always ready to listen, audit goals, and draw progress charts</div>
              </div>
            </div>
          </div>
          </div>
          </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
