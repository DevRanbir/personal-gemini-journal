"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/sidebar";
import { Button } from "@/components/button";
import { 
  BarChart3, 
  Sparkles, 
  RefreshCw, 
  Loader2, 
  HeartHandshake,
  Lightbulb,
  Target,
  BookOpen,
  Activity,
  ArrowDown
} from "lucide-react";
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  Legend 
} from "recharts";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore";

interface SentimentData {
  name: string;
  value: number;
  color: string;
}

interface TopicData {
  topic: string;
  count: number;
}

function CategoryHeading({ icon: Icon, eyebrow, title }: { icon: React.ElementType; eyebrow: string; title: string }) {
  return (
    <div className="flex items-end justify-between gap-3 border-b border-border pb-2">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{eyebrow}</p>
          <h2 className="truncate text-lg font-semibold text-foreground">{title}</h2>
        </div>
      </div>
    </div>
  );
}

function InsightPanel({ icon: Icon, title, tone, className = "", children }: { icon: React.ElementType; title: string; tone: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`min-w-0 rounded-xl border border-border bg-card p-5 shadow-sm ${className}`}>
      <div className={`mb-3 flex items-center gap-2 text-sm font-semibold ${tone}`}>
        <Icon className="size-4" />
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

function ChartPanel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-border/70 bg-background/40 p-3">
      <div className="mb-1">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return <div className="flex h-full items-center justify-center text-xs text-muted-foreground">{label}</div>;
}

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 py-2 last:border-b-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="max-w-[60%] truncate text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 truncate text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

