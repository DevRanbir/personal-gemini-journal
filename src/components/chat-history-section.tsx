"use client";

import React, { useState } from 'react';
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { 
  RiAddLine, 
  RiEdit2Line, 
  RiDeleteBin6Line, 
  RiCheckLine, 
  RiCloseLine,
  RiChat3Line,
  RiCalendarLine
} from "@remixicon/react";
import { useAuthContext } from '@/contexts/auth-context';
import { useChatHistory } from '@/contexts/chat-history-context';
import { useChat } from '@/contexts/chat-context';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/alert-dialog";

import { Comp41DatePicker } from "@/components/ui/comp-41-date-picker";

export function ChatHistorySection() {
  const { user } = useAuthContext();
  const { chatHistory, isLoading, updateChatTitle, deleteChatSession } = useChatHistory();
  const { loadMessagesForDate, createNewChat, currentDate } = useChat();
  const [editingChat, setEditingChat] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showPastDatePicker, setShowPastDatePicker] = useState(false);
  const [showGuestSignInModal, setShowGuestSignInModal] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const hasTodayJournal = chatHistory.some(c => c.date === todayStr);

  const handleChatClick = (date: string) => {
    loadMessagesForDate(date);
  };

  const handleAddTodayJournalClick = () => {
    if (!user) {
      setShowGuestSignInModal(true);
      return;
    }
    createNewChat(todayStr);
  };

  const handleAddPastJournalClick = () => {
    if (!user) {
      setShowGuestSignInModal(true);
      return;
    }
    setShowPastDatePicker(true);
  };

  const handlePastJournalCreate = (dateStr: string) => {
    if (!dateStr || dateStr > todayStr) return;
    if (!user) {
      setShowGuestSignInModal(true);
      return;
    }

    const exists = chatHistory.some(c => c.date === dateStr);
    if (exists) {
      loadMessagesForDate(dateStr);
    } else {
      createNewChat(dateStr);
    }
    setShowPastDatePicker(false);
  };

  const handleEditStart = (date: string, currentTitle: string) => {
    setEditingChat(date);
    setEditTitle(currentTitle);
  };

  const handleEditSave = async () => {
    if (editingChat && editTitle.trim()) {
      await updateChatTitle(editingChat, editTitle.trim());
      setEditingChat(null);
      setEditTitle('');
    }
  };

  const handleEditCancel = () => {
    setEditingChat(null);
    setEditTitle('');
  };

  const handleDelete = async (date: string) => {
    const wasCurrentChat = currentDate === date;
    await deleteChatSession(date);
    
    // If we're currently viewing the deleted chat, find another chat to switch to
    if (wasCurrentChat) {
      // Get the remaining chats after deletion (need to wait for state update)
      setTimeout(() => {
        const remainingChats = chatHistory.filter(chat => chat.date !== date);
        
        if (remainingChats.length > 0) {
          // Switch to the most recent remaining chat
          handleChatClick(remainingChats[0].date);
        } else {
          // Only create a new chat if there are no other chats left
          createNewChat(todayStr);
        }
      }, 100); // Small delay to ensure state is updated
    }
  };

  const formatMonthDate = (dateString: string) => {
    if (!dateString || typeof dateString !== 'string') return String(dateString || '');
    try {
      const datePart = dateString.split('-').slice(0, 3).join('-');
      const [year, month, day] = datePart.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      if (isNaN(d.getTime())) return dateString;

      const now = new Date();
      const isToday = d.getFullYear() === now.getFullYear() && 
                      d.getMonth() === now.getMonth() && 
                      d.getDate() === now.getDate();

      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const isYesterday = d.getFullYear() === yesterday.getFullYear() && 
                          d.getMonth() === yesterday.getMonth() && 
                          d.getDate() === yesterday.getDate();

      const monthName = d.toLocaleDateString('en-US', { month: 'long' });

      if (isToday) {
        return `Today, ${monthName} ${day}`;
      }

      if (isYesterday) {
        return `Yesterday, ${monthName} ${day}`;
      }

      return `${monthName}, ${day}`;
    } catch (error) {
      return dateString;
    }
  };

  const formatExactDateTag = (dateString: string) => {
    if (!dateString || typeof dateString !== 'string') return String(dateString || '');
    try {
      const datePart = dateString.split('-').slice(0, 3).join('-');
      const [year, month, day] = datePart.split('-').map(Number);
      if (!year || !month || !day) return dateString;
      return `${day}/${month}/${year}`;
    } catch (error) {
      return dateString;
    }
  };

  const formatDate = (dateString: string) => {
    return formatMonthDate(dateString);
  };

  const truncateMessage = (message: any, maxLength: number = 40) => {
    let str = typeof message === 'string'
      ? message
      : (typeof message === 'object' && message !== null ? (message.content || message.text || JSON.stringify(message)) : String(message || ''));

    if (typeof str === 'string' && str.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(str.trim());
        if (parsed.response && typeof parsed.response === 'string') {
          str = parsed.response;
        } else if (parsed.text && typeof parsed.text === 'string') {
          str = parsed.text;
        } else if (parsed.content && typeof parsed.content === 'string') {
          str = parsed.content;
        }
      } catch (e) {
        // Keep str as is if parsing fails
      }
    }

    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
  };

  return (
    <div className="py-5 relative before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-black/[0.06] before:via-black/10 before:to-black/[0.06]">
      <h3 className="text-xs font-medium uppercase text-muted-foreground/80 mb-4">
        Journal History
      </h3>
      
      {/* Journal Action Buttons */}
      <div className="mb-3 space-y-2">
        {!hasTodayJournal ? (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleAddTodayJournalClick}
            className="w-full justify-start gap-2 h-8 text-xs font-medium"
          >
            <RiAddLine size={14} />
            Today&apos;s Journal
          </Button>
        ) : (
          !showPastDatePicker ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAddPastJournalClick}
              className="w-full justify-start gap-2 h-8 text-xs font-medium border-dashed border-border/80"
            >
              <RiCalendarLine size={14} />
              + Add Past Journal
            </Button>
          ) : (
            <Comp41DatePicker
              maxDate={yesterdayStr}
              onSelectDate={(dateStr) => {
                handlePastJournalCreate(dateStr);
              }}
              onCancel={() => setShowPastDatePicker(false)}
            />
          )
        )}
      </div>

      {/* Journal History List */}
      <div className="space-y-2 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 w-full bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : chatHistory.length === 0 ? (
          <div className="text-center py-4 text-xs text-muted-foreground">
            <RiChat3Line size={24} className="mx-auto mb-2 opacity-50" />
            No journal entries yet
          </div>
        ) : (
          [...chatHistory]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((chat) => (
            <div
              key={chat.date}
              className={`group relative border rounded-lg p-2 transition-colors hover:bg-muted/50 ${
                currentDate === chat.date ? 'bg-muted border-primary/20' : 'border-border'
              }`}
            >
              {editingChat === chat.date ? (
                <div className="space-y-2">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="h-6 text-xs"
                    placeholder="Journal title"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEditSave();
                      if (e.key === 'Escape') handleEditCancel();
                    }}
                  />
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleEditSave}
                      className="h-5 w-5 p-0"
                    >
                      <RiCheckLine size={12} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleEditCancel}
                      className="h-5 w-5 p-0"
                    >
                      <RiCloseLine size={12} />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div 
                    className="cursor-pointer"
                    onClick={() => handleChatClick(chat.date)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-medium truncate pr-2">
                        {formatMonthDate(chat.date)}
                      </h4>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatExactDateTag(chat.date)}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      {truncateMessage(chat.lastMessage || 'No messages')}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[9px] text-muted-foreground">
                        {chat.messageCount} messages
                      </span>
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => e.stopPropagation()}
                          className="h-5 w-5 p-0 hover:bg-background hover:text-destructive"
                        >
                          <RiDeleteBin6Line size={10} />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Chat</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete &quot;{chat.title}&quot;? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(chat.date)}
                            className="bg-destructive hover:bg-destructive/90 text-white"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Guest Sign-In Modal */}
      <AlertDialog open={showGuestSignInModal} onOpenChange={setShowGuestSignInModal}>
        <AlertDialogContent className="max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RiCalendarLine className="size-5 text-amber-500" />
              Sign In to Create &amp; Save Personal Journals
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground pt-2">
              Sample mode is a read-only showcase preview. Sign in with Google to create new daily journals, capture past reflections, and sync your entries safely to Firebase.
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
    </div>
  );
}
