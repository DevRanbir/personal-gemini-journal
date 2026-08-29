"use client";

import React, { useState, useEffect } from "react";
import { useAuthContext } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Send, 
  Mail, 
  Loader2 
} from "lucide-react";
import { LottieAnimation } from "@/components/lottie-animation";
import { showHarmonyToast } from "@/components/progress-toast";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/alert-dialog";
import Link from "next/link";

interface LoginPageProps {
  initialMode?: 'signin' | 'signup';
}

export default function LoginPage({ initialMode = 'signin' }: LoginPageProps) {
  const { user, isAuthenticated, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } = useAuthContext();
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    if (isAuthenticated || user) {
      router.push("/journal");
    }
  }, [isAuthenticated, user, router]);

  const parseFirebaseError = (err: any): string => {
    const code = err?.code || "";
    if (code === "auth/operation-not-allowed") {
      return "Google / Email Auth is not enabled in your Firebase Console. Go to Authentication > Sign-in method to enable.";
    }
    if (code === "auth/unauthorized-domain") {
      return "This domain is not authorized in Firebase Console.";
    }
    if (code === "auth/popup-closed-by-user") {
      return "Sign-in window was closed. Please try again.";
    }
    if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
      return "Invalid email or password. Please verify your credentials or create a new account.";
    }
    if (code === "auth/email-already-in-use") {
      return "An account with this email already exists. Please sign in instead.";
    }
    return err.message || "Authentication failed. Please try again.";
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      showHarmonyToast({
        title: "Welcome to Harmony!",
        description: "Authenticated successfully with Google.",
        iconType: "check",
      });
      router.push("/journal");
    } catch (err: any) {
      setError(parseFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);

    try {
      if (isSignUp && signUpWithEmail) {
        await signUpWithEmail(email, password);
        showHarmonyToast({
          title: "Account Created!",
          description: "Welcome to Harmony AI Journaling.",
          iconType: "check",
        });
      } else if (signInWithEmail) {
        await signInWithEmail(email, password);
        showHarmonyToast({
          title: "Welcome Back!",
          description: "Signed in successfully.",
          iconType: "check",
        });
      }
      router.push("/journal");
    } catch (err: any) {
      setError(parseFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail || !resetPassword) return;
    setResetLoading(true);
    try {
      await resetPassword(resetEmail);
      setResetSuccess(true);
      showHarmonyToast({
        title: "Reset Email Sent",
        description: `Check ${resetEmail} for password reset link.`,
        iconType: "check",
      });
    } catch (err: any) {
      setError(parseFirebaseError(err));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden w-full bg-background text-foreground flex flex-col-reverse lg:flex-row font-sans">
      
      {/* LEFT COLUMN: HERO SHOWCASE (Rendered second on mobile, left on desktop) */}
      <div className="w-full lg:w-1/2 xl:w-7/12 flex flex-col justify-between p-6 sm:p-8 lg:p-12 bg-muted/20 border-t lg:border-t-0 lg:border-r border-border/60 shrink-0 lg:shrink lg:h-full overflow-hidden">
        
        {/* Top Brand Logo */}
        <div className="flex items-center gap-3">
          <Link href="/" className="font-extrabold text-xl sm:text-2xl tracking-tight text-foreground hover:opacity-90 transition-opacity">
            <span>Harmony AI</span>
          </Link>
        </div>

        {/* Hero Center - Large Lottie Animation & Value Proposition */}
        <div className="my-auto py-4 space-y-4 max-w-xl mx-auto lg:mx-0">
          <div className="w-48 h-48 sm:w-60 sm:h-60 lg:w-72 lg:h-72 mx-auto lg:mx-0">
            <LottieAnimation
              src="/summer-buddy.json"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="space-y-2.5 text-center lg:text-left">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
              Reflect &amp; Audit your day with <span className="text-primary">Harmony</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-lg">
              Express your daily thoughts naturally in Hinglish, English, or Hindi. Harmony automatically logs daily highlights, tracks habit milestones, and builds your personal calendar.
            </p>
          </div>
        </div>

        {/* Clean Footer Note */}
        <div className="pt-4 border-t border-border/40 text-xs text-muted-foreground/80">
          Personal AI Journaling &amp; Daily Audit Companion
        </div>
      </div>

      {/* RIGHT COLUMN: AUTH PANEL (Rendered FIRST on mobile at the top, right on desktop) */}
      <div className="w-full lg:w-1/2 xl:w-5/12 flex flex-col justify-between p-6 sm:p-8 lg:p-12 min-h-screen lg:min-h-0 lg:h-full bg-background overflow-y-auto shrink-0 lg:shrink">
        
        {/* Top Right Guest Link */}
        <div className="flex justify-end w-full">
          <Link
            href="/journal"
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3.5 py-1.5 rounded-full border border-border bg-secondary/50"
          >
            Try Guest Mode &rarr;
          </Link>
        </div>

        {/* Center Auth Form */}
        <div className="w-full max-w-sm mx-auto my-auto space-y-5 py-4">
          
          {/* Header Title & Subtitle */}
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {isSignUp 
                ? "Sign up to start reflecting and auditing your daily growth."
                : "Sign in to access your personal journal and daily logs."}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium text-center leading-relaxed">
              {error}
            </div>
          )}

          {/* Single Google Sign-In Option */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-11 rounded-full bg-secondary hover:bg-secondary/80 text-foreground border border-border flex items-center justify-center gap-3 font-medium text-xs sm:text-sm transition-all cursor-pointer shadow-xs hover:scale-[1.01]"
          >
            <svg className="size-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-border" />
            <span>or sign in with email</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3.5">
            <div>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full h-11 px-4 rounded-full border border-border bg-background text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all"
              />
            </div>

            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full h-11 px-4 pr-11 rounded-full border border-border bg-background text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>

            {/* Forgot Password Link */}
            {!isSignUp && (
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setShowForgotModal(true);
                  }}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs sm:text-sm transition-all shadow-md shadow-primary/20 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{isSignUp ? "Register" : "Sign In"}</span>
              )}
            </Button>
          </form>

          {/* Toggle Mode Link */}
          <div className="text-center text-xs text-muted-foreground font-medium pt-1">
            {isSignUp ? (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setIsSignUp(false); setError(null); }}
                  className="font-semibold text-primary hover:underline cursor-pointer"
                >
                  Sign in now
                </button>
              </>
            ) : (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setIsSignUp(true); setError(null); }}
                  className="font-semibold text-primary hover:underline cursor-pointer"
                >
                  Register now
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bottom Security Footer */}
        <div className="w-full flex items-center justify-between text-[11px] text-muted-foreground pt-3 border-t border-border/60">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-emerald-500" />
            <span>UID-Isolated Privacy</span>
          </div>
          <span>Firebase Auth Secured</span>
        </div>
      </div>

      {/* FORGOT PASSWORD DIALOG */}
      <AlertDialog open={showForgotModal} onOpenChange={setShowForgotModal}>
        <AlertDialogContent className="max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Mail className="size-5 text-primary" />
              Reset Your Password
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground pt-1.5">
              Enter your registered email address and we will send you a password reset link.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {resetSuccess ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs text-center font-medium my-2">
              Password reset link sent! Please check your email inbox and spam folder.
            </div>
          ) : (
            <form onSubmit={handlePasswordReset} className="space-y-3 my-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Email Address</label>
                <Input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="h-10 rounded-xl bg-background border-border text-xs"
                />
              </div>
              <Button
                type="submit"
                disabled={resetLoading}
                className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-medium text-xs flex items-center justify-center gap-2"
              >
                {resetLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                Send Reset Link
              </Button>
            </form>
          )}

          <AlertDialogFooter className="pt-2">
            <AlertDialogCancel
              onClick={() => {
                setShowForgotModal(false);
                setResetSuccess(false);
              }}
              className="rounded-xl text-xs h-9"
            >
              Close
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
