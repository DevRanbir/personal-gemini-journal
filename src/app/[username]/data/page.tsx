'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAuthContext } from "@/contexts/auth-context";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/breadcrumb";
import { ScrollArea } from "@/components/scroll-area";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Skeleton } from "@/components/skeleton";
import {
  getAllChatDates,
  getAllJournalDataLogs,
  getBookmarks,
  getCalendarEvents,
  getChatHistory,
  getChatMessages,
  getMetricsInsightsCache,
  getTodoItems,
  saveMetricsInsightsCache,
  type CalendarEventData,
  type ChatHistory,
  type JournalDataLog,
  type MetricsInsightsCache,
  type MetricsSourceStats,
  type TodoItemData,
} from "@/lib/firebase-service";
import { deduplicateJournalPoints } from "@/lib/chat-utils";
import { formatDistanceToNow } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  RiBarChartBoxLine,
  RiBookmarkLine,
  RiBrainLine,
  RiCalendarLine,
  RiCheckDoubleLine,
  RiEmotionHappyLine,
  RiErrorWarningLine,
  RiFlashlightLine,
  RiHeartPulseLine,
  RiLightbulbLine,
  RiLoader4Line,
  RiMessageLine,
  RiRefreshLine,
  RiSeedlingLine,
  RiSparklingLine,
  RiTimeLine,
} from "@remixicon/react";

interface PageProps {
  params: Promise<{ username: string }>;
}

type Trend = "up" | "down" | "flat" | string;

interface NamedValue {
  name: string;
  value: number;
}

interface InsightItem extends NamedValue {
  trend?: Trend;
  consistency?: number;
}

interface MetricsInsights {
  summary?: string;
  emotions?: {
    summary?: string;
    scores?: NamedValue[];
    sentimentDays?: NamedValue[];
    trend?: string;
  };
  goals?: {
    summary?: string;
    active?: string[];
    completed?: string[];
    abandoned?: string[];
    repeatedNotActedOn?: string[];
    progressPercent?: number;
  };
  learning?: {
    summary?: string;
    topics?: NamedValue[];
    knowledgeGaps?: string[];
    repeatedQuestions?: string[];
    mastered?: string[];
    struggling?: string[];
  };
  productivity?: {
    summary?: string;
    tasksCreated?: number;
    tasksCompleted?: number;
    tasksPostponed?: number;
    deepWorkDays?: string[];
    blockers?: string[];
  };
  sleepEnergy?: { summary?: string; items?: string[] };
  habits?: { summary?: string; items?: InsightItem[] };
  social?: {
    summary?: string;
    peopleOrTopics?: NamedValue[];
    positiveInteractions?: string[];
    negativeInteractions?: string[];
  };
  finance?: { summary?: string; themes?: NamedValue[] };
  interests?: { summary?: string; items?: InsightItem[] };
  journalStats?: {
    summary?: string;
    entriesPerWeek?: number;
    entriesPerMonth?: number;
    journalingStreak?: number;
    mostActiveDay?: string;
  };
  recurringThemes?: {
    summary?: string;
    items?: { theme: string; frequency: number; sentiment?: string }[];
  };
  remindersAndIdeas?: {
    summary?: string;
    commitments?: string[];
    upcomingReminders?: string[];
    ideas?: { type?: string; text: string }[];
  };
}

interface MetricsState {
  totalChats: number;
  totalMessages: number;
  totalBookmarks: number;
  totalDays: number;
  totalJournalHighlights: number;
  totalTodos: number;
  completedTodos: number;
  totalEvents: number;
  averageMessagesPerDay: number;
  mostActiveDay?: string;
  recentActivity: {
    event: string;
    time: Date;
    details: string;
  }[];
}

interface SourceBundle {
  chatHistory: ChatHistory[];
  calendarEvents: CalendarEventData[];
  todoItems: TodoItemData[];
  journalEntries: string;
  stats: MetricsSourceStats;
  fingerprint: string;
}

const EMPTY_TEXT = "Not enough data yet";
const chartColors = ["#22c55e", "#60a5fa", "#f59e0b", "#f87171", "#a78bfa", "#22d3ee", "#84cc16", "#f472b6"];
const chartTextColor = "#a1a1aa";
const chartGridColor = "#303036";

