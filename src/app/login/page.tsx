"use client";

import React, { useState, useEffect } from "react";
import { useAuthContext } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { 
  Eye, 
  EyeOff, 
  Sparkles, 
  ShieldCheck, 
  BarChart3, 
  Calendar, 
  CheckSquare2, 
  ChevronLeft,
  ChevronRight,
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

  // Showcase Carousel Slide Index
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: "ai-journal",
      tag: "AI Reflection Companion",
      title: "Smart Journaling & Real-Time Insights",
      description: "Express your day naturally in English, Hindi, or Hinglish. Harmony automatically audits key milestones and personal growth.",
      badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      content: (
        <div className="flex flex-col items-center justify-center py-6 w-full">
          <LottieAnimation
            src="/Summer Buddy.json"
            className="w-64 h-64 sm:w-72 sm:h-72 object-contain mx-auto"
          />
        </div>
      )
    },
    {
      id: "charts",
      tag: "Interactive Data Visuals",
      title: "Instant Charts from Daily Reflections",
      description: "Ask Harmony to track your exam scores, fitness goals, or emotional progress with dynamic Recharts graphs.",
      badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      content: (
        <div className="w-full max-w-sm mx-auto py-8 space-y-4">
          <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="size-4 text-blue-400" /> Maths Test Improvement
              </span>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">+25%</span>
            </div>
            <div className="flex items-end justify-between gap-4 h-36 pt-6 px-3">
              <div className="flex flex-col items-center gap-2 flex-1">
                <span className="text-xs font-medium text-muted-foreground">5/10</span>
                <div className="w-full bg-blue-500/30 rounded-t-xl h-[50%]" />
                <span className="text-xs text-muted-foreground font-medium">Test 1</span>
              </div>
              <div className="flex flex-col items-center gap-2 flex-1">
                <span className="text-xs font-medium text-muted-foreground">8/10</span>
                <div className="w-full bg-blue-500/60 rounded-t-xl h-[80%]" />
                <span className="text-xs text-muted-foreground font-medium">Test 2</span>
              </div>
              <div className="flex flex-col items-center gap-2 flex-1">
                <span className="text-xs font-bold text-blue-400">10/10</span>
                <div className="w-full bg-blue-500 rounded-t-xl h-[100%] shadow-lg shadow-blue-500/30" />
                <span className="text-xs font-semibold text-foreground">Test 3</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "productivity",
      tag: "Unified Productivity",
      title: "Connected Daily Logs & Todo Tasks",
      description: "Every reflection automatically syncs actionable items into your Todo list and marks milestones on your Calendar.",
      badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      content: (
        <div className="w-full max-w-sm mx-auto py-8 space-y-3.5">
          <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-md flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <CheckSquare2 className="size-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">Ask AI to visualize score</p>
                <span className="text-xs text-muted-foreground">Learning • Today</span>
              </div>
            </div>
            <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">Done</span>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-md flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="size-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Calendar className="size-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">Weekly Reflection Audit</p>
                <span className="text-xs text-muted-foreground">2:00 PM • Calendar</span>
              </div>
            </div>
            <span className="text-xs font-medium text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">Scheduled</span>
          </div>
        </div>
      )
    }
  ];

  // Auto-advance carousel slide every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

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

  const handleSocialNotice = (provider: string) => {
    showHarmonyToast({
      title: `${provider} Auth Notice`,
      description: "Google and Email authentication are actively enabled. Connecting with Google...",
      iconType: "sparkles",
    });
    handleGoogleSignIn();
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col lg:flex-row font-sans">
      
      {/* LEFT HALF: FULL-BLEED AUTH PANEL */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 lg:p-16 xl:p-20 min-h-screen bg-background">
        
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between w-full max-w-md mx-auto mb-8">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <span className="font-bold text-lg tracking-tight text-foreground">Harmony AI</span>
          </Link>

          <Link
            href="/journal"
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1 rounded-full border border-border bg-secondary/50"
          >
            Try Guest Mode &rarr;
          </Link>
        </div>

        {/* Center Auth Form */}
        <div className="w-full max-w-md mx-auto my-auto space-y-6">
          
          {/* Header Title & Subtitle */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              {isSignUp ? "Get started!" : "Welcome back!"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Simplify your workflow and boost your productivity with <span className="font-semibold text-foreground">Harmony&apos;s App</span>. Get started for free.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium text-center leading-relaxed">
              {error}
            </div>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full h-12 px-5 rounded-full border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all"
              />
            </div>

            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full h-12 px-5 pr-12 rounded-full border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
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
              className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm transition-all shadow-md shadow-primary/20 cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{isSignUp ? "Register" : "Login"}</span>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-border" />
            <span>or continue with</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Single Google Sign-In Option */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-12 rounded-full bg-secondary hover:bg-secondary/80 text-foreground border border-border flex items-center justify-center gap-3 font-medium text-sm transition-all cursor-pointer shadow-xs hover:scale-[1.01]"
          >
            <svg className="size-5 shrink-0" viewBox="0 0 24 24">
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

          {/* Toggle Mode Link */}
          <div className="text-center text-xs text-muted-foreground font-medium pt-2">
            {isSignUp ? (
              <>
                Already a member?{" "}
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
                Not a member?{" "}
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
        <div className="w-full max-w-md mx-auto pt-6 border-t border-border mt-8 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-emerald-500" />
            <span>UID-Isolated Privacy</span>
          </div>
          <span>Firebase Auth Secured</span>
        </div>
      </div>

      {/* RIGHT HALF: FULL-BLEED SHOWCASE PANEL */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-sidebar/50 border-l border-border/80 p-12 xl:p-16 min-h-screen relative overflow-hidden">
        
        {/* Top Carousel Navigation & Badge */}
        <div className="flex items-center justify-between w-full max-w-lg mx-auto">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${slides[currentSlide].badgeColor}`}>
            <Sparkles className="size-3" />
            {slides[currentSlide].tag}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1))}
              className="size-8 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border flex items-center justify-center transition-all cursor-pointer"
              aria-label="Previous slide"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
              className="size-8 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border flex items-center justify-center transition-all cursor-pointer"
              aria-label="Next slide"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        {/* Center Main Slide Content */}
        <div className="my-auto py-8 w-full max-w-lg mx-auto flex flex-col items-center justify-center">
          {slides[currentSlide].content}
        </div>

        {/* Bottom Slide Info & Indicators */}
        <div className="space-y-5 text-center w-full max-w-md mx-auto">
          {/* Carousel Dots */}
          <div className="flex items-center justify-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentSlide(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  currentSlide === idx ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Slide Description */}
          <div className="space-y-1.5">
            <h3 className="text-xl font-bold tracking-tight text-foreground">
              {slides[currentSlide].title}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {slides[currentSlide].description}
            </p>
          </div>

          <p className="text-xs font-semibold text-foreground/80 pt-2">
            Make your day organized with <span className="text-primary font-bold">Harmony&apos;s App</span>
          </p>
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
