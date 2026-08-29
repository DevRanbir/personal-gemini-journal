'use client';

import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import Dock from '@/components/Dock';
import { RiHomeLine, RiRefreshLine, RiQuestionLine } from '@remixicon/react';
import { useTheme } from '@/contexts/theme-context';
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/sidebar";

export default function NotFound() {
  const { resolvedTheme } = useTheme();

  const dockItems = [
    {
      icon: <RiHomeLine size={24} className="text-foreground" />,
      label: 'Home',
      onClick: () => window.location.href = '/',
    },
    {
      icon: <RiRefreshLine size={24} className="text-foreground" />,
      label: 'Reload',
      onClick: () => window.location.reload(),
    },
    {
      icon: <RiQuestionLine size={24} className="text-foreground" />,
      label: 'FAQ',
      onClick: () => window.location.href = '/help',
    },
  ];

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar collapsible="hidden" />
      <SidebarInset className="bg-sidebar group/sidebar-inset">
        <div className="min-h-screen bg-background text-foreground relative">
          <div className="min-h-screen flex flex-col items-center justify-center p-4">
            {/* Lottie Animation */}
            <div className="w-120 h-120 -mt-30">
              <DotLottieReact
                src="https://lottie.host/f7c670d6-9142-495e-a6ae-b27fdb2bff14/f9mzfFNnY4.lottie"
                loop
                autoplay
                className="w-full h-full"
              />
            </div>

            {/* Title and Description */}
            <div className="text-center mb-1">
              <h1 className="text-4xl font-bold text-foreground mb-4">
                Page Not Found
              </h1>
              <p className="text-lg text-muted-foreground max-w-md">
                Oops! The page you&apos;re looking for doesn&apos;t exist. <br />It might have been moved or deleted.
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
      </SidebarInset>
    </SidebarProvider>
  );
}