const sampleStats: MetricsState = {
  totalChats: 12,
  totalMessages: 94,
  totalBookmarks: 8,
  totalDays: 9,
  totalJournalHighlights: 27,
  totalTodos: 14,
  completedTodos: 9,
  totalEvents: 6,
  averageMessagesPerDay: 10,
  mostActiveDay: "2026-08-29",
  recentActivity: [
    { event: "Journal Highlights", time: new Date(), details: "Saved mood, learning, and project progress notes" },
    { event: "Todo Progress", time: new Date(Date.now() - 3600000), details: "Completed 9 of 14 tracked action items" },
    { event: "Calendar Audit", time: new Date(Date.now() - 7200000), details: "Reviewed upcoming project and study reminders" },
  ],
};

const sampleInsights: MetricsInsights = {
  summary: "Your sample Harmony journal shows a focused week: strong AI project energy, steady learning, and a few stress spikes around deadlines.",
  emotions: {
    summary: "Mood is mostly motivated and focused, with stress appearing around submission work.",
    scores: [
      { name: "Mood", value: 78 },
      { name: "Happiness", value: 72 },
      { name: "Stress", value: 44 },
      { name: "Motivation", value: 86 },
      { name: "Energy", value: 74 },
      { name: "Calmness", value: 61 },
    ],
    sentimentDays: [
      { name: "Positive", value: 6 },
      { name: "Neutral", value: 2 },
      { name: "Negative", value: 1 },
    ],
    trend: "improving",
  },
  goals: {
    summary: "Main goals center on finishing Harmony, improving study consistency, and preparing a strong hackathon demo.",
    active: ["Finish Cloud Run submission", "Improve journal analytics", "Revise maths consistently"],
    completed: ["Added automatic daily logs", "Connected todo and calendar actions"],
    abandoned: [],
    repeatedNotActedOn: ["Export journal summaries"],
    progressPercent: 72,
  },
  learning: {
    summary: "Most learning energy is going into AI, Cloud Run, Firebase, and frontend polish.",
    topics: [
      { name: "AI / ML", value: 42 },
      { name: "Cloud", value: 28 },
      { name: "Programming", value: 18 },
      { name: "Academics", value: 12 },
    ],
    knowledgeGaps: ["Deployment labels", "Firestore rule debugging"],
    repeatedQuestions: ["How to make AI actions reliable?"],
    mastered: ["Firebase auth flow", "Guest demo mode"],
    struggling: ["Avoiding unnecessary AI calls"],
  },
  productivity: {
    summary: "Productivity is strongest on build-and-test days, with workload rising near deadlines.",
    tasksCreated: 14,
    tasksCompleted: 9,
    tasksPostponed: 2,
    deepWorkDays: ["Aug 28", "Aug 29"],
    blockers: ["API limits", "Firestore permissions"],
  },
  habits: {
    summary: "Only explicitly logged habits are shown here.",
    items: [
      { name: "Journaling", value: 91, consistency: 91 },
      { name: "Studying", value: 67, consistency: 67 },
      { name: "Reading", value: 43, consistency: 43 },
    ],
  },
  interests: {
    summary: "AI products and cloud deployment are trending upward in the sample month.",
    items: [
      { name: "Artificial Intelligence", value: 42, trend: "up" },
      { name: "Cloud", value: 28, trend: "up" },
      { name: "Gaming", value: 9, trend: "flat" },
      { name: "Academics", value: 21, trend: "up" },
    ],
  },
  recurringThemes: {
    summary: "Repeated themes point to project shipping, learning consistency, and time management.",
    items: [
      { theme: "AI projects", frequency: 12, sentiment: "Motivated" },
      { theme: "College workload", frequency: 8, sentiment: "Mixed" },
      { theme: "Time management", frequency: 6, sentiment: "Focused" },
    ],
  },
  remindersAndIdeas: {
    summary: "The journal contains several future-facing product and study ideas.",
    commitments: ["Finish project demo", "Review Firebase rules"],
    upcomingReminders: ["Cloud Run submission check"],
    ideas: [
      { type: "Product", text: "AI-powered personal audit dashboard" },
      { type: "Feature", text: "Theme frequency over time" },
    ],
  },
  sleepEnergy: { summary: EMPTY_TEXT, items: [] },
  social: { summary: EMPTY_TEXT, peopleOrTopics: [], positiveInteractions: [], negativeInteractions: [] },
  finance: { summary: EMPTY_TEXT, themes: [] },
  journalStats: {
    summary: "Sample account journals almost daily with compact highlights.",
    entriesPerWeek: 21,
    entriesPerMonth: 27,
    journalingStreak: 6,
    mostActiveDay: "Saturday",
  },
};

