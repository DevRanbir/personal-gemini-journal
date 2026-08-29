'use client';

import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/sidebar";

export default function ProfilePage() {
  return (
    <SidebarProvider>
      <AppSidebar collapsible="hidden" />
      <SidebarInset className="bg-sidebar group/sidebar-inset">
        <div className="flex h-[calc(100svh)] bg-background">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Profile Page</h1>
              <p className="text-muted-foreground">Coming soon...</p>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}