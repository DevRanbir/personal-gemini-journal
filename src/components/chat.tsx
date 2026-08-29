"use client";

import { SettingsPanelTrigger } from "@/components/settings-panel";
import { SidebarToggle } from "@/components/sidebar-toggle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/breadcrumb";
import { Button } from "@/components/button";
import { Skeleton } from "@/components/skeleton";
import { ScrollArea } from "@/components/scroll-area";
import {
  RiCodeSSlashLine,
  RiShareLine,
  RiShining2Line,
  RiCloseLine,
  RiCheckLine,
  RiMicLine,
  RiMicOffLine,
} from "@remixicon/react";
import { ChatMessage } from "@/components/chat-message";
import { FormattedMessage } from "@/components/formatted-message";
import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useAuthContext } from "@/contexts/auth-context";
import { useChat } from "@/contexts/chat-context";
import { useSettings, type UserSettings } from "@/contexts/settings-context";
import { getSlashPresetLabels, parseSlashPresets, SLASH_PRESETS } from "@/lib/chat-presets";
import { getHarmonyAvatarUrl, getUserAvatarUrl } from "@/lib/local-user";
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

const languageOptions = [
  { value: "hinglish", label: "Hinglish" },
  { value: "english", label: "English" },
  { value: "punjabi", label: "Punjabi" },
  { value: "marathi", label: "Marathi" },
  { value: "hindi", label: "Hindi" },
] as const;

type MessageLanguage = UserSettings["language"];

function WordByWordMessage({ content, messageTimestamp }: { content: string; messageTimestamp?: Date }) {
  const isRecent = useMemo(() => {
    if (!messageTimestamp) return false;
    const diff = Date.now() - new Date(messageTimestamp).getTime();
    return diff >= 0 && diff < 10000; // Received in last 10 seconds
  }, [messageTimestamp]);

  const words = useMemo(() => {
    if (!content) return [];
    return content.split(/(\s+)/);
  }, [content]);

  const [visibleCount, setVisibleCount] = useState(() => {
    return isRecent ? 1 : words.length;
  });

  useEffect(() => {
    if (!isRecent || visibleCount >= words.length) return;

    const timer = setInterval(() => {
      setVisibleCount(prev => {
        if (prev >= words.length) {
          clearInterval(timer);
          return words.length;
        }
        return prev + 1;
      });
    }, 20);

    return () => clearInterval(timer);
  }, [isRecent, words.length, visibleCount]);

  const displayedText = isRecent ? words.slice(0, visibleCount).join('') : content;

  return <FormattedMessage content={displayedText} />;
}

