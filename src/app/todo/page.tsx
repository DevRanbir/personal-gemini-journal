"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/breadcrumb";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { ScrollArea } from "@/components/scroll-area";
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Loader2, 
  Calendar as CalendarIcon,
  ChevronRight,
} from "lucide-react";
import { 
  subscribeToTodoItems, 
  saveTodoItem, 
  deleteTodoItem, 
  toggleTodoItem, 
  type TodoItemData 
} from "@/lib/firebase-service";
import { format, addDays, isToday, isTomorrow, isThisWeek, parseISO } from "date-fns";
import { showHarmonyToast } from "@/components/progress-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/alert-dialog";

export default function TodoPage() {
  const { user, loading: authLoading } = useAuth();
  const [todos, setTodos] = useState<TodoItemData[]>([]);
  const [showGuestSignInModal, setShowGuestSignInModal] = useState(false);
  
  // Section-specific inline task input states
  const [todayInput, setTodayInput] = useState("");
  const [tomorrowInput, setTomorrowInput] = useState("");
  const [weekInput, setWeekInput] = useState("");
  const [addingSection, setAddingSection] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    const isGuest = !user;
    if (isGuest) {
      // Unauthenticated sample preview mode
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const tomorrowStr = format(addDays(new Date(), 1), "yyyy-MM-dd");

      setTodos([
        {
          id: "todo-sample-1",
          title: "Read 15 pages of personal growth book (Sample)",
          completed: false,
          priority: "high",
          category: "Personal",
          dueDate: todayStr,
        },
        {
          id: "todo-sample-2",
          title: "Ask Harmony AI to visualize weekly score progress (Sample)",
          completed: true,
          priority: "medium",
          category: "Learning",
          dueDate: todayStr,
        },
        {
          id: "todo-sample-3",
          title: "Sign in with Google to sync personal tasks (Sample)",
          completed: false,
          priority: "low",
          category: "Work",
          dueDate: tomorrowStr,
        }
      ]);
      return;
    }

    const unsubscribe = subscribeToTodoItems(user.uid, (data) => {
      setTodos(data);
    });
    return () => unsubscribe();
  }, [user, authLoading]);

  const handleAddTask = async (title: string, section: "today" | "tomorrow" | "week") => {
    if (!user) {
      setShowGuestSignInModal(true);
      return;
    }
    if (!title.trim()) return;
    setAddingSection(section);

    let targetDueDate: string;
    const now = new Date();
    if (section === "today") {
      targetDueDate = format(now, "yyyy-MM-dd");
    } else if (section === "tomorrow") {
      targetDueDate = format(addDays(now, 1), "yyyy-MM-dd");
    } else {
      targetDueDate = format(addDays(now, 3), "yyyy-MM-dd");
    }

    try {
      await saveTodoItem(user.uid, {
        title: title.trim(),
        completed: false,
        priority: "medium",
        category: section === "today" ? "Personal" : section === "tomorrow" ? "Work" : "General",
        dueDate: targetDueDate,
      });

      showHarmonyToast({
        title: "Action Item Added",
        description: `Task "${title.trim()}" added to Todo list`,
        iconType: "todo",
      });

      if (section === "today") setTodayInput("");
      if (section === "tomorrow") setTomorrowInput("");
      if (section === "week") setWeekInput("");
    } catch (err) {
      console.error("Error saving task:", err);
    } finally {
      setAddingSection(null);
    }
  };

  const handleToggle = async (todoId: string, currentCompleted: boolean) => {
    if (!user) {
      setShowGuestSignInModal(true);
      return;
    }
    await toggleTodoItem(user.uid, todoId, currentCompleted);
    showHarmonyToast({
      title: currentCompleted ? "Task Marked Incomplete" : "Task Completed 🎉",
      description: currentCompleted ? "Action item status reverted" : "Action item marked as completed",
      iconType: "todo",
    });
  };

  const handleDelete = async (todoId: string) => {
    if (!user) {
      setShowGuestSignInModal(true);
      return;
    }
    await deleteTodoItem(user.uid, todoId);
    showHarmonyToast({
      title: "Action Item Deleted",
      description: "Task removed from Todo list",
      iconType: "trash",
    });
  };

  // Grouping tasks into Today, Tomorrow, This Week, Overdue, and Future
  const todayTasks = todos.filter((t) => {
    if (!t.dueDate) return true; // Default untargeted tasks to Today
    try {
      const d = parseISO(t.dueDate);
      return isToday(d);
    } catch {
      return true;
    }
  });

  const tomorrowTasks = todos.filter((t) => {
    if (!t.dueDate) return false;
    try {
      const d = parseISO(t.dueDate);
      return isTomorrow(d);
    } catch {
      return false;
    }
  });

  const weekTasks = todos.filter((t) => {
    if (!t.dueDate) return false;
    try {
      const d = parseISO(t.dueDate);
      return !isToday(d) && !isTomorrow(d) && isThisWeek(d);
    } catch {
      return false;
    }
  });

  // Items with dueDate in the past (before today) that weren't completed
  const overdueTasks = todos.filter((t) => {
    if (!t.dueDate || t.completed) return false;
    try {
      const d = parseISO(t.dueDate);
      return !isToday(d) && !isTomorrow(d) && !isThisWeek(d) && d < new Date();
    } catch {
      return false;
    }
  });

  // Items with dueDate further in the future (beyond this week)
  const futureTasks = todos.filter((t) => {
    if (!t.dueDate) return false;
    try {
      const d = parseISO(t.dueDate);
      return !isToday(d) && !isTomorrow(d) && !isThisWeek(d) && d > new Date();
    } catch {
      return false;
    }
  });


  const getTagColorDot = (cat?: string) => {
    switch (cat?.toLowerCase()) {
      case "personal":
        return "bg-rose-500";
      case "work":
        return "bg-sky-500";
      case "urgent":
        return "bg-amber-500";
      default:
        return "bg-emerald-500";
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar collapsible="hidden" />
      <SidebarInset className="bg-sidebar group/sidebar-inset">
        <div className="flex h-[calc(100svh)] bg-[hsl(240_5%_92.16%)] md:rounded-s-3xl md:group-peer-data-[state=collapsed]/sidebar-inset:rounded-s-none transition-all ease-in-out duration-300">
          <ScrollArea className="flex-1 [&>div>div]:h-full w-full shadow-md md:rounded-s-[inherit] min-[1024px]:rounded-e-3xl bg-background">
            <div className="h-full flex flex-col px-4 md:px-6 lg:px-8 pb-10">
              {/* Standard Page Header matching Bookmarks & Journal */}
              <div className="py-5 bg-background sticky top-0 z-10 before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-gradient-to-r before:from-black/[0.06] before:via-black/10 before:to-black/[0.06]">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <SidebarTrigger />
                    <Breadcrumb>
                      <BreadcrumbList className="sm:gap-1.5">
                        <BreadcrumbItem>
                          <BreadcrumbLink href="/">Harmony</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          <BreadcrumbPage>Todo</BreadcrumbPage>
                        </BreadcrumbItem>
                      </BreadcrumbList>
                    </Breadcrumb>
                    {!user && (
                      <span className="text-[11px] font-medium text-amber-500/90 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                        Sample Data • Sign in to sync
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Layout Container matching the uploaded reference image design */}
              <div className="py-6 space-y-8 max-w-5xl w-full mx-auto">
                {/* Top Page Header with Large Title & Count Badge */}
                <div className="flex items-center gap-3.5">
                  <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
                    Upcoming
                  </h1>
                  <span className="bg-secondary text-foreground text-sm font-semibold rounded-xl px-3 py-1 border border-border shadow-xs">
                    {todos.length}
                  </span>
                </div>

                {/* SECTION 1: TODAY (Full Width Card) */}
                <div className="rounded-3xl bg-card border border-border/80 p-6 space-y-4 shadow-xs">
                  <h2 className="text-xl font-bold tracking-tight text-foreground">Today</h2>

                  {/* Inline Add Task Input for Today */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddTask(todayInput, "today");
                    }}
                    className="relative flex items-center"
                  >
                    <div className="absolute left-4 text-muted-foreground">
                      {addingSection === "today" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Plus className="size-4" />
                      )}
                    </div>
                    <Input
                      value={todayInput}
                      onChange={(e) => setTodayInput(e.target.value)}
                      placeholder="Add New Task"
                      className="w-full pl-11 h-12 bg-background/50 border-border/60 rounded-2xl text-sm placeholder:text-muted-foreground/70 focus-visible:ring-primary/50"
                    />
                  </form>

                  {/* Task Items List */}
                  <div className="divide-y divide-border/50">
                    {todayTasks.length === 0 ? (
                      <div className="py-6 text-center text-xs text-muted-foreground/60">
                        No tasks for today. Add a task above!
                      </div>
                    ) : (
                      todayTasks.map((t) => (
                        <div
                          key={t.id}
                          className="py-3.5 px-2 flex items-center justify-between group hover:bg-muted/30 rounded-xl transition-colors"
                        >
                          <div className="flex items-start gap-3.5 flex-1 min-w-0">
                            <button
                              onClick={() => handleToggle(t.id, t.completed)}
                              className="mt-0.5 cursor-pointer shrink-0"
                            >
                              {t.completed ? (
                                <CheckCircle2 className="size-5 text-emerald-400" />
                              ) : (
                                <Circle className="size-5 text-muted-foreground/50 hover:text-primary transition-colors" />
                              )}
                            </button>

                            <div className="space-y-1.5 min-w-0 flex-1">
                              <span
                                className={`text-sm font-medium block ${
                                  t.completed ? "line-through text-muted-foreground" : "text-foreground"
                                }`}
                              >
                                {t.title}
                              </span>

                              {/* Sub-row metadata if present */}
                              {(t.dueDate || t.category) && (
                                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap pt-0.5">
                                  {t.dueDate && (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-secondary text-[11px] font-mono border border-border">
                                      <CalendarIcon className="size-3 text-muted-foreground" />
                                      {t.dueDate}
                                    </span>
                                  )}

                                  {t.category && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-secondary text-[11px] font-medium border border-border">
                                      <span className={`size-2 rounded-full ${getTagColorDot(t.category)}`} />
                                      {t.category}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleDelete(t.id)}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1.5 rounded-lg transition-all"
                            >
                              <Trash2 className="size-4" />
                            </button>
                            <ChevronRight className="size-4 text-muted-foreground/40" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* BOTTOM GRID (2 COLUMNS: TOMORROW & THIS WEEK) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* SECTION 2: TOMORROW */}
                  <div className="rounded-3xl bg-card border border-border/80 p-6 space-y-4 shadow-xs">
                    <h2 className="text-xl font-bold tracking-tight text-foreground">Tomorrow</h2>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAddTask(tomorrowInput, "tomorrow");
                      }}
                      className="relative flex items-center"
                    >
                      <div className="absolute left-4 text-muted-foreground">
                        {addingSection === "tomorrow" ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Plus className="size-4" />
                        )}
                      </div>
                      <Input
                        value={tomorrowInput}
                        onChange={(e) => setTomorrowInput(e.target.value)}
                        placeholder="Add New Task"
                        className="w-full pl-11 h-12 bg-background/50 border-border/60 rounded-2xl text-sm placeholder:text-muted-foreground/70 focus-visible:ring-primary/50"
                      />
                    </form>

                    <div className="divide-y divide-border/50">
                      {tomorrowTasks.length === 0 ? (
                        <div className="py-6 text-center text-xs text-muted-foreground/60">
                          No tasks scheduled for tomorrow.
                        </div>
                      ) : (
                        tomorrowTasks.map((t) => (
                          <div
                            key={t.id}
                            className="py-3 px-2 flex items-center justify-between group hover:bg-muted/30 rounded-xl transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <button
                                onClick={() => handleToggle(t.id, t.completed)}
                                className="cursor-pointer shrink-0"
                              >
                                {t.completed ? (
                                  <CheckCircle2 className="size-4 text-emerald-400" />
                                ) : (
                                  <Circle className="size-4 text-muted-foreground/50 hover:text-primary transition-colors" />
                                )}
                              </button>
                              <span
                                className={`text-sm font-medium truncate ${
                                  t.completed ? "line-through text-muted-foreground" : "text-foreground"
                                }`}
                              >
                                {t.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleDelete(t.id)}
                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 rounded-lg transition-all"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                              <ChevronRight className="size-4 text-muted-foreground/40" />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* SECTION 3: THIS WEEK */}
                  <div className="rounded-3xl bg-card border border-border/80 p-6 space-y-4 shadow-xs">
                    <h2 className="text-xl font-bold tracking-tight text-foreground">This Week</h2>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAddTask(weekInput, "week");
                      }}
                      className="relative flex items-center"
                    >
                      <div className="absolute left-4 text-muted-foreground">
                        {addingSection === "week" ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Plus className="size-4" />
                        )}
                      </div>
                      <Input
                        value={weekInput}
                        onChange={(e) => setWeekInput(e.target.value)}
                        placeholder="Add New Task"
                        className="w-full pl-11 h-12 bg-background/50 border-border/60 rounded-2xl text-sm placeholder:text-muted-foreground/70 focus-visible:ring-primary/50"
                      />
                    </form>

                    <div className="divide-y divide-border/50">
                      {weekTasks.length === 0 ? (
                        <div className="py-6 text-center text-xs text-muted-foreground/60">
                          No additional tasks for this week.
                        </div>
                      ) : (
                        weekTasks.map((t) => (
                          <div
                            key={t.id}
                            className="py-3 px-2 flex items-center justify-between group hover:bg-muted/30 rounded-xl transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <button
                                onClick={() => handleToggle(t.id, t.completed)}
                                className="cursor-pointer shrink-0"
                              >
                                {t.completed ? (
                                  <CheckCircle2 className="size-4 text-emerald-400" />
                                ) : (
                                  <Circle className="size-4 text-muted-foreground/50 hover:text-primary transition-colors" />
                                )}
                              </button>
                              <span
                                className={`text-sm font-medium truncate ${
                                  t.completed ? "line-through text-muted-foreground" : "text-foreground"
                                }`}
                              >
                                {t.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleDelete(t.id)}
                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 rounded-lg transition-all"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                              <ChevronRight className="size-4 text-muted-foreground/40" />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* OVERDUE TASKS (full width, conditionally shown) */}
                {overdueTasks.length > 0 && (
                  <div className="rounded-3xl bg-destructive/5 border border-destructive/20 p-6 space-y-4 shadow-xs">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold tracking-tight text-destructive">Overdue</h2>
                      <span className="bg-destructive/10 text-destructive text-xs font-semibold rounded-lg px-2.5 py-0.5 border border-destructive/20">
                        {overdueTasks.length}
                      </span>
                    </div>
                    <div className="divide-y divide-border/50">
                      {overdueTasks.map((t) => (
                        <div
                          key={t.id}
                          className="py-3 px-2 flex items-center justify-between group hover:bg-muted/30 rounded-xl transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <button onClick={() => handleToggle(t.id, t.completed)} className="cursor-pointer shrink-0">
                              {t.completed ? (
                                <CheckCircle2 className="size-4 text-emerald-400" />
                              ) : (
                                <Circle className="size-4 text-destructive/60 hover:text-destructive transition-colors" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium truncate text-foreground block">{t.title}</span>
                              {t.dueDate && (
                                <span className="text-xs text-destructive/70">Due: {t.dueDate}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleDelete(t.id)}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 rounded-lg transition-all"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                            <ChevronRight className="size-4 text-muted-foreground/40" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* FUTURE TASKS (full width, conditionally shown) */}
                {futureTasks.length > 0 && (
                  <div className="rounded-3xl bg-card border border-border/80 p-6 space-y-4 shadow-xs">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold tracking-tight text-foreground">Upcoming</h2>
                      <span className="bg-secondary text-foreground text-xs font-semibold rounded-lg px-2.5 py-0.5 border border-border">
                        {futureTasks.length}
                      </span>
                    </div>
                    <div className="divide-y divide-border/50">
                      {futureTasks.map((t) => (
                        <div
                          key={t.id}
                          className="py-3 px-2 flex items-center justify-between group hover:bg-muted/30 rounded-xl transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <button onClick={() => handleToggle(t.id, t.completed)} className="cursor-pointer shrink-0">
                              {t.completed ? (
                                <CheckCircle2 className="size-4 text-emerald-400" />
                              ) : (
                                <Circle className="size-4 text-muted-foreground/50 hover:text-primary transition-colors" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm font-medium truncate block ${t.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.title}</span>
                              {t.dueDate && (
                                <span className="text-xs text-muted-foreground/60">{t.dueDate}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleDelete(t.id)}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 rounded-lg transition-all"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                            <ChevronRight className="size-4 text-muted-foreground/40" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      </SidebarInset>

      <AlertDialog open={showGuestSignInModal} onOpenChange={setShowGuestSignInModal}>
        <AlertDialogContent className="max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-amber-500" />
              Sign In to Add &amp; Manage Tasks
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground pt-2">
              Sample mode is a read-only showcase preview. Sign in with Google to create custom tasks, manage action items, and sync your Todo list to Firebase.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (typeof window !== 'undefined') window.location.href = '/login';
              }}
              className="rounded-xl bg-primary text-primary-foreground font-medium"
            >
              Sign In with Google
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
