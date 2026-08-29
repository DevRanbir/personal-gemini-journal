import { getChatMessages, saveChatMessage, getGuestSampleMessages } from './firebase-service';
import { isFirebaseConfigured } from './firebase';
import { getHarmonyAvatarUrl } from './local-user';

const initializingLocks = new Set<string>();

const getDailyWelcome = (targetDate: string): string => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const isToday = targetDate === today;
  const hour = now.getHours();

  if (!isToday) {
    return `Welcome back to your ${formatChatDate(new Date(`${targetDate}T00:00:00`))} journal.\n\nTell me what happened that day, and I can capture the important moments, organize tasks, and connect reflections with your calendar.\n\nYou can also ask me to:\n- save a journal highlight\n- add a todo or calendar event\n- remember a personal milestone\n- summarize patterns in your reflections`;
  }

  const checkIn = hour < 12
    ? "Good morning. What is on your agenda today, and what would you like to make progress on?"
    : hour < 18
      ? "How is your day going so far? Tell me what has happened, what is next, or anything you want to remember."
      : "How did your day go? Tell me about the moments, progress, or challenges you want to reflect on tonight.";

  return `${checkIn}\n\nI can turn this conversation into a useful daily journal by:\n- saving important highlights and personal milestones\n- adding todos and calendar events when you ask\n- remembering goals, preferences, and progress you share\n- finding patterns across your reflections with visual insights\n\nStart anywhere - tell me what happened, what is planned, or how you feel.`;
};

export const initializeUserChat = async (username: string, date?: string, skipWelcome?: boolean): Promise<void> => {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const lockKey = `${username}_${targetDate}`;

  if (initializingLocks.has(lockKey)) {
    return;
  }

  initializingLocks.add(lockKey);

  try {
    const existingMessages = await getChatMessages(username, targetDate);
    const hasWelcome = existingMessages.some(m => 
      typeof m.content === 'string' && (m.content.includes("Welcome to Harmony") || m.content.includes("sample journal reflection"))
    );
    
    // Populate sample messages if no messages exist and skipWelcome is not true
    if (existingMessages.length === 0 && !hasWelcome && !skipWelcome) {
      const isGuest = username.startsWith('local-') || username === 'guest';

      if (isGuest) {
        const sampleMessages = getGuestSampleMessages(targetDate);

        for (const msg of sampleMessages) {
          await saveChatMessage(username, msg, targetDate);
        }
      } else {
        const welcomeMessage = {
          content: getDailyWelcome(targetDate),
          isUser: false,
          timestamp: Date.now(),
          userProfileImage: getHarmonyAvatarUrl(targetDate),
        };
        
        await saveChatMessage(username, welcomeMessage, targetDate);
      }
    }
  } catch (error) {
    console.error('Failed to initialize user chat:', error);
  } finally {
    initializingLocks.delete(lockKey);
  }
};

export const formatChatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const getChatDateFromTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toISOString().split('T')[0];
};

export const getFirebaseStatus = (): { isConfigured: boolean; message: string } => {
  if (isFirebaseConfigured) {
    return {
      isConfigured: true,
      message: '✅ Firebase is configured and ready'
    };
  } else {
    return {
      isConfigured: false,
      message: '⚠️ Firebase not configured - using localStorage fallback'
    };
  }
};

export function summarizeUserPromptToHighlight(text: string): string {
  if (!text) return '';
  let clean = text.split(/\[(USER|Attached|Data|Referenced|New Question)/i)[0].trim();
  
  // Strip conversational fillers, corrections, & greetings at the start
  clean = clean.replace(/^(ye|yeh)\s+(galat|wrong)\s+hai,?\s*/i, '');
  clean = clean.replace(/^(aaj|ajj|aj|today|bhai|boss|yrr|yar|dost|bro),?\s*/i, '');
  clean = clean.replace(/^(pta\skya\shua|guess\swhat\shappened|guess\swhat|you\sknow\swhat),?\s*/i, '');
  clean = clean.replace(/^(actually\s+i|actually),?\s*/i, '');
  clean = clean.replace(/^(can\s+you\s+)?(record|save|log|note)\s+(that|this)\s+(for\s+me)?[\.\?\!]*/i, '');
  clean = clean.replace(/[\.\,\?\!\s]+(can\s+you\s+)?(record|save|log|note)\s+(that|this)\s+(for\s+me)?[\.\?\!]*/i, '');
  clean = clean.replace(/^its?\s+on\s+/i, 'Birthday is on ');
  
  // Clean trailing punctuation
  clean = clean.replace(/[\.,\s]+$/, '');

  if (!clean) clean = text;

  // Capitalize first character
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export function deduplicateJournalPoints(points: string[]): string[] {
  const result: string[] = [];

  for (const rawPt of points) {
    if (!rawPt || typeof rawPt !== 'string') continue;
    const cleanPt = rawPt.replace(/^\d+[\.\)]\s*/, '').trim();
    if (cleanPt.length < 4) continue;

    const lower = cleanPt.toLowerCase();
    const numbers = lower.match(/\b\d+(%|\b)/g) || [];
    const keywords = lower.match(/\b[a-z]{4,}\b/g) || [];

    let isDuplicate = false;
    for (const existing of result) {
      const existingLower = existing.toLowerCase();
      const existingNumbers = existingLower.match(/\b\d+(%|\b)/g) || [];
      const existingKeywords = existingLower.match(/\b[a-z]{4,}\b/g) || [];

      // 1. Exact or substring match
      if (existingLower === lower || existingLower.includes(lower) || lower.includes(existingLower)) {
        isDuplicate = true;
        break;
      }

      // 2. If same numbers exist (e.g. both have "69") and share topic keywords (e.g. "science" or "test")
      const sameNumbers = numbers.length > 0 && numbers.every(n => existingNumbers.includes(n));
      const sharedWordCount = keywords.filter(w => existingKeywords.includes(w)).length;

      if (sameNumbers && sharedWordCount >= 1) {
        isDuplicate = true;
        break;
      }

      // 3. High keyword overlap (3+ matching words)
      if (sharedWordCount >= 3) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      result.push(cleanPt);
    }
  }

  return result;
}