const isEmptySummary = (value?: string) => !value || value.trim() === "" || value.trim().toLowerCase() === EMPTY_TEXT.toLowerCase();
const clampPercent = (value?: number) => Math.max(0, Math.min(100, Math.round(Number(value || 0))));
const normalizedChartRows = (rows?: NamedValue[], max = 8) => (
  (rows || [])
    .filter((row) => row.name && Number.isFinite(Number(row.value)))
    .slice(0, max)
    .map((row) => ({ ...row, value: Math.round(Number(row.value)) }))
);

const shortHash = (input: string) => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
};

const makeFingerprint = (
  chatHistory: ChatHistory[],
  calendarEvents: CalendarEventData[],
  todoItems: TodoItemData[],
  totalMessages: number,
  journalLogs: JournalDataLog[] = []
) => {
  const compact = {
    totalMessages,
    chatHistory: chatHistory.map((chat) => ({
      date: chat.date,
      messageCount: chat.messageCount,
      lastTimestamp: chat.lastTimestamp,
      journalCount: chat.journal?.length || 0,
      journalTail: chat.journal?.slice(-3) || [],
    })),
    journalLogs: journalLogs.map((log) => ({
      date: log.date,
      pointsCount: log.points?.length || 0,
      pointsTail: log.points?.slice(-3) || [],
    })),
    calendarEvents: calendarEvents.map((event) => ({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      createdAt: event.createdAt,
    })),
    todoItems: todoItems.map((todo) => ({
      id: todo.id,
      title: todo.title,
      completed: todo.completed,
      dueDate: todo.dueDate,
      createdAt: todo.createdAt,
    })),
  };
  return shortHash(JSON.stringify(compact));
};

const getLatestActivityAt = (
  chatHistory: ChatHistory[],
  calendarEvents: CalendarEventData[],
  todoItems: TodoItemData[]
) => {
  const values = [
    ...chatHistory.map((item) => item.lastTimestamp || 0),
    ...calendarEvents.map((item) => item.createdAt || Date.parse(item.start) || 0),
    ...todoItems.map((item) => item.createdAt || (item.dueDate ? Date.parse(item.dueDate) : 0) || 0),
  ];
  return Math.max(0, ...values) || undefined;
};

const buildJournalEntries = (
  chatHistory: ChatHistory[],
  calendarEvents: CalendarEventData[],
  todoItems: TodoItemData[],
  journalLogs: JournalDataLog[] = []
) => {
  const historyPoints = chatHistory.flatMap((chat) =>
    (chat.journal || []).map((point) => `${chat.date}: ${point.replace(/^\d+[\.)]\s*/, "").trim()}`)
  );
  const logPoints = journalLogs.flatMap((log) =>
    (log.points || []).map((point) => `${log.date}: ${point.replace(/^\d+[\.)]\s*/, "").trim()}`)
  );
  const journalLines = deduplicateJournalPoints([...historyPoints, ...logPoints]);
  const eventLines = calendarEvents.map((event) => `Calendar ${event.start}: ${event.title}${event.description ? ` - ${event.description}` : ""}`);
  const todoLines = todoItems.map((todo) => `Todo ${todo.completed ? "completed" : "pending"}${todo.dueDate ? ` due ${todo.dueDate}` : ""}: ${todo.title}`);
  return [...journalLines, ...eventLines, ...todoLines].slice(-160).join("\n");
};

const makeEmptyMetrics = (): MetricsState => ({
  totalChats: 0,
  totalMessages: 0,
  totalBookmarks: 0,
  totalDays: 0,
  totalJournalHighlights: 0,
  totalTodos: 0,
  completedTodos: 0,
  totalEvents: 0,
  averageMessagesPerDay: 0,
  recentActivity: [],
});

const StatCard = ({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  hint: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  tone: string;
}) => (
  <div className="bg-card rounded-lg border border-border/70 p-4 shadow-sm">
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-5 w-5" size={20} />
      </div>
    </div>
  </div>
);

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium">{label || payload[0]?.name}</div>
      <div className="text-muted-foreground">{payload[0]?.value}</div>
    </div>
  );
};

