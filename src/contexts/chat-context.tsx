"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuthContext } from '@/contexts/auth-context';
import { useSettings, type UserSettings } from '@/contexts/settings-context';
import { getChatOwnerId, getHarmonyAvatarUrl, getUserAvatarUrl } from '@/lib/local-user';
import { 
  saveChatMessage, 
  getChatMessages, 
  subscribeToChatMessages,
  deleteChatMessage,
  createChatSession,
  ensureChatSession,
  hasExistingChats,
  getChatHistory,
  updateChatMetadata,
  updateChatTitle,
  saveTodoItem,
  saveCalendarEvent,
  getCalendarEvents,
  getTodoItems,
  saveJournalDataLog,
  getJournalDataLog,
  getAllJournalDataLogs,
  appendJournalPointsToHistory,
  updateCalendarEvent,
  ChatMessage as FirebaseChatMessage 
} from '@/lib/firebase-service';
import { initializeUserChat } from '@/lib/chat-utils';
import { groqService } from '@/lib/gemini-service';
import { getSlashPreset, parseSlashPresets, type SlashPresetId } from '@/lib/chat-presets';
import { showHarmonyToast } from '@/components/progress-toast';

export interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  userProfileImage?: string;
  language?: UserSettings['language'];
  slashPresets?: SlashPresetId[];
  attachedReplies?: ReplyContext[];
}

export interface ReplyContext {
  messageId: string;
  content: string;
  timestamp: Date;
}

interface ChatContextType {
  messages: ChatMessage[];
  sendMessage: (content: string, options?: SendMessageOptions) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  regenerateMessage: (messageId: string) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  loadMessagesForDate: (date: string) => Promise<void>;
  createNewChat: (targetDate?: string) => Promise<void>;
  clearAllChats: () => void;
  currentDate: string;
  isLoading: boolean;
  isSending: boolean;
  replyContext: ReplyContext[];
  addReplyContext: (messageId: string, content: string, timestamp: Date) => void;
  removeReplyContext: (messageId: string) => void;
  clearReplyContext: () => void;
  isThinking: boolean;
  onHistoryUpdate?: () => void;
}

type SendMessageOptions = {
  language?: UserSettings['language'];
};

type SearchResponse = {
  query: string;
  source: 'google' | 'wikipedia';
  results: {
    title: string;
    url: string;
    snippet: string;
  }[];
};

type SearchSource = {
  index: number;
  title: string;
  url: string;
  snippet: string;
  source: SearchResponse['source'];
};

type SearchContext = {
  evidence: string;
  sources: SearchSource[];
};

const birthdayMonths: Record<string, string> = {
  january: '01', jan: '01', february: '02', feb: '02', march: '03', mar: '03',
  april: '04', apr: '04', may: '05', june: '06', jun: '06', july: '07', jul: '07',
  august: '08', aug: '08', september: '09', sep: '09', sept: '09', october: '10',
  oct: '10', november: '11', nov: '11', december: '12', dec: '12',
};

