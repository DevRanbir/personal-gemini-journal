"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/sidebar";

export default function VerifyEmailPage() {
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const router = useRouter();

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      router.push("/journal");
    }, 1000);
  };

  return (
    <SidebarProvider>
      <AppSidebar collapsible="hidden" />
      <SidebarInset className="bg-sidebar group/sidebar-inset">
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <SidebarTrigger className="absolute top-4 left-4" />
          <div className="w-full max-w-md">
            <div className="bg-card border shadow-sm rounded-lg p-8">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Verify Your Email
                </h1>
                <p className="text-muted-foreground">
                  Check your inbox for a Firebase verification link.
                </p>
              </div>

              <form onSubmit={handleVerification} className="space-y-4">
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isVerifying}
                >
                  {isVerifying ? "Verifying..." : "Continue to Journal"}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => router.push("/login")}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  ← Back to Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
