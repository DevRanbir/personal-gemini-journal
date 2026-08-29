import type { Metadata } from "next";
import { AuthProvider } from '@/contexts/auth-context';
import { BookmarksProvider } from '@/contexts/bookmarks-context';
import { ChatWithHistoryProvider } from '@/contexts/chat-with-history-provider';
import { ThemeProvider } from '@/contexts/theme-context';
import { SettingsProvider } from '@/contexts/settings-context';
import { RouteGuard } from '@/components/route-guard';
import { PagePreloader } from '@/components/page-preloader';
import { NavigationLoader } from '@/components/navigation-loader';
import { PageTransition } from '@/components/page-transition';
import { ProgressToastContainer } from '@/components/progress-toast';

import "./globals.css";

export const metadata: Metadata = {
  title: "Personal Gemini Journal — Authenticated & UID-Isolated Platform",
  description: "Enterprise-grade AI Journaling on Cloud Run powered by Firebase Auth, Cloud Firestore, Secret Manager, and Gemini 2.5.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider>
          <NavigationLoader />
          <SettingsProvider>
            <AuthProvider>
              <BookmarksProvider>
                <ChatWithHistoryProvider>
                  <RouteGuard protectedRoutes={['/admin', '/*/data']}>
                    <PageTransition>
                      {children}
                    </PageTransition>
                  </RouteGuard>
                </ChatWithHistoryProvider>
              </BookmarksProvider>
              <PagePreloader />
              <ProgressToastContainer />
            </AuthProvider>
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
