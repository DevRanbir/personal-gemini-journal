'use client';

import React, { useEffect, useState } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import Dock from '@/components/Dock';
import { RiHomeLine, RiRefreshLine, RiQuestionLine } from '@remixicon/react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error:', error);
    
    // Detect theme from localStorage or system preference
    const savedTheme = localStorage.getItem('harmony-theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    let resolvedTheme: 'light' | 'dark' = 'light';
    if (savedTheme === 'dark') {
      resolvedTheme = 'dark';
    } else if (savedTheme === 'system' && systemPrefersDark) {
      resolvedTheme = 'dark';
    } else if (!savedTheme && systemPrefersDark) {
      resolvedTheme = 'dark';
    }
    
    setTheme(resolvedTheme);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolvedTheme);
  }, [error]);

  const dockItems = [
    {
      icon: <RiHomeLine size={24} className="text-foreground" />,
      label: 'Home',
      onClick: () => window.location.href = '/',
    },
    {
      icon: <RiRefreshLine size={24} className="text-foreground" />,
      label: 'Reload',
      onClick: () => reset(),
    },
    {
      icon: <RiQuestionLine size={24} className="text-foreground" />,
      label: 'FAQ',
      onClick: () => window.location.href = '/help',
    },
  ];

  return (
    <html className={theme}>
      <head>
        <style>{`
          :root {
            --radius: 0.625rem;
            --background: oklch(1 0 0);
            --foreground: oklch(0.141 0.005 285.823);
            --muted: oklch(0.961 0.001 285.882);
            --muted-foreground: oklch(0.478 0.015 286.067);
            --primary: oklch(0.142 0.005 285.823);
            --primary-foreground: oklch(0.998 0 0);
          }
          
          .dark {
            --background: oklch(0.02 0.001 285.882);
            --foreground: oklch(0.976 0.001 285.882);
            --muted: oklch(0.157 0.004 285.823);
            --muted-foreground: oklch(0.478 0.015 286.067);
            --primary: oklch(0.976 0.001 285.882);
            --primary-foreground: oklch(0.02 0.001 285.882);
          }
        `}</style>
      </head>
      <body className="font-sans antialiased">
        <div className="min-h-screen bg-background text-foreground relative">
          <div className="min-h-screen flex flex-col items-center justify-center p-4">
            {/* Lottie Animation */}
            <div className="w-120 h-120 -mt-50">
              <DotLottieReact
                src="https://lottie.host/f7c670d6-9142-495e-a6ae-b27fdb2bff14/f9mzfFNnY4.lottie"
                loop
                autoplay
                className="w-full h-full"
              />
            </div>

            {/* Title and Description */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-foreground mb-4">
                Something Went Wrong!
              </h1>
              <p className="text-lg text-muted-foreground max-w-md">
                We encountered an unexpected error. <br />Don&apos;t worry, you can try again or go back to safety.
              </p>
            </div>

            {/* Dock with Action Buttons */}
            <div className="-mt-80">
              <Dock
                items={dockItems}
                className="mx-auto"
                magnification={60}
                distance={150}
                baseItemSize={45}
                panelHeight={60}
              />
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