const getBirthdayCorrection = (text: string) => {
  if (!/\b(my|mera|mere)\s+birthday\b|\bbirthday\b/i.test(text)) return null;
  if (!/\b(change|changed|correct|corrected|actually|instead|not|rather|update|updated|hai)\b/i.test(text)) return null;

  const match = text.match(/\b(\d{1,2})\s+(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\b/i);
  if (!match) return null;

  const day = Number(match[1]);
  const month = birthdayMonths[match[2].toLowerCase()];
  if (!month || day < 1 || day > 31) return null;

  const year = new Date().getFullYear();
  return `${year}-${month}-${String(day).padStart(2, '0')}`;
};

const syncCorrectedBirthday = async (userId: string, message: string) => {
  const correctedDate = getBirthdayCorrection(message);
  if (!correctedDate) return false;

  const events = await getCalendarEvents(userId);
  const personalBirthdayEvents = events.filter((event) => {
    const searchable = `${event.title} ${event.description || ''}`.toLowerCase();
    return searchable.includes('birthday') &&
      (searchable.includes('my') || searchable.includes('me') || searchable.includes('personal'));
  });

  if (personalBirthdayEvents.length === 0) return false;

  await Promise.all(personalBirthdayEvents.map((event) => {
    const timePart = event.start.includes('T') ? event.start.slice(10) : '';
    const endTimePart = event.end.includes('T') ? event.end.slice(10) : '';
    return updateCalendarEvent(userId, event.id, {
      start: `${correctedDate}${timePart}`,
      end: `${correctedDate}${endTimePart}`,
      allDay: event.allDay ?? !timePart,
    });
  }));

  return true;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children, onHistoryUpdate }: { 
  children: React.ReactNode; 
  onHistoryUpdate?: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isThinking, setIsThinking] = useState(false); // Separate thinking state for smoother transitions
  const [replyContext, setReplyContext] = useState<ReplyContext[]>([]);
  const [currentDate, setCurrentDate] = useState<string>(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('harmony-active-journal-date');
      if (stored && stored === todayStr) return stored;
    }
    return todayStr;
  });

  useEffect(() => {
    // Wait for the initial restore so a previous chat is not replaced by today's date.
    if (typeof window !== 'undefined' && currentDate && hasHydratedJournalDateRef.current) {
      localStorage.setItem('harmony-active-journal-date', currentDate);
    }
  }, [currentDate]);
  const [dataSessionMemory, setDataSessionMemory] = useState<string[]>([]); // Store important data snippets
  const { user, loading: authLoading } = useAuthContext();
  const chatOwnerId = getChatOwnerId(user);
  const userAvatarUrl = getUserAvatarUrl(user);
  const aiAvatarUrl = getHarmonyAvatarUrl(currentDate);
  const { getSystemPromptForMessage, settings } = useSettings();
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isInitializedRef = useRef(false);
  const hasHydratedJournalDateRef = useRef(false);
  const currentSubscriptionDateRef = useRef<string>('');
  const currentSubscriptionOwnerIdRef = useRef<string>('');
  const historyUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSendingRef = useRef(false);
  const sendingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced history update to prevent multiple rapid calls
  const debouncedHistoryUpdate = React.useCallback(() => {
    if (!onHistoryUpdate || isSendingRef.current) return; // Don't update while sending
    
    // Clear any existing timeout
    if (historyUpdateTimeoutRef.current) {
      clearTimeout(historyUpdateTimeoutRef.current);
    }
    
    // Set a new timeout
    historyUpdateTimeoutRef.current = setTimeout(() => {
      if (!isSendingRef.current) { // Double check we're not sending
        onHistoryUpdate();
      }
    }, 500); // Increased debounce to 500ms for better stability
  }, [onHistoryUpdate]);

  // Convert Firebase message data to component format
  const convertFromFirebase = (firebaseMessages: FirebaseChatMessage[]): ChatMessage[] => {
    return firebaseMessages.map(message => ({
      ...message,
      timestamp: new Date(message.timestamp),
      attachedReplies: message.attachedReplies?.map(reply => ({
        ...reply,
        timestamp: new Date(reply.timestamp),
      })),
      slashPresets: message.slashPresets as SlashPresetId[] | undefined,
    }));
  };

  // Convert component message to Firebase format
  const convertToFirebase = (message: Omit<ChatMessage, 'id' | 'timestamp'>): Omit<FirebaseChatMessage, 'id'> => {
    const converted: Omit<FirebaseChatMessage, 'id'> = {
      content: message.content,
      isUser: message.isUser,
      timestamp: Date.now(),
    };

    if (message.userProfileImage) {
      converted.userProfileImage = message.userProfileImage;
    }

    if (message.language) {
      converted.language = message.language;
    }

    if (message.slashPresets && message.slashPresets.length > 0) {
      converted.slashPresets = message.slashPresets;
    }

    if (message.attachedReplies && message.attachedReplies.length > 0) {
      converted.attachedReplies = message.attachedReplies.map(reply => ({
        ...reply,
        timestamp: reply.timestamp.getTime(),
      }));
    }

    return converted;
  };

  const createOptimisticMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage => ({
    ...message,
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date(),
  });

  const processActionItemsFromUserMessage = async (userId: string, text: string, aiText?: string) => {
    try {
      const userLower = text.toLowerCase().trim();
      const aiLower = (aiText || '').toLowerCase().trim();

      // Check if user is asking a purely informational lookup question (not creating anything)
      const isQueryOrQuestion = /^(what|whats|what's|show|list|check|do i|are there|tell me|get|view|how)\b/i.test(userLower) && !/\b(add|set|create|bana|karna|karvane|likh|remind)\b/i.test(userLower);
      if (isQueryOrQuestion) {
        return;
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const tomDate = new Date();
      tomDate.setDate(tomDate.getDate() + 1);
      const tomorrowStr = tomDate.toISOString().split('T')[0];

      // Determine Due Date
      let targetDueDate = todayStr;
      if (/\b(kal|tomorrow|next day)\b/i.test(userLower)) {
        targetDueDate = tomorrowStr;
      }

      // 1. Comprehensive Multilingual Todo Creation Intent
      const hasTodoKeyword = /\b(todo|to-do|task|remind|reminder|khareedna|kareedna|karvane|service|buy|purchase|jana hai|karna hai|bana do|likh do|note down|yaad rakhna)\b/i.test(userLower);
      const isExplicitTodoCreation = /\b(set (a )?todo|add (a )?todo|create (a )?todo|add todo|create todo|todo add|todo create|todo bana|ek todo|remind me|remind kar|task add|task create|task bana)\b/i.test(userLower);
      const aiConfirmedTodo = /\b(todo add kar diya|added to (your )?todo|task (has been )?added|created todo|created task)\b/i.test(aiLower);

      if (isExplicitTodoCreation || (hasTodoKeyword && /\b(add|set|create|bana|jana hai|karna hai)\b/i.test(userLower)) || aiConfirmedTodo) {
        // Clean Title
        let cleanTitle = text
          .replace(/^(hello|hi|hey|bhai|yrr|yar|dost),?\s*/i, '')
          .replace(/^(ek\s+)?todo\s+(add|set|create|bana)\s+(karna|kar\s+do|kar)?\s*,?\s*/i, '')
          .replace(/^(can\s+u\s+)?(please\s+)?(add|set|create)\s+(a\s+)?todo\s+(to|for)?\s*,?\s*/i, '')
          .replace(/^(add|set|create)\s+(a\s+)?todo\s+(to|for)?\s*,?\s*/i, '')
          .replace(/^(remind\s+me\s+to|remind\s+kar\s+dena\s+ki)\s*/i, '')
          .replace(/^mujhe\s+/i, '')
          .trim();

        // If AI confirmed a quoted task, use that as clean title if better
        const quotedMatch = aiText?.match(/["'“]([^"'“”]{4,80})["'”]/);
        if (quotedMatch && quotedMatch[1]) {
          cleanTitle = quotedMatch[1].replace(/^(aaj|kal|today|tomorrow)\s*/i, '').trim();
        }

        if (!cleanTitle || cleanTitle.length < 3) {
          cleanTitle = text;
        }

        cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);

        await saveTodoItem(userId, {
          title: cleanTitle,
          completed: false,
          dueDate: targetDueDate,
          category: 'Personal',
          priority: 'medium',
        });

        showHarmonyToast({
          title: "Todo Task Added",
          description: `"${cleanTitle}" saved to your Todo list`,
          iconType: "todo",
        });

        console.log('Successfully saved todo item:', cleanTitle, targetDueDate);
      }

      // 2. Automatic Daily Log Highlight Extraction
      const hasPersonalActivity = /\b(car ki service|service|maths|exam|test|score|marks|birthday|went to|bought|completed|started|studied|visited|jana hai|karvane|reached)\b/i.test(userLower);
      if (hasPersonalActivity || isExplicitTodoCreation) {
        let highlightText = text
          .replace(/^(hello|hi|hey|bhai|yrr|yar|dost),?\s*/i, '')
          .replace(/^(ek\s+)?todo\s+(add|set|create|bana)\s+(karna|kar\s+do|kar)?\s*,?\s*/i, '')
          .replace(/^(can\s+u\s+)?(please\s+)?(add|set|create)\s+(a\s+)?todo\s+(to|for)?\s*,?\s*/i, '')
          .trim();

        if (highlightText.length >= 4) {
          highlightText = highlightText.charAt(0).toUpperCase() + highlightText.slice(1);
          await saveJournalDataLog(userId, currentDate, [highlightText]);
          await appendJournalPointsToHistory(userId, currentDate, [highlightText]);
          console.log('Successfully saved daily log highlight:', highlightText);
        }
      }

      // 3. Automatic Calendar Event Extraction (with Time Detection)
      const hasTimePattern = /\b(\d{1,2})\s*(bje|baje|pm|am|:\d{2})\b/i.test(userLower);
      const isCalendarCreation = hasTimePattern || /\b(add (a )?calendar event|create (a )?calendar event|schedule (a|an)? (meeting|event|appointment)|add (a|an)? (event|meeting) to calendar|set (a|an)? (meeting|appointment))\b/i.test(userLower);

      if (isCalendarCreation) {
        let startHour = 10;
        const timeMatch = userLower.match(/\b(\d{1,2})\s*(bje|baje|pm|am)?\b/);
        if (timeMatch && timeMatch[1]) {
          let h = parseInt(timeMatch[1], 10);
          if (userLower.includes('pm') || userLower.includes('bje') || userLower.includes('baje')) {
            if (h < 12 && h >= 1) h += 12;
          }
          startHour = h;
        }

        const startHourStr = String(startHour).padStart(2, '0');
        const endHourStr = String((startHour + 1) % 24).padStart(2, '0');
        const startDate = `${targetDueDate}T${startHourStr}:00:00`;
        const endDate = `${targetDueDate}T${endHourStr}:00:00`;

        let calTitle = text
          .replace(/^(hello|hi|hey|bhai|yrr|yar|dost),?\s*/i, '')
          .replace(/^(ek\s+)?todo\s+(add|set|create|bana)\s+(karna|kar\s+do|kar)?\s*,?\s*/i, '')
          .replace(/^mujhe\s+/i, '')
          .trim();

        if (!calTitle || calTitle.length < 3) calTitle = text;
        calTitle = calTitle.charAt(0).toUpperCase() + calTitle.slice(1);

        await saveCalendarEvent(userId, {
          title: calTitle,
          start: startDate,
          end: endDate,
          allDay: false,
          color: '#3b82f6',
        });

        showHarmonyToast({
          title: "Calendar Event Scheduled",
          description: `"${calTitle}" added for ${startHourStr}:00`,
          iconType: "calendar",
        });

        console.log('Successfully saved calendar event:', calTitle, startDate);
      }
    } catch (error) {
      console.error('Failed to auto-process action items:', error);
    }
  };

  const appendOptimisticMessage = (message: ChatMessage) => {
    setMessages(prev => {
      if (prev.some(existing => existing.id === message.id)) {
        return prev;
      }

      return [...prev, message];
    });
  };

  const formatMessageForPrompt = (content: string, slashPresets?: SlashPresetId[]) => {
    if (!slashPresets || slashPresets.length === 0) {
      return content;
    }

    const commands = slashPresets
      .map(preset => getSlashPreset(preset)?.aliases[0])
      .filter((alias): alias is string => Boolean(alias))
      .map(alias => `/${alias}`)
      .join(' ');

    return commands ? `${commands} ${content}` : content;
  };

  const formatSearchContext = (searches: SearchResponse[]): SearchContext => {
    let sourceIndex = 1;
    const sources: SearchSource[] = [];

    const evidence = searches
      .map((search) => {
        const results = search.results
          .slice(0, 5)
          .map((result) => {
            const currentIndex = sourceIndex;
            sourceIndex += 1;
            sources.push({
              index: currentIndex,
              title: result.title || `${search.source} result ${currentIndex}`,
              url: result.url || '',
              snippet: result.snippet || '',
              source: search.source,
            });

            return `Source [${currentIndex}]: ${result.title}\nURL: ${result.url || 'No URL available'}\nSnippet: ${result.snippet}`;
          })
          .join('\n\n');

        return `[${search.source.toUpperCase()} SEARCH]\nQuery: ${search.query}\nResults:\n${results || 'No results found.'}`;
      })
      .join('\n\n');

    return { evidence, sources };
  };

  const getSearchAnswerInstructions = (presets: SlashPresetId[]) => {
    if (!presets.includes('gsearch') && !presets.includes('wikisearch')) {
      return '';
    }

    const tasks = [
      'Use the search evidence above to answer the user directly.',
      'Use inline citation numbers like [1] at the exact claims they support.',
      'Put all source links only at the end under a Sources heading as a numbered markdown list using this exact shape: 1. [Source title](URL).',
      'Do not put raw source URLs in the body.',
      'Do not tell the user to open a search page or search manually.',
      'Honor every slash command together; apply tables, charts, comparisons, algorithms, tone, and language to the searched evidence.',
    ];

    if (presets.includes('tabular')) {
      tasks.push('Include a markdown table built from the searched evidence.');
    }

    if (presets.includes('compare')) {
      tasks.push('Include direct comparison columns in the table when the user asks to compare items.');
    }

    if (presets.includes('graphs')) {
      tasks.push('Include chart-ready JSON in a fenced json code block based on the searched evidence. Use this shape: {"type":"bar","data":[{"name":"label","value":1}],"xKey":"name","yKey":"value","title":"Title"}.');
    }

    if (presets.includes('algorithm')) {
      tasks.push('Use clear step formatting for process or timeline requests.');
    }

    return tasks.join(' ');
  };

  const fetchSearchEvidence = async (content: string, presets: SlashPresetId[]): Promise<SearchContext> => {
    const searches: SearchResponse[] = [];
    const requests: Promise<void>[] = [];

    if (presets.includes('gsearch')) {
      requests.push(
        fetch('/api/search/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content }),
        })
          .then(response => response.json())
          .then((data: SearchResponse) => {
            searches.push(data);
          })
          .catch(error => console.error('Google search command failed:', error)),
      );
    }

    if (presets.includes('wikisearch')) {
      requests.push(
        fetch('/api/search/wiki', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content }),
        })
          .then(response => response.json())
          .then((data: SearchResponse) => {
            searches.push(data);
          })
          .catch(error => console.error('Wikipedia search command failed:', error)),
      );
    }

    await Promise.all(requests);

    return formatSearchContext(searches);
  };

  const formatSourceList = (sources: SearchSource[]) => {
    const linkedSources = sources.filter(source => source.url);

    if (linkedSources.length === 0) {
      return '';
    }

    return `\n\nSources\n${linkedSources
      .map(source => `${source.index}. [${source.title}](${source.url})`)
      .join('\n')}`;
  };

  const ensureSourcesAtEnd = (response: string, sources: SearchSource[]) => {
    const sourceList = formatSourceList(sources);

    if (!sourceList) {
      return response;
    }

    const withoutExistingSources = response.replace(/\n+\s*(#{1,6}\s*)?Sources\s*:?\s*\n[\s\S]*$/i, '').trimEnd();
    const codeFenceCount = withoutExistingSources.match(/```/g)?.length ?? 0;
    const closedResponse = codeFenceCount % 2 === 1
      ? `${withoutExistingSources}\n\`\`\``
      : withoutExistingSources;

    return `${closedResponse}${sourceList}`;
  };

  const applySearchContext = (message: string, searchContext: SearchContext, presets: SlashPresetId[]) => {
    if (!searchContext.evidence) {
      return message;
    }

    return `${searchContext.evidence}\n\n${getSearchAnswerInstructions(presets)}\n\nUser request:\n${message}`;
  };

  // Reply context management functions
  const addReplyContext = (messageId: string, content: string, timestamp: Date) => {
    setReplyContext(prev => {
      // Remove if already exists
      const filtered = prev.filter(ctx => ctx.messageId !== messageId);
      // Add new context, keep only last 3
      const updated = [...filtered, { messageId, content, timestamp }];
      return updated.slice(-3); // Keep only last 3
    });
  };

  const removeReplyContext = (messageId: string) => {
    setReplyContext(prev => prev.filter(ctx => ctx.messageId !== messageId));
  };

  const clearReplyContext = () => {
    setReplyContext([]);
  };

  // Function to clear all chat data from memory
  const clearAllChats = () => {
    setMessages([]);
    setReplyContext([]);
    setCurrentDate(new Date().toISOString().split('T')[0]);
    setIsLoading(false);
    setIsSending(false);
    setIsThinking(false);
  };

  // Single effect to handle both initial load and date changes
  useEffect(() => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }

    const loadMessages = async () => {
      try {
        setIsLoading(true);
        
        let targetDate = currentDate;
        
        // Run initialization logic on first load or when user logs in/out
        if (!isInitializedRef.current || currentSubscriptionOwnerIdRef.current !== chatOwnerId) {
          const storedDate = typeof window !== 'undefined' ? localStorage.getItem('harmony-active-journal-date') : null;
          
          if (storedDate) {
            targetDate = storedDate;
            if (targetDate !== currentDate) {
              setCurrentDate(storedDate);
              setIsLoading(false);
              return;
            }
          } else {
            // For initial load or login change, load the most recent chat if available
            const hasChats = await hasExistingChats(chatOwnerId);
            
            if (hasChats) {
              try {
                const history = await getChatHistory(chatOwnerId);
                if (history.length > 0) {
                  const mostRecentChat = history[0];
                  targetDate = mostRecentChat.date;
                  if (targetDate !== currentDate) {
                    setCurrentDate(mostRecentChat.date);
                    setIsLoading(false);
                    return;
                  }
                }
              } catch (error) {
                console.error('Failed to load chat history:', error);
              }
            } else {
              const today = new Date().toISOString().split('T')[0];
              targetDate = today;
              await initializeUserChat(chatOwnerId, today);
              const title = `Welcome Journal`;
              await createChatSession(chatOwnerId, today, title);
              debouncedHistoryUpdate();
            }
          }
          isInitializedRef.current = true;
        }
        
        // Always set up subscription for the target date (skip only if same date, same owner, and active subscription)
        if (
          currentSubscriptionDateRef.current === targetDate &&
          currentSubscriptionOwnerIdRef.current === chatOwnerId &&
          unsubscribeRef.current !== null
        ) {
          setIsLoading(false);
          return;
        }
        
        // Clean up any existing subscription
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }

        currentSubscriptionDateRef.current = targetDate;
        currentSubscriptionOwnerIdRef.current = chatOwnerId;
        hasHydratedJournalDateRef.current = true;
        
        // Subscribe to real-time updates for the target date
        unsubscribeRef.current = subscribeToChatMessages(chatOwnerId, targetDate, (firebaseMessages) => {
          const convertedMessages = convertFromFirebase(firebaseMessages);
          setMessages(convertedMessages);
          
          // Extract data from new messages for session memory (mathematical mode only)
          if (settings.writingStyle === 'algorithm') {
            const newDataSnippets: string[] = [];
            convertedMessages.forEach(msg => {
              const dataFromMessage = extractDataForSessionMemory(msg.content);
              newDataSnippets.push(...dataFromMessage);
            });
            
            if (newDataSnippets.length > 0) {
              updateDataSessionMemory(newDataSnippets);
            }
          }
          
          setIsLoading(false);
        });
      } catch (error) {
        console.error('Failed to load chat messages:', error);
        setIsLoading(false);
      }
    };

    loadMessages();

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      // Clear any pending history update timeout
      if (historyUpdateTimeoutRef.current) {
        clearTimeout(historyUpdateTimeoutRef.current);
      }
      // Clear any pending sending timeout
      if (sendingTimeoutRef.current) {
        clearTimeout(sendingTimeoutRef.current);
      }
    };
  }, [chatOwnerId, currentDate, authLoading]);

  // Helper function to detect if a message contains mathematical data
  const containsMathematicalData = (content: string): boolean => {
    // Check for JSON code blocks that might contain chart data
    const jsonCodeBlockRegex = /```(?:json|data|chart)?\s*\n?(\[[\s\S]*?\]|\{[\s\S]*?\})\s*```/gi;
    return jsonCodeBlockRegex.test(content);
  };

  // Helper function to extract and store important data for session memory
  const extractDataForSessionMemory = (content: string): string[] => {
    const dataSnippets: string[] = [];
    const jsonCodeBlockRegex = /```(?:json|data|chart)?\s*\n?([\s\S]*?)\s*```/gi;
    let match;
    
    while ((match = jsonCodeBlockRegex.exec(content)) !== null) {
      const jsonContent = match[1].trim();
      // Store the JSON data with a reasonable size limit
      if (jsonContent.length > 0 && jsonContent.length < 2000) {
        dataSnippets.push(jsonContent);
      }
    }
    
    return dataSnippets;
  };

  // Helper function to update data session memory
  const updateDataSessionMemory = (newData: string[]) => {
    if (newData.length > 0 && settings.writingStyle === 'algorithm') {
      setDataSessionMemory(prev => {
        const updated = [...prev, ...newData];
        // Keep only the last 10 data snippets to avoid memory bloat
        return updated.slice(-10);
      });
    }
  };

  // Enhanced helper function to get context messages based on writing style and reply context
  const getRecentMessages = (allMessages: ChatMessage[], writingStyle?: string, includeReplyContext?: boolean): { sender: string; text: string }[] => {
    // If we have reply context and auto mode is NOT selected, only send the reply context messages
    if (includeReplyContext && replyContext.length > 0 && writingStyle !== 'auto') {
      return replyContext.map(ctx => ({ 
        sender: 'user', // Reply context is always from user messages 
        text: ctx.content 
      }));
    }

    // For auto mode, don't include older messages when reply context exists
    if (writingStyle === 'auto' && replyContext.length > 0) {
      // Only send the reply context for auto mode, not the older messages
      return replyContext.map(ctx => ({ 
        sender: 'user', 
        text: ctx.content 
      }));
    }

    // For mathematical mode, preserve more context including data-containing messages
    if (writingStyle === 'algorithm') {
      // Get last 6 messages + any earlier messages with mathematical data
      const lastSixMessages = allMessages.slice(-6);
      const earlierDataMessages = allMessages
        .slice(0, -6)
        .filter(msg => containsMathematicalData(msg.content))
        .slice(-4); // Keep last 4 data messages from earlier conversation
      
      const contextMessages = [...earlierDataMessages, ...lastSixMessages];
      const messageContext = contextMessages.map(msg => ({ 
        sender: msg.isUser ? 'user' : 'ai', 
        text: msg.content 
      }));

      // If we have session memory data and recent messages don't contain enough data context,
      // prepend a summary of important data
      if (dataSessionMemory.length > 0 && earlierDataMessages.length === 0) {
        const dataContext = {
          sender: 'system' as const,
          text: `[Previous Data Context]: Here's important data from earlier in our conversation:\n${dataSessionMemory.slice(-3).map((data, i) => `Data ${i + 1}: \`\`\`json\n${data}\n\`\`\``).join('\n\n')}`
        };
        return [dataContext, ...messageContext];
      }

      return messageContext;
    }
    
    // For other modes, keep the original behavior (last 4 messages)
    const recentMessages = allMessages.slice(-4);
    return recentMessages.map(msg => ({ 
      sender: msg.isUser ? 'user' : 'ai', 
      text: msg.content 
    }));
  };

  // Helper function to format user message with reply context
  const formatMessageWithReplyContext = (content: string, attachedReplies: ReplyContext[] = replyContext): string => {
    if (attachedReplies.length === 0) {
      return content;
    }

    // For mathematical mode, include more data context
    if (settings.writingStyle === 'algorithm') {
      // Find any data-containing messages in reply context
      const dataReplies = attachedReplies.filter(ctx => containsMathematicalData(ctx.content));
      const nonDataReplies = attachedReplies.filter(ctx => !containsMathematicalData(ctx.content));
      
      const replyParts: string[] = [];
      
      // Include data messages with more context (first 500 chars instead of 200)
      if (dataReplies.length > 0) {
        dataReplies.forEach((ctx, index) => {
          replyParts.push(`[Data Reference ${index + 1}]: "${ctx.content.slice(0, 2000)}${ctx.content.length > 2000 ? '...' : ''}"`);
        });
      }
      
      // Include non-data messages with standard context
      if (nonDataReplies.length > 0) {
        nonDataReplies.forEach((ctx, index) => {
          replyParts.push(`[Reply ${index + 1}]: "${ctx.content.slice(0, 1000)}${ctx.content.length > 1000 ? '...' : ''}"`);
        });
      }

      const replyPart = replyParts.join('\n');
      return `${replyPart}\n\n[New Question]: ${content}`;
    }

    // Standard reply context for other modes (not auto)
    const replyPart = attachedReplies
      .map((ctx, index) => `[Attached Reply ${index + 1}]: "${ctx.content.slice(0, 1000)}${ctx.content.length > 1000 ? '...' : ''}"`)
      .join('\n');

    return `${replyPart}\n\n[New Question]: ${content}`;
  };

  const sendMessage = async (content: string, options?: SendMessageOptions) => {
    const parsedInput = parseSlashPresets(content);
    const cleanContent = parsedInput.cleanContent.trim();
    const messageLanguage = options?.language ?? settings.language;

    if (!cleanContent || isSendingRef.current) return;
    if (!user) return;

    const resetSendingState = () => {
      if (sendingTimeoutRef.current) clearTimeout(sendingTimeoutRef.current);
      setIsSending(false);
      isSendingRef.current = false;
      
      // Fade out thinking state with shorter delay for faster UI
      setTimeout(() => {
        setIsThinking(false);
      }, 150);
    };

    const startSendingState = () => {
      setIsSending(true);
      setIsThinking(true);
      isSendingRef.current = true;

      // Safety timeout (prevents stuck "sending" state) - reduced for faster responses
      if (sendingTimeoutRef.current) clearTimeout(sendingTimeoutRef.current);
      sendingTimeoutRef.current = setTimeout(() => {
        console.warn("Force clearing isSending state after timeout");
        resetSendingState();
      }, 10000); // Reduced to 10 seconds
    };

    try {
      startSendingState();

      // Check if this is the first user message in the chat
      const isFirstUserMessage = messages.filter(msg => msg.isUser).length === 0;
      const attachedReplies = [...replyContext];

      // Create user message
      const optimisticUserMessage = createOptimisticMessage({
        content: cleanContent,
        isUser: true,
        userProfileImage: userAvatarUrl,
        language: messageLanguage,
        slashPresets: parsedInput.presets,
        attachedReplies,
      });
      appendOptimisticMessage(optimisticUserMessage);

      const userMessage = convertToFirebase(optimisticUserMessage);

      await saveChatMessage(chatOwnerId, userMessage, currentDate);

      // Get AI response immediately (no setTimeout delay)
      try {
        // Get AI response with enhanced chat history for mathematical mode and user settings
        const recentMessages = getRecentMessages(messages, settings.writingStyle, true);
        const messageWithContext = formatMessageWithReplyContext(cleanContent, attachedReplies);
        const searchEvidence = await fetchSearchEvidence(cleanContent, parsedInput.presets);
        const messageWithSearchContext = applySearchContext(messageWithContext, searchEvidence, parsedInput.presets);

        // Only fetch cross-day data logs if the user explicitly asks to check/search past date data
        const isRequestingPastData = /\b(what did i|what happened|check (my )?(past|previous|history|data|log)|search (my )?(past|log)|on (january|february|march|april|may|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{4}-\d{2}-\d{2}|yesterday|last week|past date))\b/i.test(cleanContent);

        let logContext = '';
        if (isRequestingPastData) {
          const allLogs = await getAllJournalDataLogs(chatOwnerId);
          if (allLogs && allLogs.length > 0) {
            logContext = `\n\n[USER JOURNAL DATA LOGS ACROSS DATES (Requested by User)]:\n` + 
              allLogs.map(l => `Date ${l.date}:\n` + l.points.map(p => `- ${p}`).join('\n')).join('\n\n');
          }
        }

        // Always fetch user calendar events & todos from database
        let calendarContext = '';
        try {
          const [calEvents, todoItems] = await Promise.all([
            getCalendarEvents(chatOwnerId),
            getTodoItems(chatOwnerId),
          ]);

          const activeEvents = calEvents.map(e => {
            const startStr = typeof e.start === 'string' ? e.start : (e.start && typeof (e.start as any).toISOString === 'function' ? (e.start as any).toISOString() : String(e.start || ''));
            const dateStr = startStr ? startStr.split('T')[0] : 'scheduled date';
            return `- Event: "${e.title}"${e.description ? ` (${e.description})` : ''} on ${dateStr}${e.location ? ` at ${e.location}` : ''}`;
          });
          const activeTodos = todoItems.map(t => `- Task: "${t.title}" (Due: ${t.dueDate || 'No date'}, Completed: ${t.completed ? 'Yes' : 'No'})`);

          calendarContext = `\n\n[USER CALENDAR EVENTS & TODOS FROM DATABASE]:\n` + 
            (activeEvents.length > 0 ? `Calendar Events:\n${activeEvents.join('\n')}\n` : 'No calendar events found in database.\n') + 
            (activeTodos.length > 0 ? `Todo Items:\n${activeTodos.join('\n')}` : 'No todo items found in database.');
        } catch (err) {
          console.error('Failed to fetch calendar/todo items for AI context:', err);
          calendarContext = `\n\n[USER CALENDAR EVENTS & TODOS FROM DATABASE]:\nNo calendar events found in database.\nNo todo items found in database.`;
        }

        const messageWithLogsAndSearch = messageWithSearchContext + logContext + calendarContext;

        const systemPrompt = await getSystemPromptForMessage(content.trim(), messageLanguage);
        // Append current date/time so AI can correctly resolve "aaj", "kal", "2 bje" etc. into real dates
        const now = new Date();
        const todayLabel = now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const systemPromptWithDate = `${systemPrompt}\n\nCURRENT DATE & TIME: ${currentDate} (${todayLabel}), ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}. Use this when creating todos or events.`;
        const aiResult = await groqService.sendMessage(
          chatOwnerId,
          currentDate,
          messageWithLogsAndSearch,
          recentMessages, // Only send last 4 messages instead of entire chat history
          systemPromptWithDate
        );
        const finalAiResponse = ensureSourcesAtEnd(aiResult.response, searchEvidence.sources);

        // A corrected personal birthday must update the existing calendar record,
        // otherwise the old date remains visible beside the new journal highlight.
        try {
          const birthdayWasUpdated = await syncCorrectedBirthday(chatOwnerId, cleanContent);
          if (birthdayWasUpdated) {
            showHarmonyToast({
              title: "Birthday Updated",
              description: "Your personal birthday event was moved to the corrected date.",
              iconType: "calendar",
            });
          }
        } catch (error) {
          console.error('Failed to sync corrected birthday:', error);
        }

        // Process any returned dataLog actions or userdata reflections
        if (aiResult.userdata && aiResult.userdata.length > 0) {
          try {
            const existingLog = await getJournalDataLog(chatOwnerId, currentDate);
            const currentPoints = existingLog?.points || [];
            const updatedPoints = Array.from(new Set([...currentPoints, ...aiResult.userdata]));
            await saveJournalDataLog(chatOwnerId, currentDate, updatedPoints);
            await appendJournalPointsToHistory(chatOwnerId, currentDate, aiResult.userdata);
          } catch (err) {
            console.error('Failed to save userdata reflections:', err);
          }
        }

        if (aiResult.action?.dataLog?.addPoints && aiResult.action.dataLog.addPoints.length > 0) {
          try {
            const existingLog = await getJournalDataLog(chatOwnerId, currentDate);
            const currentPoints = existingLog?.points || [];
            const updatedPoints = Array.from(new Set([...currentPoints, ...aiResult.action.dataLog.addPoints]));
            await saveJournalDataLog(chatOwnerId, currentDate, updatedPoints);
            await appendJournalPointsToHistory(chatOwnerId, currentDate, aiResult.action.dataLog.addPoints);
            // No toast here — dataLog is silently saved on every reply as a background journal entry
          } catch (err) {
            console.error('Failed to add dataLog points:', err);
          }
        }

        // Process AI calendar events if present
        if (aiResult.action?.events && Array.isArray(aiResult.action.events)) {
          for (const ev of aiResult.action.events) {
            try {
              if (ev.title) {
                const hasTime = ev.start && ev.start.includes('T');
                await saveCalendarEvent(chatOwnerId, {
                  title: ev.title,
                  description: ev.description || 'Saved via Harmony AI',
                  start: ev.start || currentDate,
                  end: ev.end || ev.start || currentDate,
                  allDay: !hasTime,
                });
                showHarmonyToast({
                  title: "Calendar Event Added",
                  description: `"${ev.title}" scheduled on your Calendar`,
                  iconType: "calendar",
                });
              }
            } catch (err) {
              console.error('Failed to save AI calendar action:', err);
            }
          }
        }

        // Process AI todos if present
        if (aiResult.action?.todos && Array.isArray(aiResult.action.todos)) {
          for (const td of aiResult.action.todos) {
            try {
              if (td.title) {
                await saveTodoItem(chatOwnerId, {
                  title: td.title,
                  description: td.description || '',
                  completed: false,
                  dueDate: td.dueDate || currentDate,
                });
                showHarmonyToast({
                  title: "Todo Task Added",
                  description: `"${td.title}" saved to your Todo list`,
                  iconType: "todo",
                });
              }
            } catch (err) {
              console.error('Failed to save AI todo action:', err);
            }
          }
        }

        const optimisticAiMessage = createOptimisticMessage({
          content: finalAiResponse,
          isUser: false,
          userProfileImage: aiAvatarUrl,
        });
        appendOptimisticMessage(optimisticAiMessage);

        const aiMessage = convertToFirebase(optimisticAiMessage);

        // Reset sending state BEFORE saving AI message to prevent double thinking
        resetSendingState();
        
        await saveChatMessage(chatOwnerId, aiMessage, currentDate);

        // Clear reply context after successful message
        if (replyContext.length > 0) {
          clearReplyContext();
        }

        // If this was the first user message, generate a chat title
        if (isFirstUserMessage) {
          try {
            const titleResponse = await fetch('/api/chat/generate-title', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ message: cleanContent }),
            });

            if (titleResponse.ok) {
              const { title } = await titleResponse.json();
              
              // Update the chat title using the proper service function
              await updateChatTitle(chatOwnerId, currentDate, title);
              
              // Trigger history update to refresh the UI with new title
              setTimeout(() => {
                debouncedHistoryUpdate();
              }, 200);
            }
          } catch (error) {
            console.error('Failed to generate chat title:', error);
            // Don't throw, just log the error since the main functionality works
          }
        }
        
        // Update history with a delay to ensure UI has settled
        setTimeout(() => {
          if (!isSendingRef.current) {
            debouncedHistoryUpdate();
          }
        }, 300);
        
      } catch (error) {
        console.error("Failed to send AI response:", error);
        resetSendingState();
      }
      
    } catch (error) {
      console.error("Failed to send message:", error);
      resetSendingState();
    }
  };


  const deleteMessage = async (messageId: string) => {
    try {
      await deleteChatMessage(chatOwnerId, currentDate, messageId);
      showHarmonyToast({
        title: "Message Deleted",
        description: "Message removed from active journal date",
        iconType: "trash",
      });
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const regenerateMessage = async (messageId: string) => {
    if (isSendingRef.current) {
      return;
    }

    const resetSendingState = () => {
      if (sendingTimeoutRef.current) clearTimeout(sendingTimeoutRef.current);
      setIsSending(false);
      isSendingRef.current = false;
      
      // Fade out thinking state with shorter delay for faster UI
      setTimeout(() => {
        setIsThinking(false);
      }, 150);
    };

    const startSendingState = () => {
      setIsSending(true);
      setIsThinking(true);
      isSendingRef.current = true;

      // Safety timeout (prevents stuck "sending" state) - reduced for faster responses
      if (sendingTimeoutRef.current) clearTimeout(sendingTimeoutRef.current);
      sendingTimeoutRef.current = setTimeout(() => {
        console.warn("Force clearing isSending state after timeout");
        resetSendingState();
      }, 10000); // Reduced to 10 seconds
    };

    try {
      startSendingState();

      // Find the message to regenerate and the previous user message
      const messageIndex = messages.findIndex(msg => msg.id === messageId);
      if (messageIndex === -1) {
        resetSendingState();
        return;
      }

      const messageToRegenerate = messages[messageIndex];
      if (messageToRegenerate.isUser) {
        resetSendingState();
        return; // Can't regenerate user messages
      }

      // Find the user message for this AI reply
      let userMessageIndex = -1;
      for (let i = messageIndex - 1; i >= 0; i--) {
        if (messages[i].isUser) {
          userMessageIndex = i;
          break;
        }
      }

      if (userMessageIndex === -1) {
        resetSendingState();
        return;
      }

      const userMessage = messages[userMessageIndex];

      // Delete the target AI message and any duplicate AI replies under this prompt
      const messagesToDelete = messages.slice(userMessageIndex + 1);
      for (const msg of messagesToDelete) {
        await deleteMessage(msg.id);
      }

      // Immediately clear deleted messages from local UI state
      setMessages(prev => prev.filter(m => !messagesToDelete.some(d => d.id === m.id)));

      // Generate new response with the same user input
      try {
        // Get recent messages up to the point we're regenerating with enhanced context for mathematical mode
        const messagesUpToRegeneration = messages.slice(0, messageIndex);
        const recentMessages = getRecentMessages(messagesUpToRegeneration, settings.writingStyle, false);
        const promptMessage = formatMessageForPrompt(userMessage.content, userMessage.slashPresets);
        const systemPrompt = await getSystemPromptForMessage(promptMessage, userMessage.language);
        const searchEvidence = await fetchSearchEvidence(userMessage.content, userMessage.slashPresets ?? []);
        const messageWithSearchContext = applySearchContext(userMessage.content, searchEvidence, userMessage.slashPresets ?? []);
        const aiResponse = await groqService.sendMessage(
          chatOwnerId,
          currentDate,
          messageWithSearchContext,
          recentMessages, // Only send recent messages instead of entire history
          systemPrompt
        );
        const finalAiResponse = ensureSourcesAtEnd(aiResponse, searchEvidence.sources);

        const optimisticAiMessage = createOptimisticMessage({
          content: finalAiResponse,
          isUser: false,
          userProfileImage: aiAvatarUrl,
        });
        appendOptimisticMessage(optimisticAiMessage);

        const aiMessage = convertToFirebase(optimisticAiMessage);

        // Reset sending state BEFORE saving AI message to prevent double thinking
        resetSendingState();

        await saveChatMessage(chatOwnerId, aiMessage, currentDate);
        
        // Update history with a delay to ensure UI has settled
        setTimeout(() => {
          if (!isSendingRef.current) {
            debouncedHistoryUpdate();
          }
        }, 300);

      } catch (error) {
        console.error("Failed to regenerate message:", error);
        resetSendingState();
      }

    } catch (error) {
      console.error('Failed to regenerate message:', error);
      resetSendingState();
    }
  };

  const editMessage = async (messageId: string, newContent: string) => {
    if (isSendingRef.current) {
      return;
    }

    const parsedInput = parseSlashPresets(newContent);
    const cleanNewContent = parsedInput.cleanContent.trim();

    if (!cleanNewContent) {
      return;
    }

    const resetSendingState = () => {
      if (sendingTimeoutRef.current) clearTimeout(sendingTimeoutRef.current);
      setIsSending(false);
      isSendingRef.current = false;
      
      setTimeout(() => {
        setIsThinking(false);
      }, 150);
    };

    const startSendingState = () => {
      setIsSending(true);
      setIsThinking(true);
      isSendingRef.current = true;

      if (sendingTimeoutRef.current) clearTimeout(sendingTimeoutRef.current);
      sendingTimeoutRef.current = setTimeout(() => {
        console.warn("Force clearing isSending state after timeout");
        resetSendingState();
      }, 10000);
    };

    try {
      startSendingState();

      // Find the message to edit
      const messageIndex = messages.findIndex(msg => msg.id === messageId);
      if (messageIndex === -1) {
        resetSendingState();
        return;
      }

      const messageToEdit = messages[messageIndex];
      if (!messageToEdit.isUser) {
        resetSendingState();
        return; // Can only edit user messages
      }

      // First, generate the new AI response with the edited content
      const messagesUpToEdit = messages.slice(0, messageIndex);
      const recentMessages = getRecentMessages(messagesUpToEdit, settings.writingStyle, false);
      const messageLanguage = messageToEdit.language ?? settings.language;
      const slashPresets = parsedInput.hasExplicitPresets
        ? parsedInput.presets
        : messageToEdit.slashPresets;
      const promptMessage = parsedInput.hasExplicitPresets
        ? newContent.trim()
        : formatMessageForPrompt(cleanNewContent, slashPresets);
      const systemPrompt = await getSystemPromptForMessage(promptMessage, messageLanguage);
      const searchEvidence = await fetchSearchEvidence(cleanNewContent, slashPresets ?? []);
      const messageWithSearchContext = applySearchContext(cleanNewContent, searchEvidence, slashPresets ?? []);
      const aiResponse = await groqService.sendMessage(
        chatOwnerId,
        currentDate,
        messageWithSearchContext,
        recentMessages, // Only send recent messages instead of entire history
        systemPrompt
      );
      const finalAiResponse = ensureSourcesAtEnd(aiResponse, searchEvidence.sources);

      // Only after we have the new response, delete messages and update
      const messagesToDelete = messages.slice(messageIndex);
      for (const msg of messagesToDelete) {
        await deleteMessage(msg.id);
      }

      // Wait a bit for deletions to process
      await new Promise(resolve => setTimeout(resolve, 300));

      // Create the edited user message
      const optimisticEditedUserMessage = createOptimisticMessage({
        content: cleanNewContent,
        isUser: true,
        userProfileImage: userAvatarUrl,
        language: messageLanguage,
        slashPresets,
      });
      appendOptimisticMessage(optimisticEditedUserMessage);

      const editedUserMessage = convertToFirebase(optimisticEditedUserMessage);

      await saveChatMessage(chatOwnerId, editedUserMessage, currentDate);

      // Save the AI response
      const optimisticAiMessage = createOptimisticMessage({
        content: finalAiResponse,
        isUser: false,
        userProfileImage: aiAvatarUrl,
      });
      appendOptimisticMessage(optimisticAiMessage);

      const aiMessage = convertToFirebase(optimisticAiMessage);

      resetSendingState();
      
      await saveChatMessage(chatOwnerId, aiMessage, currentDate);
      
      setTimeout(() => {
        if (!isSendingRef.current) {
          debouncedHistoryUpdate();
        }
      }, 300);

    } catch (error) {
      console.error('Failed to edit message:', error);
      resetSendingState();
    }
  };

  const loadMessagesForDate = async (date: string) => {
    // Clear data session memory when switching chats
    setDataSessionMemory([]);
    setMessages([]);
    setIsLoading(true);

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    currentSubscriptionDateRef.current = '';
    currentSubscriptionOwnerIdRef.current = '';
    setCurrentDate(date);
  };

  const createNewChat = async (targetDate?: string) => {
    // Clear data session memory when creating or opening a journal
    setDataSessionMemory([]);
    setMessages([]);
    setIsLoading(true);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const journalDate = targetDate || todayStr;

    // RULE 1: Reject future dates
    if (journalDate > todayStr) {
      console.warn('Cannot create a journal for future dates.');
      setIsLoading(false);
      return;
    }

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    currentSubscriptionDateRef.current = '';
    setCurrentDate(journalDate);

    // Initialize or load existing journal for specified date
    try {
      await initializeUserChat(chatOwnerId, journalDate);
      
      const parsedDate = new Date(journalDate + 'T00:00:00');
      const title = `Journal ${parsedDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      })}`;
      await createChatSession(chatOwnerId, journalDate, title);
      
      debouncedHistoryUpdate();
    } catch (error) {
      console.error('Failed to open journal for date:', error);
      setIsLoading(false);
    }
  };

  return (
    <ChatContext.Provider value={{
      messages,
      sendMessage,
      deleteMessage,
      regenerateMessage,
      editMessage,
      loadMessagesForDate,
      createNewChat,
      clearAllChats,
      currentDate,
      isLoading,
      isSending,
      isThinking,
      replyContext,
      addReplyContext,
      removeReplyContext,
      clearReplyContext,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
