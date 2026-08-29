"use client";

import { CircleCheckIcon, XIcon, Sparkles, Trash2, Calendar, CheckSquare, Bookmark } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/button";
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  iconType?: 'check' | 'sparkles' | 'trash' | 'calendar' | 'todo' | 'bookmark';
  duration?: number;
}

interface UseProgressTimerProps {
  duration: number;
  interval?: number;
  onComplete?: () => void;
}

function useProgressTimer({
  duration,
  interval = 100,
  onComplete,
}: UseProgressTimerProps) {
  const [progress, setProgress] = useState(duration);
  const timerRef = useRef<number>(0);
  const timerState = useRef({
    isPaused: false,
    remaining: duration,
    startTime: 0,
  });

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }
  }, []);

  const reset = useCallback(() => {
    cleanup();
    setProgress(duration);
    timerState.current = {
      isPaused: false,
      remaining: duration,
      startTime: 0,
    };
  }, [duration, cleanup]);

  const start = useCallback(() => {
    const state = timerState.current;
    state.startTime = Date.now();
    state.isPaused = false;

    timerRef.current = window.setInterval(() => {
      const elapsedTime = Date.now() - state.startTime;
      const remaining = Math.max(0, state.remaining - elapsedTime);

      setProgress(remaining);

      if (remaining <= 0) {
        cleanup();
        onComplete?.();
      }
    }, interval);
  }, [interval, cleanup, onComplete]);

  const pause = useCallback(() => {
    const state = timerState.current;
    if (!state.isPaused) {
      cleanup();
      state.remaining = Math.max(
        0,
        state.remaining - (Date.now() - state.startTime),
      );
      state.isPaused = true;
    }
  }, [cleanup]);

  const resume = useCallback(() => {
    const state = timerState.current;
    if (state.isPaused && state.remaining > 0) {
      start();
    }
  }, [start]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    pause,
    progress,
    reset,
    resume,
    start,
  };
}

export function showHarmonyToast(toast: Omit<ToastItem, 'id'>) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('harmony-show-toast', {
        detail: {
          ...toast,
          id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        },
      })
    );
  }
}

export function ProgressToastContainer() {
  const [currentToast, setCurrentToast] = useState<ToastItem | null>(null);
  const [open, setOpen] = useState(false);
  const toastDuration = currentToast?.duration ?? 4000;

  const handleComplete = useCallback(() => {
    setOpen(false);
  }, []);

  const { progress, start, pause, resume, reset } = useProgressTimer({
    duration: toastDuration,
    onComplete: handleComplete,
  });

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (isOpen) {
        reset();
        start();
      }
    },
    [reset, start]
  );

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const detail = (e as CustomEvent<ToastItem>).detail;
      if (!detail) return;

      setCurrentToast(detail);
      if (open) {
        setOpen(false);
        window.setTimeout(() => {
          handleOpenChange(true);
        }, 120);
      } else {
        handleOpenChange(true);
      }
    };

    window.addEventListener('harmony-show-toast', handleToastEvent);
    return () => {
      window.removeEventListener('harmony-show-toast', handleToastEvent);
    };
  }, [open, handleOpenChange]);

  const renderIcon = (type?: ToastItem['iconType']) => {
    switch (type) {
      case 'sparkles':
        return <Sparkles className="mt-0.5 shrink-0 text-amber-500 size-4" aria-hidden="true" />;
      case 'trash':
        return <Trash2 className="mt-0.5 shrink-0 text-rose-500 size-4" aria-hidden="true" />;
      case 'calendar':
        return <Calendar className="mt-0.5 shrink-0 text-sky-500 size-4" aria-hidden="true" />;
      case 'todo':
        return <CheckSquare className="mt-0.5 shrink-0 text-indigo-500 size-4" aria-hidden="true" />;
      case 'bookmark':
        return <Bookmark className="mt-0.5 shrink-0 text-emerald-500 size-4" aria-hidden="true" />;
      default:
        return <CircleCheckIcon className="mt-0.5 shrink-0 text-emerald-500 size-4" aria-hidden="true" />;
    }
  };

  if (!currentToast) {
    return (
      <ToastProvider swipeDirection="right">
        <ToastViewport className="bottom-0 right-0 sm:top-auto sm:right-0 sm:left-auto" />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider swipeDirection="right">
      <Toast
        onOpenChange={handleOpenChange}
        onPause={pause}
        onResume={resume}
        open={open}
      >
        <div className="flex w-full justify-between gap-3">
          {renderIcon(currentToast.iconType)}
          <div className="flex grow flex-col gap-2">
            <div className="space-y-0.5">
              <ToastTitle>{currentToast.title}</ToastTitle>
              {currentToast.description && (
                <ToastDescription>{currentToast.description}</ToastDescription>
              )}
            </div>
            {currentToast.actionText && currentToast.onAction && (
              <div>
                <ToastAction
                  altText={currentToast.actionText}
                  asChild
                  onClick={() => {
                    currentToast.onAction?.();
                    setOpen(false);
                  }}
                >
                  <Button size="sm" variant="outline" className="h-7 text-xs px-2.5 rounded-md">
                    {currentToast.actionText}
                  </Button>
                </ToastAction>
              </div>
            )}
          </div>
          <ToastClose asChild>
            <Button
              aria-label="Close notification"
              className="group -my-1 -me-1 size-7 shrink-0 p-0 hover:bg-transparent cursor-pointer"
              variant="ghost"
            >
              <XIcon
                aria-hidden="true"
                className="size-4 opacity-60 transition-opacity group-hover:opacity-100"
              />
            </Button>
          </ToastClose>
        </div>
        <div aria-hidden="true" className="contents">
          <div
            className="pointer-events-none absolute bottom-0 left-0 h-1 w-full bg-primary transition-all duration-100"
            style={{
              transition: "width 100ms linear",
              width: `${(progress / toastDuration) * 100}%`,
            }}
          />
        </div>
      </Toast>
      <ToastViewport className="bottom-0 right-0 sm:top-auto sm:right-0 sm:left-auto" />
    </ToastProvider>
  );
}