export default function InsightsPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string>("");
  const [sentimentData, setSentimentData] = useState<SentimentData[]>([]);
  const [topicData, setTopicData] = useState<TopicData[]>([]);
  const [keyTakeaway, setKeyTakeaway] = useState<string>("");

  const fetchInsights = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch user's recent reflections
      const q = query(
        collection(db, "users", user.uid, "interactions"),
        orderBy("timestamp", "desc"),
        limit(20)
      );

      const snapshot = await getDocs(q);
      const userReflections = snapshot.docs
        .map((doc) => doc.data().text)
        .filter(Boolean);

      if (userReflections.length === 0) {
        setSummary("No journal entries found yet. Write some entries in your Journal to generate AI insights.");
        setSentimentData([
          { name: "Positive", value: 60, color: "#10B981" },
          { name: "Neutral", value: 30, color: "#3B82F6" },
          { name: "Reflective", value: 10, color: "#8B5CF6" },
        ]);
        setTopicData([
          { topic: "Goals", count: 5 },
          { topic: "Learning", count: 4 },
          { topic: "Mindfulness", count: 3 },
        ]);
        setKeyTakeaway("Start journaling to unlock personalized AI emotional and goal-tracking insights.");
        setLoading(false);
        return;
      }

      // Call API Route
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: userReflections }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate insights.");

      setSummary(data.summary || "Summary generated successfully.");
      setSentimentData((data.emotions?.sentimentDays || []).map((item: any, index: number) => ({
        name: item.name,
        value: item.value,
        color: ["#10B981", "#3B82F6", "#F59E0B"][index] || "#8B5CF6",
      })));
      setTopicData((data.learning?.topics || data.recurringThemes?.items || []).map((item: any) => ({
        topic: item.name || item.theme,
        count: item.value || item.frequency || 0,
      })));
      setKeyTakeaway(data.recurringThemes?.summary || data.goals?.summary || "Keep journaling for deeper insights.");
    } catch (err: any) {
      console.error("Insights error:", err);
      setSummary("Error loading insights. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col h-full overflow-y-auto p-6 md:p-8 space-y-6">
          {/* Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
            <div>
              <div className="flex items-center gap-2">
                <SidebarTrigger />
                <BarChart3 className="size-6 text-blue-400" />
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Journal Insights</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                A visual view of your journal patterns, progress, and recurring themes.
              </p>
            </div>
            <Button
              onClick={fetchInsights}
              disabled={loading}
              className="bg-secondary hover:bg-secondary/80 text-foreground border border-border gap-2 cursor-pointer"
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              Refresh Intelligence
            </Button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3 text-muted-foreground">
              <Loader2 className="size-8 animate-spin text-blue-500" />
              <p className="text-sm font-medium">Gemini 2.5 is synthesizing your reflections into structured analytics...</p>
            </div>
          ) : (
            <div className="space-y-7">
              <nav aria-label="Insight categories" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { href: "#overview", label: "Overview", icon: Sparkles, tone: "text-blue-400" },
                  { href: "#emotional-patterns", label: "Emotional patterns", icon: HeartHandshake, tone: "text-emerald-400" },
                  { href: "#growth-progress", label: "Growth & progress", icon: Target, tone: "text-violet-400" },
                  { href: "#journal-activity", label: "Journal activity", icon: Activity, tone: "text-amber-400" },
                ].map(({ href, label, icon: Icon, tone }) => (
                  <a key={href} href={href} className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
                    <Icon className={`size-4 shrink-0 ${tone}`} />
                    <span className="truncate">{label}</span>
                    <ArrowDown className="ml-auto size-3 shrink-0 opacity-50" />
                  </a>
                ))}
              </nav>

              <section id="overview" className="scroll-mt-24 space-y-3">
                <CategoryHeading icon={Sparkles} eyebrow="01 / Overview" title="Your journal at a glance" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <InsightPanel className="md:col-span-2" icon={Sparkles} title="Reflection synthesis" tone="text-blue-400">
                    <p className="text-sm leading-relaxed text-foreground/90">{summary}</p>
                  </InsightPanel>
                  <InsightPanel icon={Lightbulb} title="Actionable takeaway" tone="text-amber-400">
                    <p className="text-sm font-medium leading-relaxed text-foreground/90">{keyTakeaway ? `“${keyTakeaway}”` : "Keep journaling for a more complete picture."}</p>
                  </InsightPanel>
                </div>
              </section>

              <section id="emotional-patterns" className="scroll-mt-24 space-y-3">
                <CategoryHeading icon={HeartHandshake} eyebrow="02 / Emotional patterns" title="How your reflections feel over time" />
                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    <ChartPanel title="Tone distribution" subtitle="The emotional mix across recent reflections">
                      <div className="h-56 w-full">
                        {sentimentData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={sentimentData} cx="50%" cy="45%" innerRadius={58} outerRadius={82} paddingAngle={5} dataKey="value">
                                {sentimentData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color || "#3B82F6"} />)}
                              </Pie>
                              <RechartsTooltip contentStyle={{ background: "#202024", border: "1px solid #3f3f46", borderRadius: 8, color: "#fafafa" }} />
                              <Legend wrapperStyle={{ color: "#a1a1aa", fontSize: 12 }} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : <EmptyChart label="No sentiment data available" />}
                      </div>
                    </ChartPanel>
                    <ChartPanel title="Top reflection topics" subtitle="What shows up most often in your writing">
                      <div className="h-56 w-full">
                        {topicData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topicData} margin={{ top: 8, right: 8, bottom: 8, left: -18 }}>
                              <XAxis dataKey="topic" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
                              <YAxis stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
                              <RechartsTooltip contentStyle={{ background: "#202024", border: "1px solid #3f3f46", borderRadius: 8, color: "#fafafa" }} />
                              <Bar dataKey="count" fill="#60a5fa" radius={[5, 5, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : <EmptyChart label="No topic data available" />}
                      </div>
                    </ChartPanel>
                  </div>
                </div>
              </section>

              <section id="growth-progress" className="scroll-mt-24 space-y-3">
                <CategoryHeading icon={Target} eyebrow="03 / Growth & progress" title="Goals, learning, and momentum" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <InsightPanel icon={Target} title="Goals" tone="text-violet-400">
                    <MetricRow label="Goals mentioned" value={topicData.find((item) => item.topic.toLowerCase() === "goals")?.count || 0} />
                    <MetricRow label="Progress signal" value={keyTakeaway ? "Active" : "Waiting for data"} />
                  </InsightPanel>
                  <InsightPanel icon={BookOpen} title="Learning" tone="text-cyan-400">
                    <MetricRow label="Topics discovered" value={topicData.length} />
                    <MetricRow label="Most visible topic" value={topicData[0]?.topic || "Not enough data yet"} />
                  </InsightPanel>
                </div>
              </section>

              <section id="journal-activity" className="scroll-mt-24 space-y-3">
                <CategoryHeading icon={Activity} eyebrow="04 / Journal activity" title="Your reflection rhythm" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <MetricTile label="Reflections analyzed" value={sentimentData.reduce((total, item) => total + item.value, 0)} />
                  <MetricTile label="Topics in rotation" value={topicData.length} />
                  <MetricTile label="Takeaway" value={keyTakeaway ? "Ready" : "Pending"} />
                </div>
              </section>
            </div>
          )}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
