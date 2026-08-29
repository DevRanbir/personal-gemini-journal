"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/sidebar";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { 
  CheckSquare, 
  Plus, 
  Sparkles, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Loader2,
  Wand2
} from "lucide-react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  getDocs,
  limit
} from "firebase/firestore";

interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
  timestamp: any;
}

export default function TasksPage() {
  const { user, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "users", user.uid, "action_items"),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: TaskItem[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        title: doc.data().title,
        completed: doc.data().completed || false,
        timestamp: doc.data().timestamp,
      }));
      setTasks(docs);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !user) return;

    setLoading(true);
    try {
      await addDoc(collection(db, "users", user.uid, "action_items"), {
        title: newTitle.trim(),
        completed: false,
        timestamp: serverTimestamp(),
      });
      setNewTitle("");
    } catch (err) {
      console.error("Failed to add task:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (taskId: string, currentCompleted: boolean) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid, "action_items", taskId), {
        completed: !currentCompleted,
      });
    } catch (err) {
      console.error("Failed to toggle task:", err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "action_items", taskId));
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  const handleAutoExtractTasks = async () => {
    if (!user || extracting) return;
    setExtracting(true);

    try {
      const q = query(
        collection(db, "users", user.uid, "interactions"),
        orderBy("timestamp", "desc"),
        limit(10)
      );
      const snapshot = await getDocs(q);
      const journalText = snapshot.docs.map((d) => d.data().text).join("\n\n");

      if (!journalText.trim()) {
        alert("No journal entries found to extract action items from.");
        setExtracting(false);
        return;
      }

      const res = await fetch("/api/action-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: journalText }),
      });

      const data = await res.json();
      if (res.ok && data.tasks && Array.isArray(data.tasks)) {
        for (const itemTitle of data.tasks) {
          if (!tasks.some((t) => t.title.toLowerCase() === itemTitle.toLowerCase())) {
            await addDoc(collection(db, "users", user.uid, "action_items"), {
              title: itemTitle,
              completed: false,
              timestamp: serverTimestamp(),
            });
          }
        }
      }
    } catch (err) {
      console.error("Auto extraction error:", err);
    } finally {
      setExtracting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col h-full overflow-y-auto p-6 md:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
            <div>
              <div className="flex items-center gap-2">
                <SidebarTrigger />
                <CheckSquare className="size-6 text-emerald-400" />
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Action Items & Tasks</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Extract actionable commitments directly from your Gemini Journal entries into an interactive checklist.
              </p>
            </div>
            <Button
              onClick={handleAutoExtractTasks}
              disabled={extracting}
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium gap-2 shadow-md shadow-blue-600/20 cursor-pointer"
            >
              {extracting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Wand2 className="size-4" />
              )}
              <span>Auto-Extract via Gemini</span>
            </Button>
          </div>

          {/* Add Task Form */}
          <form onSubmit={handleAddTask} className="flex gap-2 max-w-2xl">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Add a new action item or goal..."
              className="bg-card border-border h-11 px-4 text-sm rounded-xl"
            />
            <Button
              type="submit"
              disabled={loading || !newTitle.trim()}
              className="bg-secondary hover:bg-secondary/80 text-foreground border border-border h-11 px-5 rounded-xl gap-2 cursor-pointer"
            >
              <Plus className="size-4" />
              <span>Add</span>
            </Button>
          </form>

          {/* Progress Bar */}
          {tasks.length > 0 && (
            <div className="p-4 rounded-2xl bg-card border border-border space-y-2 max-w-2xl shadow-sm">
              <div className="flex justify-between text-xs font-semibold text-foreground">
                <span>Progress Checklist</span>
                <span className="text-muted-foreground">
                  {completedCount} of {tasks.length} completed ({Math.round((completedCount / tasks.length) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${(completedCount / tasks.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Task List */}
          <div className="space-y-2 max-w-2xl">
            {tasks.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-2xl space-y-2">
                <Sparkles className="size-8 text-muted-foreground mx-auto" />
                <p className="text-sm font-medium text-foreground">No action items yet</p>
                <p className="text-xs text-muted-foreground">
                  Add items manually above or click "Auto-Extract via Gemini" to pull tasks from your journal.
                </p>
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:border-border/80 transition-all shadow-sm group"
                >
                  <button
                    onClick={() => handleToggleTask(task.id, task.completed)}
                    className="flex items-center gap-3 text-left flex-1 cursor-pointer"
                  >
                    {task.completed ? (
                      <CheckCircle2 className="size-5 text-emerald-400 shrink-0" />
                    ) : (
                      <Circle className="size-5 text-muted-foreground shrink-0" />
                    )}
                    <span
                      className={`text-sm ${
                        task.completed ? "line-through text-muted-foreground" : "text-foreground font-medium"
                      }`}
                    >
                      {task.title}
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all cursor-pointer"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
