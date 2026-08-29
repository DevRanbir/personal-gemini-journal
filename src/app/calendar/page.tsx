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
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Sparkles, 
  Trash2, 
  Loader2,
  CalendarDays,
  ListFilter,
  Grid,
  Columns
} from "lucide-react";
import { 
  subscribeToCalendarEvents, 
  saveCalendarEvent, 
  deleteCalendarEvent, 
  updateCalendarEvent,
  subscribeToChatHistory,
  subscribeToJournalDataLogs,
  getAllJournalDataLogs,
  deleteJournalPointFromHistory,
  type CalendarEventData 
} from "@/lib/firebase-service";
import { NotebookPen, BookOpen } from "lucide-react";
import { deduplicateJournalPoints } from "@/lib/chat-utils";
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
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday, 
  addDays, 
  subDays,
  startOfWeek,
  endOfWeek,
} from "date-fns";

export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<CalendarEventData[]>([]);
  const [journalMap, setJournalMap] = useState<Record<string, { title: string; points: string[]; messageCount: number }>>({});
  const [selectedDayData, setSelectedDayData] = useState<{ date: string; title: string; points: string[] } | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day" | "agenda">("month");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showGuestSignInModal, setShowGuestSignInModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEventData | null>(null);
  const [loading, setLoading] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [location, setLocation] = useState("");
  const [color, setColor] = useState("sky");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      // Unauthenticated sample preview mode
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");
      const futureStr = format(addDays(new Date(), 2), "yyyy-MM-dd");

      setEvents([
        {
          id: "sample-1",
          title: "Maths Exam Progress Audit (Sample)",
          start: `${todayStr}T10:00:00`,
          end: `${todayStr}T11:00:00`,
          color: "#3b82f6",
          allDay: false,
        },
        {
          id: "sample-2",
          title: "Weekly Reflection Check-in (Sample)",
          start: `${todayStr}T14:00:00`,
          end: `${todayStr}T15:00:00`,
          color: "#10b981",
          allDay: false,
        },
        {
          id: "sample-3",
          title: "Friend's Birthday Reminder (Sample)",
          start: `${futureStr}T09:00:00`,
          end: `${futureStr}T10:00:00`,
          color: "#ec4899",
          allDay: true,
        }
      ]);

      setJournalMap({
        [todayStr]: {
          title: `Today, ${format(new Date(), "MMMM d")} (Sample)`,
          points: [
            "Scored 10/10 in Maths test today (improved from 5/10 and 8/10)",
            "Completed weekly reflection audit with Harmony AI"
          ],
          messageCount: 3,
        },
        [yesterdayStr]: {
          title: `Yesterday, ${format(subDays(new Date(), 1), "MMMM d")} (Sample)`,
          points: [
            "Prepared for Maths exam and reviewed key formulas"
          ],
          messageCount: 2,
        }
      });
      return;
    }

    const unsubEvents = subscribeToCalendarEvents(user.uid, (data) => {
      setEvents(data);
    });

    let currentHistoryItems: any[] = [];
    let currentLogsItems: any[] = [];

    const rebuildJournalMap = () => {
      const map: Record<string, { title: string; points: string[]; messageCount: number }> = {};
      
      currentHistoryItems.forEach(item => {
        map[item.date] = {
          title: item.title,
          points: deduplicateJournalPoints(item.journal || []),
          messageCount: item.messageCount || 0,
        };
      });

      currentLogsItems.forEach(l => {
        if (!map[l.date]) {
          map[l.date] = { title: `Journal ${l.date}`, points: [], messageCount: 0 };
        }
        const mergedPoints = deduplicateJournalPoints([...(l.points || []), ...(map[l.date].points || [])]);
        map[l.date].points = mergedPoints;
      });

      setJournalMap(map);
    };

    const unsubHistory = subscribeToChatHistory(user.uid, (history) => {
      currentHistoryItems = history;
      rebuildJournalMap();
    });

    const unsubLogs = subscribeToJournalDataLogs(user.uid, (logs) => {
      currentLogsItems = logs;
      rebuildJournalMap();
    });

    return () => {
      unsubEvents();
      unsubHistory();
      unsubLogs();
    };
  }, [user, authLoading]);

  const handleDeleteJournalPoint = async (pointIndex: number) => {
    if (!user) {
      setShowGuestSignInModal(true);
      return;
    }
    if (!selectedDayData) return;
    const date = selectedDayData.date;
    
    const newPoints = selectedDayData.points.filter((_, idx) => idx !== pointIndex);
    setSelectedDayData({
      ...selectedDayData,
      points: newPoints,
    });

    setJournalMap(prev => {
      const existing = prev[date];
      if (!existing) return prev;
      return {
        ...prev,
        [date]: {
          ...existing,
          points: newPoints,
        },
      };
    });

    await deleteJournalPointFromHistory(user.uid, date, pointIndex);
    showHarmonyToast({
      title: "Daily Log Updated",
      description: "Gemini highlight removed from journal history",
      iconType: "trash",
    });
  };

  const openCreateDialog = (initialDate?: Date) => {
    if (!user) {
      setShowGuestSignInModal(true);
      return;
    }
    setEditingEvent(null);
    setTitle("");
    setDescription("");
    setLocation("");
    setEventDate(format(initialDate || new Date(), "yyyy-MM-dd"));
    setStartTime("09:00");
    setEndTime("10:00");
    setColor("sky");
    setIsDialogOpen(true);
  };

  const openEditDialog = (ev: CalendarEventData) => {
    if (!user) {
      setShowGuestSignInModal(true);
      return;
    }
    setEditingEvent(ev);
    setTitle(ev.title);
    setDescription(ev.description || "");
    setLocation(ev.location || "");
    setColor(ev.color || "sky");

    const startObj = new Date(ev.start);
    const endObj = new Date(ev.end);
    setEventDate(format(startObj, "yyyy-MM-dd"));
    setStartTime(format(startObj, "HH:mm"));
    setEndTime(format(endObj, "HH:mm"));
    setIsDialogOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user) return;

    setLoading(true);
    try {
      const startIso = new Date(`${eventDate}T${startTime}:00`).toISOString();
      const endIso = new Date(`${eventDate}T${endTime}:00`).toISOString();

      if (editingEvent) {
        await updateCalendarEvent(user.uid, editingEvent.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          start: startIso,
          end: endIso,
          location: location.trim() || undefined,
          color,
        });
        showHarmonyToast({
          title: "Calendar Event Updated",
          description: `Event "${title.trim()}" schedule updated`,
          iconType: "calendar",
        });
      } else {
        await saveCalendarEvent(user.uid, {
          title: title.trim(),
          description: description.trim() || undefined,
          start: startIso,
          end: endIso,
          location: location.trim() || undefined,
          color,
        });
        showHarmonyToast({
          title: "Calendar Event Created",
          description: `Event "${title.trim()}" added to Calendar`,
          iconType: "calendar",
        });
      }

      setIsDialogOpen(false);
    } catch (err) {
      console.error("Error saving event:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!user) return;
    await deleteCalendarEvent(user.uid, eventId);
    showHarmonyToast({
      title: "Calendar Event Deleted",
      description: "Event removed from Calendar",
      iconType: "trash",
    });
    setIsDialogOpen(false);
  };

  const navigateNext = () => {
    if (view === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(addDays(currentDate, 7));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const navigatePrev = () => {
    if (view === "month") setCurrentDate(subMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(subDays(currentDate, 7));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const navigateToday = () => setCurrentDate(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getColorClass = (c?: string) => {
    switch (c) {
      case "amber": return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "emerald": return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "violet": return "bg-violet-500/20 text-violet-300 border-violet-500/30";
      case "rose": return "bg-rose-500/20 text-rose-300 border-rose-500/30";
      case "orange": return "bg-orange-500/20 text-orange-300 border-orange-500/30";
      default: return "bg-sky-500/20 text-sky-300 border-sky-500/30";
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
            <div className="h-full flex flex-col px-4 md:px-6 lg:px-8 pb-8">
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
                          <BreadcrumbPage>Daily Logs</BreadcrumbPage>
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

              {/* Controls Bar Inside Page Content */}
              <div className="py-4 sm:py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center justify-between sm:justify-start gap-4">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    {format(currentDate, "MMMM yyyy")}
                  </h2>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={navigatePrev} className="h-8 w-8 p-0 rounded-lg">
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={navigateToday} className="h-8 px-3 text-xs rounded-lg font-medium">
                      Today
                    </Button>
                    <Button variant="ghost" size="sm" onClick={navigateNext} className="h-8 w-8 p-0 rounded-lg">
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-between sm:justify-end">
                  <div className="flex items-center bg-secondary rounded-xl p-1 border border-border overflow-x-auto max-w-full scrollbar-none">
                    {[
                      { id: "month", label: "Month", icon: CalendarDays },
                      { id: "week", label: "Week", icon: Columns },
                      { id: "day", label: "Day", icon: Grid },
                      { id: "agenda", label: "Agenda", icon: ListFilter },
                    ].map((v) => {
                      const IconComp = v.icon;
                      return (
                        <button
                          key={v.id}
                          onClick={() => setView(v.id as any)}
                          className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                            view === v.id ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <IconComp className="size-3.5 inline me-1 sm:me-1.5" /> <span className="hidden xs:inline">{v.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <Button
                    onClick={() => openCreateDialog()}
                    className="gap-1.5 sm:gap-2 rounded-xl text-xs font-medium cursor-pointer shadow-xs"
                  >
                    <Plus className="size-4" /> Add Event
                  </Button>
                </div>
              </div>

              {/* Main Calendar View Area */}
              <div className="flex-1">
                {/* MONTH VIEW */}
                {view === "month" && (
                  <div className="grid grid-cols-7 gap-px bg-border/60 rounded-xl sm:rounded-2xl overflow-hidden border border-border shadow-xs">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
                      <div key={dayName} className="p-1.5 sm:p-3 text-center text-[10px] sm:text-xs font-semibold bg-card text-muted-foreground uppercase tracking-wider">
                        <span className="hidden sm:inline">{dayName}</span>
                        <span className="sm:hidden">{dayName[0]}</span>
                      </div>
                    ))}

                    {monthDays.map((day) => {
                      const dayStr = format(day, "yyyy-MM-dd");
                      const dayEvents = events.filter((e) => isSameDay(day, new Date(e.start)));
                      const dayJournal = journalMap[dayStr];
                      const hasJournal = Boolean(dayJournal && (dayJournal.points.length > 0 || dayJournal.messageCount > 0));

                      // Cap month cell display at 2 items max to prevent squished internal scrollbars
                      const MAX_CELL_ITEMS = 2;
                      const maxEventsToShow = hasJournal ? 1 : MAX_CELL_ITEMS;
                      const visibleEvents = dayEvents.slice(0, maxEventsToShow);
                      const totalItemsCount = (hasJournal ? 1 : 0) + dayEvents.length;
                      const remainingCount = totalItemsCount - (hasJournal ? 1 : 0) - visibleEvents.length;

                      return (
                        <div
                          key={day.toString()}
                          onClick={() => openCreateDialog(day)}
                          className={`min-h-[70px] sm:min-h-[110px] p-1 sm:p-2 bg-card/60 flex flex-col justify-between cursor-pointer transition-colors hover:bg-card/90 ${
                            !isSameMonth(day, currentDate) ? "opacity-40 bg-background/50" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs font-semibold size-6 rounded-full flex items-center justify-center ${
                                isToday(day) ? "bg-primary text-primary-foreground shadow-xs" : "text-foreground"
                              }`}
                            >
                              {format(day, "d")}
                            </span>
                          </div>

                          <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                            {hasJournal && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDayData({
                                    date: dayStr,
                                    title: dayJournal.title,
                                    points: dayJournal.points,
                                  });
                                }}
                                className="w-full flex items-center justify-between gap-1 px-1.5 py-1 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-medium hover:bg-emerald-500/25 transition-colors cursor-pointer"
                              >
                                <span className="truncate flex items-center gap-1">
                                  <NotebookPen className="size-3 shrink-0 text-emerald-400" />
                                  <span>Gemini Data</span>
                                </span>
                                {dayJournal.points.length > 0 && (
                                  <span className="bg-emerald-500/30 px-1 rounded-full text-[9px] font-mono">
                                    {dayJournal.points.length}
                                  </span>
                                )}
                              </button>
                            )}

                            {visibleEvents.map((ev) => (
                              <div
                                key={ev.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditDialog(ev);
                                }}
                                className={`p-1 rounded-md border text-[10px] font-medium leading-tight flex items-center justify-between group ${getColorClass(ev.color)}`}
                              >
                                <span className="truncate flex-1 me-1">{ev.title}</span>
                              </div>
                            ))}

                            {remainingCount > 0 && (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (hasJournal && dayJournal) {
                                    setSelectedDayData({
                                      date: dayStr,
                                      title: dayJournal.title,
                                      points: dayJournal.points,
                                    });
                                  } else {
                                    setView("day");
                                    setCurrentDate(day);
                                  }
                                }}
                                className="text-[10px] font-medium text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/70 px-1.5 py-0.5 rounded text-center transition-colors cursor-pointer"
                              >
                                +{remainingCount} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* WEEK VIEW */}
                {view === "week" && (
                  <div className="overflow-x-auto min-w-0">
                    <div className="min-w-[600px] sm:min-w-0 grid grid-cols-7 gap-px bg-border/60 rounded-2xl overflow-hidden border border-border shadow-xs">
                      {weekDays.map((day) => {
                        const dayEvents = events.filter((e) => isSameDay(day, new Date(e.start)));
                        return (
                          <div key={day.toString()} className="bg-card min-h-[300px] sm:min-h-[400px] p-2 sm:p-3 border-r border-border/50 last:border-r-0">
                            <div className="text-center pb-2 sm:pb-3 border-b border-border/50">
                              <div className="text-[10px] sm:text-xs text-muted-foreground uppercase">{format(day, "EEE")}</div>
                              <div className={`text-xs sm:text-base font-bold mt-0.5 inline-block px-1.5 sm:px-2 py-0.5 rounded-full ${isToday(day) ? "bg-primary text-primary-foreground" : ""}`}>
                                {format(day, "d")}
                              </div>
                            </div>

                            <div className="mt-2 sm:mt-3 space-y-1.5 sm:space-y-2">
                              {dayEvents.map((ev) => (
                                <div
                                  key={ev.id}
                                  onClick={() => openEditDialog(ev)}
                                  className={`p-1.5 sm:p-2 rounded-xl border text-[11px] sm:text-xs cursor-pointer font-medium ${getColorClass(ev.color)}`}
                                >
                                  <div className="font-bold truncate">{ev.title}</div>
                                  <div className="text-[9px] sm:text-[10px] opacity-80">{format(new Date(ev.start), "h:mm a")}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* DAY VIEW */}
                {view === "day" && (
                  <div className="max-w-2xl mx-auto bg-card rounded-2xl border border-border p-6 space-y-4">
                    <div className="text-center pb-4 border-b border-border">
                      <h3 className="text-lg font-bold">{format(currentDate, "EEEE, MMMM d, yyyy")}</h3>
                    </div>
                    <div className="space-y-3">
                      {events.filter((e) => isSameDay(currentDate, new Date(e.start))).length === 0 ? (
                        <p className="text-center text-xs text-muted-foreground py-8">No events scheduled for today.</p>
                      ) : (
                        events
                          .filter((e) => isSameDay(currentDate, new Date(e.start)))
                          .map((ev) => (
                            <div
                              key={ev.id}
                              onClick={() => openEditDialog(ev)}
                              className={`p-3 rounded-xl border text-xs cursor-pointer flex justify-between items-center ${getColorClass(ev.color)}`}
                            >
                              <div>
                                <div className="font-bold text-sm">{ev.title}</div>
                                {ev.description && <div className="opacity-80">{ev.description}</div>}
                              </div>
                              <div className="font-mono text-xs">{format(new Date(ev.start), "h:mm a")}</div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                )}

                {/* AGENDA VIEW */}
                {view === "agenda" && (
                  <div className="max-w-3xl mx-auto space-y-4">
                    {events.length === 0 ? (
                      <div className="p-12 text-center border border-dashed border-border rounded-2xl space-y-3">
                        <Sparkles className="size-8 text-muted-foreground mx-auto" />
                        <h3 className="text-base font-semibold text-foreground">No events scheduled</h3>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                          Add events manually or tell Gemini in chat to schedule events for you automatically.
                        </p>
                      </div>
                    ) : (
                      events
                        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                        .map((ev) => (
                          <div
                            key={ev.id}
                            onClick={() => openEditDialog(ev)}
                            className="p-4 rounded-2xl bg-card border border-border flex items-center justify-between shadow-xs cursor-pointer hover:border-border/80 transition-all"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getColorClass(ev.color)}`}>
                                  {ev.title}
                                </span>
                                {ev.location && (
                                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                    <MapPin className="size-3" /> {ev.location}
                                  </span>
                                )}
                              </div>
                              {ev.description && (
                                <p className="text-xs text-muted-foreground leading-relaxed">{ev.description}</p>
                              )}
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                                <Clock className="size-3" />
                                <span>{format(new Date(ev.start), "MMM d, yyyy • h:mm a")}</span>
                              </div>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteEvent(ev.id);
                              }}
                              className="text-muted-foreground hover:text-destructive p-2 h-8 w-8 rounded-xl"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      </SidebarInset>

      {/* Modal Dialog for Calendar Event Creation/Edit */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md p-6 rounded-3xl space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-bold text-foreground">
                {editingEvent ? "Edit Event" : "Create Calendar Event"}
              </h3>
              <button
                onClick={() => setIsDialogOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-4 text-sm">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Event Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Meeting, Birthday, Reminder..."
                  className="bg-background border-border text-sm h-10 px-3 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Details or notes..."
                  className="bg-background border-border text-sm h-10 px-3 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Date</label>
                  <Input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="bg-background border-border text-sm h-10 px-3 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Color Tag</label>
                  <select
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full bg-background border border-border text-sm h-10 px-3 rounded-xl text-foreground"
                  >
                    <option value="sky">Sky Blue</option>
                    <option value="amber">Amber Gold</option>
                    <option value="emerald">Emerald Green</option>
                    <option value="violet">Violet Purple</option>
                    <option value="rose">Rose Red</option>
                    <option value="orange">Orange</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Start Time</label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="bg-background border-border text-sm h-10 px-3 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">End Time</label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="bg-background border-border text-sm h-10 px-3 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Location</label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Conference Room, Google Meet, Cafe..."
                  className="bg-background border-border text-sm h-10 px-3 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                {editingEvent ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleDeleteEvent(editingEvent.id)}
                    className="text-xs text-destructive hover:bg-destructive/10 rounded-xl"
                  >
                    Delete Event
                  </Button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsDialogOpen(false)}
                    className="text-xs rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || !title.trim()}
                    className="text-xs px-5 rounded-xl font-medium"
                  >
                    {loading ? <Loader2 className="size-3.5 animate-spin" /> : "Save Event"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Dialog for Gemini Saved Data */}
      {selectedDayData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border/80 w-full max-w-md p-5 rounded-2xl space-y-4 shadow-xl animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-border/50">
              <div className="space-y-0.5">
                <h3 className="text-base font-medium text-foreground tracking-tight">
                  Saved Journal Highlights
                </h3>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(selectedDayData.date + 'T00:00:00'), 'MMMM d, yyyy')}
                </p>
              </div>
              <button
                onClick={() => setSelectedDayData(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors cursor-pointer text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {/* List */}
            <div className="max-h-[55vh] overflow-y-auto space-y-2 pr-1">
              {selectedDayData.points && selectedDayData.points.length > 0 ? (
                selectedDayData.points.map((rawPoint, idx) => {
                  const cleanPoint = rawPoint.replace(/^\d+[\.\)]\s*/, '').trim();
                  return (
                    <div 
                      key={idx} 
                      className="group flex items-start justify-between gap-3 p-3 rounded-xl bg-muted/40 border border-border/40 hover:bg-muted/70 transition-colors text-xs text-foreground/90 leading-relaxed"
                    >
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <p className="text-xs text-foreground/90 leading-normal font-normal">
                          {cleanPoint}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteJournalPoint(idx)}
                        title="Delete entry"
                        className="text-muted-foreground/40 hover:text-destructive p-1 rounded-md transition-colors shrink-0 cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No saved highlights for this day.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <a
                href="/journal"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                <BookOpen className="size-3.5" /> Open Journal
              </a>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDayData(null)}
                className="text-xs h-8 px-4 rounded-lg font-medium"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={showGuestSignInModal} onOpenChange={setShowGuestSignInModal}>
        <AlertDialogContent className="max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CalendarDays className="size-5 text-amber-500" />
              Sign In to Create &amp; Manage Calendar Events
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground pt-2">
              Sample mode is a read-only showcase preview. Sign in with Google to schedule events, capture daily log highlights, and sync your Calendar to Firebase.
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