const BarMetricChart = ({ rows, height = 210 }: { rows?: NamedValue[]; height?: number }) => {
  const cleanRows = normalizedChartRows(rows);
  if (cleanRows.length === 0) {
    return <EmptyVisual />;
  }

  return (
    <div className="w-full min-w-0" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={cleanRows} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartGridColor} />
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis dataKey="name" type="category" width={85} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: chartTextColor }} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
            {cleanRows.map((_, index) => (
              <Cell key={index} fill={chartColors[index % chartColors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const DonutChart = ({ rows, height = 220 }: { rows?: NamedValue[]; height?: number }) => {
  const cleanRows = normalizedChartRows(rows);
  if (cleanRows.length === 0) {
    return <EmptyVisual />;
  }

  return (
    <div className="w-full min-w-0" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={cleanRows} innerRadius={58} outerRadius={82} paddingAngle={4} dataKey="value" nameKey="name">
            {cleanRows.map((_, index) => (
              <Cell key={index} fill={chartColors[index % chartColors.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

const RadialPercentChart = ({ value, label }: { value?: number; label: string }) => {
  const percent = clampPercent(value);
  return (
    <div className="relative h-[154px] w-[154px] shrink-0">
      <div className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart data={[{ name: label, value: percent, fill: "#10b981" }]} innerRadius="72%" outerRadius="100%" startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" background cornerRadius={10} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-2xl font-semibold leading-none">{percent}%</div>
        <div className="mt-1 max-w-20 text-[10px] uppercase leading-tight text-muted-foreground">{label}</div>
      </div>
    </div>
  );
};

const LineMetricChart = ({ rows }: { rows?: NamedValue[] }) => {
  const cleanRows = normalizedChartRows(rows);
  if (cleanRows.length === 0) {
    return <EmptyVisual />;
  }
  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={cleanRows} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: chartTextColor }} />
          <YAxis hide />
          <Tooltip content={<ChartTooltip />} />
          <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: "#3b82f6" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const EmptyVisual = () => (
  <div className="flex h-[160px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/20">
    <div className="grid grid-cols-5 gap-1.5 opacity-60">
      {[18, 40, 26, 62, 34].map((height, index) => (
        <div key={index} className="flex h-16 w-3 items-end rounded-full bg-muted">
          <div className="w-full rounded-full bg-muted-foreground/40" style={{ height: `${height}%` }} />
        </div>
      ))}
    </div>
  </div>
);

const DataTable = ({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<Array<string | number>>;
}) => {
  if (rows.length === 0) {
    return <EmptyVisual />;
  }

  return (
    <div className="min-w-0 overflow-x-auto rounded-lg border border-border/70">
      <table className="w-full text-xs sm:text-sm">
        <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-3 py-2 text-left font-medium whitespace-nowrap">{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 8).map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-border/60">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="break-words px-3 py-2 align-top text-foreground/90">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const TextList = ({ items, emptyText = EMPTY_TEXT }: { items?: string[]; emptyText?: string }) => {
  const cleanItems = (items || []).filter(Boolean);
  if (cleanItems.length === 0) {
    return <DataTable columns={["Status"]} rows={[[emptyText]]} />;
  }
  return <DataTable columns={["Item"]} rows={cleanItems.slice(0, 8).map((item) => [item])} />;
};

const InsightCard = ({
  title,
  icon: Icon,
  children,
  summary,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  children: React.ReactNode;
  summary?: string;
}) => (
  <section className="min-w-0 bg-card rounded-lg border border-border/70 p-4 shadow-sm">
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5 text-primary" size={20} />
      <h3 className="text-base font-semibold">{title}</h3>
    </div>
    <div className="mt-2 rounded-md bg-muted/35 px-3 py-2">
      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {isEmptySummary(summary) ? EMPTY_TEXT : summary}
      </p>
    </div>
    <div className="mt-4">{children}</div>
  </section>
);

export default function MetricsPage({ params }: PageProps) {
  const { user, loading } = useAuthContext();
  const [username, setUsername] = useState<string>('');
  const [metrics, setMetrics] = useState<MetricsState>(makeEmptyMetrics);
  const [sourceBundle, setSourceBundle] = useState<SourceBundle | null>(null);
  const [cache, setCache] = useState<MetricsInsightsCache | null>(null);
  const [insights, setInsights] = useState<MetricsInsights | null>(null);
  const [isSampleMode, setIsSampleMode] = useState(false);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  useEffect(() => {
    const getUsername = async () => {
      const resolvedParams = await params;
      setUsername(resolvedParams.username);
    };
    getUsername();
  }, [params]);

  useEffect(() => {
    const loadMetrics = async () => {
      if (loading) return;

      if (!user) {
        setMetrics(sampleStats);
        setInsights(sampleInsights);
        setCache(null);
        setSourceBundle(null);
        setIsSampleMode(true);
        setIsLoadingMetrics(false);
        return;
      }

      const userIdentifier = user.uid || username;
      if (!userIdentifier) return;

      setIsLoadingMetrics(true);
      setGenerationError(null);
      try {
        const [chatHistory, bookmarks, chatDates, calendarEvents, todoItems, journalLogs, savedCache] = await Promise.all([
          getChatHistory(userIdentifier).catch(() => []),
          getBookmarks(userIdentifier).catch(() => []),
          getAllChatDates(userIdentifier).catch(() => []),
          getCalendarEvents(userIdentifier).catch(() => []),
          getTodoItems(userIdentifier).catch(() => []),
          getAllJournalDataLogs(userIdentifier).catch(() => []),
          getMetricsInsightsCache(userIdentifier).catch(() => null),
        ]);

        let totalMessages = 0;
        const recentActivity: MetricsState["recentActivity"] = [];

        for (const date of chatDates.slice(0, 20)) {
          const messages = await getChatMessages(userIdentifier, date).catch(() => []);
          totalMessages += messages.length;
          if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            recentActivity.push({
              event: "Chat Session",
              time: new Date(lastMessage.timestamp),
              details: `${messages.length} messages on ${new Date(date).toLocaleDateString()}`,
            });
          }
        }

        calendarEvents.slice(0, 4).forEach((event) => {
          recentActivity.push({
            event: "Calendar Event",
            time: new Date(event.start),
            details: event.title,
          });
        });

        todoItems.slice(0, 4).forEach((todo) => {
          recentActivity.push({
            event: todo.completed ? "Todo Completed" : "Todo Created",
            time: new Date(todo.createdAt || Date.now()),
            details: todo.title,
          });
        });

        bookmarks.slice(0, 3).forEach((bookmark) => {
          recentActivity.push({
            event: "Message Bookmarked",
            time: new Date(bookmark.bookmarkedAt),
            details: bookmark.content.substring(0, 70) + (bookmark.content.length > 70 ? "..." : ""),
          });
        });

        recentActivity.sort((a, b) => b.time.getTime() - a.time.getTime());

        const allHighlightPoints = deduplicateJournalPoints([
          ...chatHistory.flatMap(c => c.journal || []),
          ...journalLogs.flatMap(l => l.points || [])
        ]);
        const totalJournalHighlights = allHighlightPoints.length;
        const latestActivityAt = getLatestActivityAt(chatHistory, calendarEvents, todoItems);
        const stats: MetricsSourceStats = {
          totalChats: chatHistory.length,
          totalMessages,
          totalBookmarks: bookmarks.length,
          totalDays: chatDates.length,
          totalJournalHighlights,
          totalTodos: todoItems.length,
          completedTodos: todoItems.filter((todo) => todo.completed).length,
          totalEvents: calendarEvents.length,
          latestActivityAt,
        };
        const fingerprint = makeFingerprint(chatHistory, calendarEvents, todoItems, totalMessages, journalLogs);
        const journalEntries = buildJournalEntries(chatHistory, calendarEvents, todoItems, journalLogs);

        setMetrics({
          ...stats,
          averageMessagesPerDay: chatDates.length > 0 ? Math.round(totalMessages / chatDates.length) : 0,
          mostActiveDay: chatHistory[0]?.date,
          recentActivity: recentActivity.slice(0, 10),
        });
        setSourceBundle({ chatHistory, calendarEvents, todoItems, journalEntries, stats, fingerprint });
        setCache(savedCache);
        setInsights((savedCache?.insights as MetricsInsights | undefined) || null);
        setIsSampleMode(false);
      } catch (error) {
        console.error("Error loading metrics:", error);
        setMetrics(makeEmptyMetrics());
        setInsights(null);
        setCache(null);
        setSourceBundle(null);
      } finally {
        setIsLoadingMetrics(false);
      }
    };

    loadMetrics();
  }, [loading, user, username]);

  const hasSourceData = Boolean(
    sourceBundle &&
    (sourceBundle.stats.totalJournalHighlights > 0 ||
      sourceBundle.stats.totalEvents > 0 ||
      sourceBundle.stats.totalTodos > 0 ||
      sourceBundle.stats.totalMessages > 0)
  );
  const isStale = Boolean(cache && sourceBundle && cache.sourceFingerprint !== sourceBundle.fingerprint);
  const generatedAt = cache?.generatedAt ? new Date(cache.generatedAt) : null;
  const displayInsights = insights || (isSampleMode ? sampleInsights : null);

  const statusText = useMemo(() => {
    if (isSampleMode) return "Sample demo";
    if (!cache) return "No AI analysis generated yet";
    if (isStale) return "Source data changed since last analysis";
    return "Cached analysis is current";
  }, [cache, isSampleMode, isStale]);

  const handleGenerateInsights = async () => {
    if (!user || !sourceBundle || !hasSourceData || isGenerating) return;

    setIsGenerating(true);
    setGenerationError(null);
    try {
      const response = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          journalEntries: sourceBundle.journalEntries,
          calendarEvents: sourceBundle.calendarEvents.map((event) => ({
            title: event.title,
            description: event.description,
            start: event.start,
            end: event.end,
          })),
          todoItems: sourceBundle.todoItems.map((todo) => ({
            title: todo.title,
            description: todo.description,
            completed: todo.completed,
            dueDate: todo.dueDate,
            priority: todo.priority,
            category: todo.category,
          })),
          sourceStats: sourceBundle.stats,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate AI insights.");
      }

      const nextCache: MetricsInsightsCache = {
        generatedAt: Date.now(),
        sourceFingerprint: sourceBundle.fingerprint,
        sourceStats: sourceBundle.stats,
        insights: data,
      };

      const saved = await saveMetricsInsightsCache(user.uid || username, nextCache);
      if (!saved) {
        throw new Error("Generated insights, but could not save them to Firebase.");
      }

      setCache(nextCache);
      setInsights(data as MetricsInsights);
    } catch (error: any) {
      console.error("Metrics insight generation failed:", error);
      setGenerationError(error.message || "Could not generate insights right now.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading || isLoadingMetrics) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-4xl space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar collapsible="hidden" />
      <SidebarInset className="bg-sidebar group/sidebar-inset">
        <div className="flex h-[calc(100svh)] bg-[hsl(240_5%_92.16%)] md:rounded-s-3xl md:group-peer-data-[state=collapsed]/sidebar-inset:rounded-s-none transition-all ease-in-out duration-300">
          <ScrollArea className="flex-1 [&>div>div]:h-full w-full shadow-md md:rounded-s-[inherit] min-[1024px]:rounded-e-3xl bg-background">
            <div className="h-full flex flex-col px-4 md:px-6 lg:px-8">
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
                          <BreadcrumbLink href="#">{username || "guest"}</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          <BreadcrumbPage>Metrics</BreadcrumbPage>
                        </BreadcrumbItem>
                      </BreadcrumbList>
                    </Breadcrumb>
                  </div>
                  <Badge variant="outline" className="px-3 py-1">
                    <RiBarChartBoxLine className="mr-1.5 h-3 w-3" />
                    {statusText}
                  </Badge>
                </div>
              </div>

              <div className="relative grow pb-8">
                <div className="space-y-6 mt-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-2">
                      <h1 className="text-2xl font-bold tracking-tight">
                        {user ? `Welcome back, ${(typeof user.displayName === 'string' ? user.displayName.split(" ")[0] : null) || (typeof user.email === 'string' ? user.email.split("@")[0] : null) || "User"}` : "Harmony Metrics Demo"}
                      </h1>
                      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                        AI-powered journal auditing across emotions, goals, learning, productivity, habits, themes, reminders, and ideas. Refreshing this page only loads saved data; Gemini runs only when you click generate.
                      </p>
                    </div>
                    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                      {generatedAt && (
                        <Badge variant={isStale ? "secondary" : "outline"} className="justify-center px-3 py-1">
                          <RiTimeLine className="mr-1.5 h-3 w-3" />
                          {isStale ? "Stale" : "Generated"} {formatDistanceToNow(generatedAt, { addSuffix: true })}
                        </Badge>
                      )}
                      <Button
                        onClick={handleGenerateInsights}
                        disabled={!user || !hasSourceData || isGenerating}
                        className="min-w-[190px]"
                      >
                        {isGenerating ? (
                          <RiLoader4Line className="h-4 w-4 animate-spin" />
                        ) : (
                          <RiRefreshLine className="h-4 w-4" />
                        )}
                        {cache ? "Refresh AI Insights" : "Generate AI Insights"}
                      </Button>
                    </div>
                  </div>

                  {isSampleMode && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
                      Sample demo data is shown here. Sign in with Google to generate private metrics from your own journal.
                    </div>
                  )}

                  {!isSampleMode && !hasSourceData && (
                    <div className="rounded-lg border border-border/70 bg-card p-5 text-sm text-muted-foreground">
                      No journal, todo, or calendar data yet. Start chatting with Harmony, add a task, or create a calendar event, then return here to generate insights.
                    </div>
                  )}

                  {generationError && (
                    <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                      <RiErrorWarningLine className="mt-0.5 h-4 w-4" />
                      <span>{generationError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3">
                    <StatCard label="Chats" value={metrics.totalChats} hint="Journal sessions" icon={RiMessageLine} tone="bg-blue-500/10 text-blue-500" />
                    <StatCard label="Messages" value={metrics.totalMessages} hint={`${metrics.averageMessagesPerDay} per active day`} icon={RiSparklingLine} tone="bg-emerald-500/10 text-emerald-500" />
                    <StatCard label="Bookmarks" value={metrics.totalBookmarks} hint="Saved responses" icon={RiBookmarkLine} tone="bg-yellow-500/10 text-yellow-600" />
                    <StatCard label="Active Days" value={metrics.totalDays} hint={metrics.mostActiveDay || "No activity yet"} icon={RiCalendarLine} tone="bg-cyan-500/10 text-cyan-500" />
                    <StatCard label="Todos" value={`${metrics.completedTodos}/${metrics.totalTodos}`} hint="Completed tasks" icon={RiCheckDoubleLine} tone="bg-violet-500/10 text-violet-500" />
                    <StatCard label="Events" value={metrics.totalEvents} hint={`${metrics.totalJournalHighlights} highlights`} icon={RiBarChartBoxLine} tone="bg-rose-500/10 text-rose-500" />
                  </div>

                  <section className="bg-card rounded-lg border border-border/70 p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <RiBrainLine className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-semibold">AI Journal Audit</h2>
                    </div>
                    <div className="mt-3">
                      <DataTable
                        columns={["Cached AI summary", "API usage"]}
                        rows={[[
                          displayInsights?.summary || (user ? "Generate insights when you are ready. Harmony will cache the result here." : sampleInsights.summary || EMPTY_TEXT),
                          cache ? "Loaded from Firestore cache" : "No automatic Gemini call",
                        ]]}
                      />
                    </div>
                  </section>

                  {displayInsights ? (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      <InsightCard title="Emotional Patterns" icon={RiHeartPulseLine} summary={displayInsights.emotions?.summary}>
                        <div className="grid min-w-0 grid-cols-1 2xl:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.8fr)] gap-4">
                          <BarMetricChart rows={displayInsights.emotions?.scores} />
                          <DonutChart rows={displayInsights.emotions?.sentimentDays} height={210} />
                        </div>
                        <DataTable columns={["Trend"]} rows={[[displayInsights.emotions?.trend || EMPTY_TEXT]]} />
                      </InsightCard>

                      <InsightCard title="Goals" icon={RiSeedlingLine} summary={displayInsights.goals?.summary}>
                        <div className="grid min-w-0 grid-cols-1 2xl:grid-cols-[170px_minmax(0,1fr)] gap-4">
                          <RadialPercentChart value={displayInsights.goals?.progressPercent} label="Goal progress" />
                          <DataTable
                            columns={["Type", "Goal"]}
                            rows={[
                              ...(displayInsights.goals?.active || []).map((item) => ["Active", item] as [string, string]),
                              ...(displayInsights.goals?.completed || []).map((item) => ["Completed", item] as [string, string]),
                              ...(displayInsights.goals?.abandoned || []).map((item) => ["Abandoned", item] as [string, string]),
                              ...(displayInsights.goals?.repeatedNotActedOn || []).map((item) => ["Repeated", item] as [string, string]),
                            ]}
                          />
                        </div>
                      </InsightCard>

                      <InsightCard title="Learning" icon={RiBrainLine} summary={displayInsights.learning?.summary}>
                        <BarMetricChart rows={displayInsights.learning?.topics} />
                        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <DataTable columns={["Knowledge gaps"]} rows={(displayInsights.learning?.knowledgeGaps || []).map((item) => [item])} />
                          <DataTable columns={["Mastered / struggling"]} rows={[...(displayInsights.learning?.mastered || []), ...(displayInsights.learning?.struggling || [])].map((item) => [item])} />
                        </div>
                      </InsightCard>

                      <InsightCard title="Productivity" icon={RiFlashlightLine} summary={displayInsights.productivity?.summary}>
                        <BarMetricChart
                          rows={[
                            { name: "Created", value: displayInsights.productivity?.tasksCreated || 0 },
                            { name: "Completed", value: displayInsights.productivity?.tasksCompleted || 0 },
                            { name: "Postponed", value: displayInsights.productivity?.tasksPostponed || 0 },
                          ]}
                          height={160}
                        />
                        <div className="mt-4">
                          <TextList items={displayInsights.productivity?.blockers} />
                        </div>
                      </InsightCard>

                      <InsightCard title="Habits" icon={RiCheckDoubleLine} summary={displayInsights.habits?.summary}>
                        <BarMetricChart rows={(displayInsights.habits?.items || []).map((item) => ({ name: item.name, value: item.consistency ?? item.value }))} />
                      </InsightCard>

                      <InsightCard title="Interests" icon={RiSparklingLine} summary={displayInsights.interests?.summary}>
                        <LineMetricChart rows={displayInsights.interests?.items} />
                        <DataTable
                          columns={["Interest", "Trend", "Score"]}
                          rows={(displayInsights.interests?.items || []).filter((item) => item.name).map((item) => [
                            item.name,
                            item.trend === "up" ? "Rising" : item.trend === "down" ? "Falling" : "Steady",
                            item.value,
                          ])}
                        />
                      </InsightCard>

                      <InsightCard title="Recurring Themes" icon={RiBarChartBoxLine} summary={displayInsights.recurringThemes?.summary}>
                        <BarMetricChart rows={(displayInsights.recurringThemes?.items || []).map((item) => ({ name: item.theme, value: item.frequency }))} />
                        <DataTable
                          columns={["Theme", "Frequency", "Sentiment"]}
                          rows={(displayInsights.recurringThemes?.items || []).filter((item) => item.theme).map((item) => [item.theme, item.frequency, item.sentiment || "Mixed"])}
                        />
                      </InsightCard>

                      <InsightCard title="Reminders and Ideas" icon={RiLightbulbLine} summary={displayInsights.remindersAndIdeas?.summary}>
                        <TextList items={[...(displayInsights.remindersAndIdeas?.commitments || []), ...(displayInsights.remindersAndIdeas?.upcomingReminders || []), ...(displayInsights.remindersAndIdeas?.ideas || []).map((idea) => idea.text)]} />
                      </InsightCard>

                      {!isEmptySummary(displayInsights.sleepEnergy?.summary) && (
                        <InsightCard title="Sleep and Energy" icon={RiEmotionHappyLine} summary={displayInsights.sleepEnergy?.summary}>
                          <TextList items={displayInsights.sleepEnergy?.items} />
                        </InsightCard>
                      )}

                      {!isEmptySummary(displayInsights.social?.summary) && (
                        <InsightCard title="Social Signals" icon={RiMessageLine} summary={displayInsights.social?.summary}>
                          <BarMetricChart rows={displayInsights.social?.peopleOrTopics} />
                        </InsightCard>
                      )}

                      {!isEmptySummary(displayInsights.finance?.summary) && (
                        <InsightCard title="Financial Themes" icon={RiBookmarkLine} summary={displayInsights.finance?.summary}>
                          <DonutChart rows={displayInsights.finance?.themes} />
                        </InsightCard>
                      )}

                      <InsightCard title="Journal Stats" icon={RiCalendarLine} summary={displayInsights.journalStats?.summary}>
                        <BarMetricChart
                          rows={[
                            { name: "Week", value: displayInsights.journalStats?.entriesPerWeek || 0 },
                            { name: "Month", value: displayInsights.journalStats?.entriesPerMonth || 0 },
                            { name: "Streak", value: displayInsights.journalStats?.journalingStreak || 0 },
                          ]}
                          height={160}
                        />
                        <DataTable columns={["Most active day"]} rows={[[displayInsights.journalStats?.mostActiveDay || EMPTY_TEXT]]} />
                      </InsightCard>
                    </div>
                  ) : (
                    <section className="rounded-lg border border-dashed border-border p-8 text-center">
                      <h3 className="text-base font-semibold">No AI metrics yet</h3>
                      <div className="mx-auto mt-4 max-w-2xl">
                        <DataTable
                          columns={["Data loaded", "Next action", "API calls"]}
                          rows={[[
                            `${metrics.totalJournalHighlights} highlights, ${metrics.totalTodos} todos, ${metrics.totalEvents} events`,
                            "Click Generate AI Insights",
                            "0 used on refresh",
                          ]]}
                        />
                      </div>
                    </section>
                  )}

                  <section className="bg-card rounded-lg border border-border/70 p-5 shadow-sm">
                    <div className="flex items-center gap-2">
                      <RiTimeLine className="h-5 w-5 text-primary" />
                      <h3 className="text-base font-semibold">Recent Activity</h3>
                    </div>
                    <div className="mt-4">
                      <DataTable
                        columns={["Type", "Details", "Time"]}
                        rows={metrics.recentActivity.slice(0, 8).map((activity) => [
                          activity.event,
                          activity.details,
                          formatDistanceToNow(activity.time, { addSuffix: true }),
                        ])}
                      />
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