export default function Chat() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuthContext();
  const { messages, sendMessage, editMessage, isLoading, isSending, isThinking, currentDate, replyContext, clearReplyContext, removeReplyContext } = useChat();
  const { settings, updateLanguage } = useSettings();
  const [hasInitiallyScrolled, setHasInitiallyScrolled] = useState(false);
  const [lastChatDate, setLastChatDate] = useState(currentDate);
  const [inputValue, setInputValue] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [messageLanguage, setMessageLanguage] = useState<MessageLanguage>(settings.language);
  const [showGuestSignInModal, setShowGuestSignInModal] = useState(false);
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const voiceInsertPositionRef = useRef<number | null>(null);

  const [copiedShare, setCopiedShare] = useState(false);

  const handleShare = useCallback(async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.origin : 'https://harmony-journal.vercel.app';
    const shareText = `✨ Check out Harmony — my personal AI reflection & journaling companion!\n\nWrite your thoughts, track daily highlights, and reflect with AI:\n${shareUrl}`;

    try {
      if (typeof navigator !== 'undefined' && navigator.share && /mobile|android|iphone|ipad/i.test(navigator.userAgent)) {
        await navigator.share({
          title: 'Harmony Journal',
          text: shareText,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2500);
      }
    } catch (error) {
      try {
        await navigator.clipboard.writeText(shareText);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2500);
      } catch (err) {
        console.error('Failed to copy share text:', err);
      }
    }
  }, []);
  const userAvatarUrl = useMemo(() => getUserAvatarUrl(user), [user]);
  const aiAvatarUrl = useMemo(() => getHarmonyAvatarUrl(currentDate), [currentDate]);
  const selectedLanguage = useMemo(
    () => languageOptions.find((option) => option.value === messageLanguage) ?? languageOptions[0],
    [messageLanguage]
  );
  const journalBadgeText = useMemo(() => {
    if (!messages || messages.length === 0) {
      return "A New Journal";
    }

    try {
      const datePart = currentDate.split('-').slice(0, 3).join('-');
      const [year, month, day] = datePart.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      if (isNaN(d.getTime())) {
        return `A Journal of ${currentDate}`;
      }
      const monthName = d.toLocaleDateString('en-US', { month: 'long' });
      return `A Journal of ${day} ${monthName} ${year}`;
    } catch {
      return `A Journal of ${currentDate}`;
    }
  }, [messages, currentDate]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  const toggleSpeechToText = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      showHarmonyToast({
        title: "Speech input stopped",
        description: "Finishing the text captured so far.",
        iconType: "sparkles",
        duration: 2200,
      });
      return;
    }

    const speechWindow = window as typeof window & {
      SpeechRecognition?: new () => any;
      webkitSpeechRecognition?: new () => any;
    };
    const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceStatus("Speech input is not supported in this browser.");
      showHarmonyToast({
        title: "Speech input unavailable",
        description: "Try a browser with microphone speech recognition enabled.",
        iconType: "sparkles",
      });
      return;
    }

    const recognition = new SpeechRecognition();
    const textarea = textareaRef.current;
    voiceInsertPositionRef.current = textarea?.selectionStart ?? inputValue.length;
    const baseInputValue = inputValue;
    const insertionPoint = voiceInsertPositionRef.current;
    const baseBefore = baseInputValue.slice(0, insertionPoint);
    const baseAfter = baseInputValue.slice(insertionPoint);
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = {
      hinglish: "en-IN",
      english: "en-IN",
      hindi: "hi-IN",
      punjabi: "pa-IN",
      marathi: "mr-IN",
    }[messageLanguage];

    let committedTranscript = "";
    recognition.onstart = () => {
      setVoiceStatus("Listening... speak naturally");
      setIsListening(true);
      showHarmonyToast({
        title: "Listening",
        description: "Speak now. Click the microphone again when you are finished.",
        iconType: "sparkles",
        duration: 2800,
      });
    };
    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = committedTranscript;
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0]?.transcript || "";
        if (event.results[index].isFinal) finalTranscript += transcript;
        else interimTranscript += transcript;
      }

      setInputValue(() => {
        const needsSpace = baseBefore.length > 0 && !/\s$/.test(baseBefore);
        const spokenText = `${needsSpace ? " " : ""}${finalTranscript}${interimTranscript}`;
        const nextValue = `${baseBefore}${spokenText}${baseAfter}`;
        requestAnimationFrame(() => {
          const nextTextarea = textareaRef.current;
          const nextPosition = baseBefore.length + spokenText.length;
          nextTextarea?.focus();
          nextTextarea?.setSelectionRange(nextPosition, nextPosition);
        });
        return nextValue;
      });
      committedTranscript = finalTranscript;
    };
    recognition.onerror = (event: any) => {
      if (event.error !== "aborted") {
        setVoiceStatus("Microphone access was unavailable.");
        showHarmonyToast({
          title: "Microphone error",
          description: event.error === "not-allowed"
            ? "Allow microphone access in your browser, then try again."
            : "Speech could not be captured. Please try again.",
          iconType: "sparkles",
        });
      }
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
      setVoiceStatus(null);
      recognitionRef.current = null;
      if (committedTranscript.trim()) {
        showHarmonyToast({
          title: "Text added",
          description: "Your spoken words were added to the message box.",
          iconType: "check",
          duration: 2600,
        });
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (error) {
      recognitionRef.current = null;
      setIsListening(false);
      setVoiceStatus("Could not start the microphone.");
      showHarmonyToast({
        title: "Could not start microphone",
        description: "Check your microphone permission and try again.",
        iconType: "sparkles",
      });
      console.error("Failed to start speech recognition:", error);
    }
  }, [inputValue, isListening, messageLanguage]);
  const parsedInput = useMemo(() => parseSlashPresets(inputValue), [inputValue]);
  const activePresetLabels = useMemo(
    () => getSlashPresetLabels(parsedInput.presets),
    [parsedInput.presets]
  );
  const slashQuery = useMemo(() => {
    const match = inputValue.match(/(?:^|\s)\/([a-z][\w-]*)?$/i);
    return match ? (match[1] ?? "").toLowerCase() : null;
  }, [inputValue]);
  const getSlashOptions = useCallback((query: string | null) => {
    if (query === null) {
      return [];
    }

    return SLASH_PRESETS
      .filter((preset) => {
        if (!query) {
          return true;
        }

        return (
          preset.label.toLowerCase().includes(query) ||
          preset.aliases.some((alias) => alias.toLowerCase().includes(query))
        );
      })
      .map((preset) => ({
        id: preset.id,
        label: preset.label,
        command: `/${preset.aliases[0]}`,
        description: preset.instruction,
      }));
  }, []);
  const getSlashOptionsFromText = useCallback((text: string) => {
    const match = text.match(/(?:^|\s)\/([a-z][\w-]*)?$/i);
    const query = match ? (match[1] ?? "").toLowerCase() : null;
    return getSlashOptions(query);
  }, [getSlashOptions]);
  const slashOptions = useMemo(() => getSlashOptions(slashQuery), [getSlashOptions, slashQuery]);
  const allSlashOptions = useMemo(() => getSlashOptions(""), [getSlashOptions]);
  const visibleSlashOptions = showSlashCommands ? allSlashOptions : slashOptions;
  const slashCompletionSuffix = useMemo(() => {
    if (slashQuery === null || slashOptions.length === 0) {
      return "";
    }

    const fullCommand = slashOptions[0].command.slice(1);

    if (!fullCommand.toLowerCase().startsWith(slashQuery)) {
      return "";
    }

    return fullCommand.slice(slashQuery.length);
  }, [slashOptions, slashQuery]);

  const scrollToBottom = useCallback((behavior: 'auto' | 'smooth' = 'smooth') => {
    const endElement = messagesEndRef.current;
    const viewport = endElement?.closest('[data-slot="scroll-area-viewport"]') as HTMLElement | null;

    if (viewport) {
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior,
      });
    } else {
      endElement?.scrollIntoView({ behavior });
    }
  }, []);

  const scheduleScrollToBottom = useCallback((behavior: 'auto' | 'smooth' = 'smooth') => {
    requestAnimationFrame(() => {
      scrollToBottom(behavior);
      setTimeout(() => scrollToBottom(behavior), 100);
      setTimeout(() => scrollToBottom(behavior), 300);
    });
  }, [scrollToBottom]);

  const scrollToMessage = (messageId: string) => {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(messageId);
      // Remove highlight after 2 seconds
      setTimeout(() => setHighlightedMessageId(null), 2000);
    }
  };

  // Reset scroll state when chat changes
  useEffect(() => {
    if (currentDate !== lastChatDate) {
      setHasInitiallyScrolled(false);
      setLastChatDate(currentDate);
    }
  }, [currentDate, lastChatDate]);

  // Only scroll when messages change, but instantly for initial load
  useEffect(() => {
    if (messages.length > 0) {
      if (!hasInitiallyScrolled) {
        // First load - scroll instantly to bottom
        scheduleScrollToBottom('auto');
        setHasInitiallyScrolled(true);
      } else {
        // Subsequent messages - smooth scroll
        scheduleScrollToBottom('smooth');
      }
    }
  }, [messages, hasInitiallyScrolled, scheduleScrollToBottom]);

  const handleSendMessage = useCallback(async () => {
    if (isSending) return;

    if (!user) {
      setShowGuestSignInModal(true);
      return;
    }

    const rawContent = inputValue.trim();
    const messageContent = parsedInput.cleanContent.trim();

    if (!messageContent) return;

    setInputValue("");
    setLanguageMenuOpen(false);
    
    await sendMessage(rawContent, { language: messageLanguage });
  }, [isSending, inputValue, messageLanguage, parsedInput, sendMessage]);

  const insertSlashCommand = useCallback((command: string) => {
    const textarea = textareaRef.current;
    const selectionStart = textarea?.selectionStart ?? inputValue.length;
    const selectionEnd = textarea?.selectionEnd ?? selectionStart;
    let nextCursorPosition = selectionStart;

    setInputValue((current) => {
      const commandToken = command.endsWith(" ") ? command : `${command} `;
      const safeStart = Math.min(selectionStart, current.length);
      const safeEnd = Math.min(Math.max(selectionEnd, safeStart), current.length);
      const beforeSelection = current.slice(0, safeStart);
      const slashTokenMatch = beforeSelection.match(/(?:^|\s)\/([a-z][\w-]*)?$/i);

      if (slashTokenMatch?.index !== undefined) {
        const tokenPrefix = beforeSelection.slice(0, slashTokenMatch.index);
        const spacing = tokenPrefix.trim().length > 0 ? " " : "";
        const replacement = `${tokenPrefix}${spacing}${commandToken}`;
        const nextValue = `${replacement}${current.slice(safeEnd)}`;
        nextCursorPosition = replacement.length;
        return nextValue;
      }

      const prefix = beforeSelection.length > 0 && !/\s$/.test(beforeSelection) ? `${beforeSelection} ` : beforeSelection;
      const nextValue = `${prefix}${commandToken}${current.slice(safeEnd)}`;
      nextCursorPosition = prefix.length + commandToken.length;
      return nextValue;
    });

    setShowSlashCommands(false);
    requestAnimationFrame(() => {
      const nextTextarea = textareaRef.current;
      nextTextarea?.focus();
      nextTextarea?.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
  }, [inputValue]);

  const openSlashCommands = useCallback(() => {
    const textarea = textareaRef.current;
    const selectionStart = textarea?.selectionStart ?? inputValue.length;
    const selectionEnd = textarea?.selectionEnd ?? selectionStart;
    let nextCursorPosition = selectionStart + 1;

    setInputValue((current) => {
      const safeStart = Math.min(selectionStart, current.length);
      const safeEnd = Math.min(Math.max(selectionEnd, safeStart), current.length);
      const beforeSelection = current.slice(0, safeStart);
      const needsSpace = beforeSelection.length > 0 && !/\s$/.test(beforeSelection);
      const prefix = needsSpace ? `${beforeSelection} ` : beforeSelection;
      nextCursorPosition = prefix.length + 1;
      return `${prefix}/${current.slice(safeEnd)}`;
    });

    setShowSlashCommands(true);
    requestAnimationFrame(() => {
      const nextTextarea = textareaRef.current;
      nextTextarea?.focus();
      nextTextarea?.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
  }, [inputValue]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      const currentSlashOptions = getSlashOptionsFromText(e.currentTarget.value);

      if (currentSlashOptions.length === 0) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      insertSlashCommand(currentSlashOptions[0].command);
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isListening) {
        recognitionRef.current?.stop();
        setIsListening(false);
        setVoiceStatus(null);
        showHarmonyToast({
          title: "Speech input stopped",
          description: "Sending the text captured so far.",
          iconType: "sparkles",
          duration: 2200,
        });
      }
      handleSendMessage();
    }
  }, [getSlashOptionsFromText, handleSendMessage, insertSlashCommand, isListening]);

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.currentTarget.value;
    setInputValue((currentValue) => (
      currentValue === newValue ? currentValue : newValue
    ));
  }, []);

  const handleUserMessageClick = (messageId: string, content: string) => {
    if (isSending) return; // Don't allow editing while sending
    
    setEditingMessageId(messageId);
    setEditingContent(content);
  };

  const handleEditCancel = () => {
    setEditingMessageId(null);
    setEditingContent("");
  };

  return (
    <ScrollArea className="flex-1 [&>div>div]:h-full w-full shadow-md md:rounded-s-[inherit] min-[1024px]:rounded-e-3xl bg-background">
      <div className="h-full flex flex-col px-4 md:px-6 lg:px-8">
        {/* Header */}
        <div className="py-5 bg-background sticky top-0 z-10 before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-gradient-to-r before:from-black/[0.06] before:via-black/10 before:to-black/[0.06]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <SidebarToggle />
              <Breadcrumb>
                <BreadcrumbList className="sm:gap-1.5">
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/">Harmony</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Journal</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="flex items-center gap-1 -my-2 -me-2">
              <Button 
                variant="ghost" 
                className="px-2 cursor-pointer transition-colors"
                onClick={handleShare}
                title="Share Harmony Journal"
              >
                {copiedShare ? (
                  <>
                    <RiCheckLine className="text-emerald-500 size-5" size={20} />
                    <span className="text-emerald-500 text-xs font-medium max-sm:sr-only">Copied!</span>
                  </>
                ) : (
                  <>
                    <RiShareLine
                      className="text-muted-foreground sm:text-muted-foreground/70 size-5"
                      size={20}
                      aria-hidden="true"
                    />
                    <span className="max-sm:sr-only">Share</span>
                  </>
                )}
              </Button>
              <SettingsPanelTrigger />
            </div>
          </div>
        </div>
        {/* Chat */}
        <div className="relative grow">
          <div className="max-w-3xl mx-auto mt-6 space-y-6">
            <div className="text-center my-8">
              <div className="inline-flex items-center bg-white rounded-full border border-black/[0.08] shadow-xs text-xs font-medium py-1 px-3 text-foreground/80 dark:bg-sidebar dark:border-white/[0.08] dark:text-foreground/70">
                <RiShining2Line
                  className="me-1.5 text-muted-foreground/70 -ms-1"
                  size={14}
                  aria-hidden="true"
                />
                {journalBadgeText}
                {!user && (
                  <span className="ms-1.5 text-[11px] font-normal text-amber-500/90 dark:text-amber-400/90">
                    (Sample Data)
                  </span>
                )}
              </div>
            </div>
            
            {messages.map((message) => (
              <div key={message.id} data-message-id={message.id}>
                <ChatMessage 
                  isUser={message.isUser} 
                  userProfileImage={message.isUser ? userAvatarUrl : aiAvatarUrl}
                  messageId={message.id}
                  messageContent={message.content}
                  messageTimestamp={message.timestamp}
                  language={message.language}
                  slashPresets={message.slashPresets}
                  attachedReplies={message.attachedReplies}
                  onUserMessageClick={handleUserMessageClick}
                  isSelected={false}
                  isHighlighted={highlightedMessageId === message.id}
                  isEditing={editingMessageId === message.id}
                  onEdit={async (messageId: string, newContent: string) => {
                    await editMessage(messageId, newContent);
                    setEditingMessageId(null);
                    setEditingContent("");
                  }}
                  onCancelEdit={handleEditCancel}
                >
                  {/* For AI messages, render with WordByWordMessage */}
                  {!message.isUser && <WordByWordMessage content={message.content} messageTimestamp={message.timestamp} />}
                </ChatMessage>
              </div>
            ))}
            
            {isLoading && (
              <div className="transition-opacity duration-300 ease-out">
                <ChatMessage isUser={false} userProfileImage={aiAvatarUrl}>
                  <div className="space-y-2.5 w-72 py-1">
                    <div className="relative overflow-hidden h-4 w-full bg-muted/40 rounded-lg">
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                    </div>
                    <div className="relative overflow-hidden h-4 w-4/5 bg-muted/30 rounded-lg">
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                    </div>
                    <div className="relative overflow-hidden h-4 w-3/5 bg-muted/20 rounded-lg">
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                    </div>
                  </div>
                </ChatMessage>
              </div>
            )}
            
            {isThinking && !isLoading && (
              <div className="transition-opacity duration-300 ease-out">
                <ChatMessage isUser={false} userProfileImage={aiAvatarUrl}>
                  <div className="inline-flex items-center gap-1.5 py-1.5 px-1">
                    <span className="size-2 rounded-full bg-primary/80 animate-bounce [animation-delay:-0.3s]" />
                    <span className="size-2 rounded-full bg-primary/80 animate-bounce [animation-delay:-0.15s]" />
                    <span className="size-2 rounded-full bg-primary/80 animate-bounce" />
                  </div>
                </ChatMessage>
              </div>
            )}
            
            <div ref={messagesEndRef} aria-hidden="true" />
          </div>
        </div>
        {/* Footer */}
        <div className="sticky bottom-0 pt-4 md:pt-8 z-50">
          <div className="max-w-3xl mx-auto bg-background rounded-[20px] pb-4 md:pb-8">
            {/* Reply tabs - attached to top border of form */}
            {replyContext.length > 0 && (
              <div className="flex gap-1 mb-2 px-2">
                {replyContext.map((reply, index) => (
                  <div 
                    key={reply.messageId}
                    className="group flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-t-lg border-t border-l border-r border-blue-200 dark:border-blue-800 text-sm cursor-pointer hover:bg-blue-150 dark:hover:bg-blue-900/50"
                    onClick={() => scrollToMessage(reply.messageId)}
                  >
                    <span className="truncate max-w-32">
                      {reply.content.length > 30 ? reply.content.substring(0, 30) + '...' : reply.content}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeReplyContext(reply.messageId);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full p-1 transition-opacity"
                    >
                      <RiCloseLine className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="relative rounded-[20px] border border-border/80 bg-sidebar/80 dark:bg-card/80 backdrop-blur-md shadow-sm focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 [&:has(input:is(:disabled))_*]:pointer-events-none">
              {(showSlashCommands || slashOptions.length > 0) && (
                <div id="response-commands" className="border-b border-border/60 px-3 pb-3 pt-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <RiCodeSSlashLine className="size-4 shrink-0 text-primary" size={16} aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground">Response commands</p>
                        <p className="truncate text-[11px] text-muted-foreground">Choose a style, format, or search mode</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSlashCommands(false)}
                      className="rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      aria-label="Close response commands"
                    >
                      Close
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
                  {visibleSlashOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => insertSlashCommand(option.command)}
                      disabled={isSending || editingMessageId !== null}
                      title={option.description}
                      className="flex min-w-0 flex-col items-start rounded-lg border border-border/70 bg-background/40 px-2.5 py-2 text-left transition-colors hover:border-primary/50 hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
                    >
                      <span className="w-full truncate text-xs font-semibold text-foreground">{option.command}</span>
                      <span className="mt-0.5 w-full truncate text-[10px] text-muted-foreground">{option.label}</span>
                    </button>
                  ))}
                  </div>
                  {activePresetLabels.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Active</span>
                      {activePresetLabels.map((label) => (
                        <span key={label} className="rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="relative">
                {slashCompletionSuffix && (
                  <div className="pointer-events-none absolute inset-0 whitespace-pre-wrap break-words px-4 py-3 text-[15px] leading-relaxed text-transparent">
                    {inputValue}
                    <span className="text-muted-foreground/35">{slashCompletionSuffix}</span>
                  </div>
                )}
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={handleTextareaChange}
                  onKeyDownCapture={handleKeyPress}
                  disabled={isSending || editingMessageId !== null}
                  className="relative z-10 flex sm:min-h-[84px] w-full bg-transparent px-4 py-3 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none [resize:none]"
                  placeholder={editingMessageId ? "Finish editing the message above..." : "Ask me anything..."}
                  aria-label="Enter your prompt"
                />
              </div>
              {/* Textarea buttons */}
              <div className="flex items-center justify-between gap-2 p-3">
                {/* Left buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={openSlashCommands}
                    disabled={isSending || editingMessageId !== null}
                    className={`flex h-8 items-center gap-2 rounded-md border px-2.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${showSlashCommands ? "border-primary/50 bg-primary/10 text-foreground" : "border-border/70 bg-background/40 text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground"}`}
                    aria-expanded={showSlashCommands}
                    aria-controls="response-commands"
                    title="Show response commands"
                  >
                    <RiCodeSSlashLine className="size-4" aria-hidden="true" />
                    <span>Commands</span>
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setLanguageMenuOpen((open) => !open)}
                      disabled={isSending || editingMessageId !== null}
                      className="flex h-8 items-center gap-2 rounded-md border border-border/70 bg-background/40 px-2.5 text-xs font-medium text-foreground transition-colors hover:border-border hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
                      aria-expanded={languageMenuOpen}
                      aria-haspopup="listbox"
                    >
                      <span className="grid size-5 place-items-center rounded border border-border/70 text-[10px] text-muted-foreground" aria-hidden="true">
                        Aa
                      </span>
                      <span>Reply to me in {selectedLanguage.label}</span>
                    </button>
                    {languageMenuOpen && (
                      <div
                        className="absolute bottom-10 left-0 z-50 w-48 overflow-hidden rounded-lg border border-border/80 bg-background p-1 shadow-xl"
                        role="listbox"
                      >
                        {languageOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setMessageLanguage(option.value);
                              updateLanguage(option.value);
                              setLanguageMenuOpen(false);
                              requestAnimationFrame(() => textareaRef.current?.focus());
                            }}
                            className={`flex w-full items-center rounded-md bg-opacity-0 px-3 py-2 text-left text-xs transition-colors hover:bg-accent hover:text-foreground ${
                              option.value === messageLanguage
                                ? "bg-accent text-foreground font-medium"
                                : "text-muted-foreground"
                            }`}
                            role="option"
                            aria-selected={option.value === messageLanguage}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {/* Right buttons */}
                <div className="flex items-center gap-2">
                  {voiceStatus && (
                    <span className={`hidden text-[11px] sm:inline ${isListening ? "text-red-400" : "text-muted-foreground"}`}>
                      {voiceStatus}
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={toggleSpeechToText}
                    disabled={isSending || editingMessageId !== null}
                    className={`relative rounded-full size-8 border-none transition-[box-shadow,background-color,color] hover:bg-background hover:shadow-md ${isListening ? "bg-red-500/15 text-red-400" : "text-muted-foreground"}`}
                    aria-label={isListening ? "Stop speech to text" : "Start speech to text"}
                    title={isListening ? "Stop speech to text" : "Speak to type"}
                  >
                    {isListening && <span className="absolute inset-0 rounded-full border border-red-400/60 animate-ping" aria-hidden="true" />}
                    {isListening ? <RiMicOffLine className="relative size-4" /> : <RiMicLine className="relative size-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full size-8 border-none hover:bg-background hover:shadow-md transition-[box-shadow]"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="none"
                    >
                      <g clipPath="url(#icon-a)">
                        <path
                          fill="url(#icon-b)"
                          d="m8 .333 2.667 5 5 2.667-5 2.667-2.667 5-2.667-5L.333 8l5-2.667L8 .333Z"
                        />
                        <path
                          stroke="#451A03"
                          strokeOpacity=".04"
                          d="m8 1.396 2.225 4.173.072.134.134.071L14.604 8l-4.173 2.226-.134.071-.072.134L8 14.604l-2.226-4.173-.071-.134-.134-.072L1.396 8l4.173-2.226.134-.071.071-.134L8 1.396Z"
                        />
                      </g>
                      <defs>
                        <linearGradient
                          id="icon-b"
                          x1="8"
                          x2="8"
                          y1=".333"
                          y2="15.667"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#FDE68A" />
                          <stop offset="1" stopColor="#F59E0B" />
                        </linearGradient>
                        <clipPath id="icon-a">
                          <path fill="#fff" d="M0 0h16v16H0z" />
                        </clipPath>
                      </defs>
                    </svg>
                    <span className="sr-only">Generate</span>
                  </Button>
                  <Button 
                    className="rounded-full h-8 px-4 transition-all disabled:opacity-40 disabled:bg-muted disabled:text-muted-foreground/60 disabled:border-transparent disabled:shadow-none"
                    onClick={handleSendMessage}
                    disabled={!parsedInput.cleanContent.trim() || isSending || editingMessageId !== null}
                  >
                    {isSending ? "Sending..." : "Ask Harmony"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={showGuestSignInModal} onOpenChange={setShowGuestSignInModal}>
        <AlertDialogContent className="max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RiShining2Line className="size-5 text-amber-500" />
              Sign In to Chat with Harmony AI
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground pt-2">
              Sample mode is a read-only showcase preview demonstrating interactive progress charts, Markdown tables, and Hinglish reflections. Sign in with Google to start your personal AI journal!
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
              Sign In to Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ScrollArea>
  );
}
