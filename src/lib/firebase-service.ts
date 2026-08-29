import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where,
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from './firebase';

export interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: number;
  userProfileImage?: string;
  language?: 'hinglish' | 'english' | 'punjabi' | 'marathi' | 'hindi';
  slashPresets?: string[];
  attachedReplies?: {
    messageId: string;
    content: string;
    timestamp: number;
  }[];
}

export interface BookmarkData {
  id: string;
  content: string;
  timestamp: number;
  isUser: boolean;
  userProfileImage?: string;
  bookmarkedAt: number;
}

export interface Question {
  id: string;
  question: string;
  description?: string;
  category: string;
  author: string;
  authorEmail?: string;
  timestamp: number;
  answer?: string;
  answeredBy?: string;
  answeredAt?: number;
  status: 'pending' | 'answered';
  votes?: number;
  votedBy?: string[];
  isAnonymous?: boolean;
}

export interface PrivateQuestion {
  id: string;
  question: string;
  description?: string;
  category: string;
  timestamp: number;
  answer: string;
  answeredBy?: string;
  answeredAt?: number;
  status: 'pending' | 'answered';
}

export interface ChatHistory {
  date: string;
  title: string;
  messageCount: number;
  lastMessage?: string;
  lastTimestamp: number;
  journal?: string[];
}

export interface UserSettings {
  theme?: 'light' | 'dark' | 'system';
  notifications?: {
    email?: {
      securityAlerts?: boolean;
      productUpdates?: boolean;
    };
    browser?: {
      enabled?: boolean;
      permission?: 'default' | 'granted' | 'denied';
    };
  };
  privacy?: {
    dataProcessing?: boolean;
    analytics?: boolean;
  };
  appearance?: {
    animationEffects?: boolean;
  };
}

const isFirebaseAvailable = (): boolean => {
  return isFirebaseConfigured && db !== null && Boolean(auth?.currentUser);
};

const notifyLocalChatSubscribers = (username: string, date?: string) => {
  if (typeof window === 'undefined' || !date) {
    return;
  }

  window.dispatchEvent(new CustomEvent('harmony-chat-updated', {
    detail: { username, date },
  }));
};

// LocalStorage Fallbacks
const saveToLocalStorage = (type: 'chat' | 'bookmark', username: string, data: ChatMessage | BookmarkData | Omit<ChatMessage, 'id'>, date?: string): string => {
  const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
  
  if (type === 'chat' && date) {
    const key = `harmony_chat_${username}_${date}`;
    let existing = [];
    try {
      const stored = localStorage.getItem(key);
      if (stored) existing = JSON.parse(stored);
    } catch (error) {}
    
    const newItem = { ...data, id };
    existing.push(newItem);
    
    try {
      localStorage.setItem(key, JSON.stringify(existing));
      const content = 'content' in data ? data.content : '';
      updateLocalStorageHistory(username, date, content);
      notifyLocalChatSubscribers(username, date);
    } catch (error) {}
    return id;
  } else {
    const key = `harmony_${type}_${username}`;
    let existing = [];
    try {
      const stored = localStorage.getItem(key);
      if (stored) existing = JSON.parse(stored);
    } catch (error) {}
    
    const newItem = { ...data, id };
    existing.push(newItem);
    
    try {
      localStorage.setItem(key, JSON.stringify(existing));
    } catch (error) {}
    return id;
  }
};

const updateLocalStorageHistory = (username: string, date: string, lastMessage: string) => {
  const historyKey = `harmony-chat-history-${username}`;
  try {
    let history = [];
    const stored = localStorage.getItem(historyKey);
    if (stored) history = JSON.parse(stored);
    
    const existingIndex = history.findIndex((item: ChatHistory) => item.date === date);
    if (existingIndex >= 0) {
      history[existingIndex].lastMessage = lastMessage;
      history[existingIndex].lastTimestamp = Date.now();
      history[existingIndex].messageCount = (history[existingIndex].messageCount || 0) + 1;
    } else {
      history.push({
        date,
        title: `Chat ${date}`,
        messageCount: 1,
        lastMessage,
        lastTimestamp: Date.now()
      });
    }
    localStorage.setItem(historyKey, JSON.stringify(history));
  } catch (error) {}
};

function getFromLocalStorage(type: 'chat', username: string, date?: string): ChatMessage[];
function getFromLocalStorage(type: 'bookmark', username: string, date?: string): BookmarkData[];
function getFromLocalStorage(type: 'chat' | 'bookmark', username: string, date?: string): ChatMessage[] | BookmarkData[] {
  if (type === 'chat' && date) {
    const key = `harmony_chat_${username}_${date}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch (error) {}
    return [];
  } else {
    const key = `harmony_${type}_${username}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch (error) {}
    return [];
  }
}

const removeFromLocalStorage = (type: 'chat' | 'bookmark', username: string, itemId: string, date?: string): boolean => {
  if (type === 'chat' && date) {
    const key = `harmony_chat_${username}_${date}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const items = JSON.parse(stored);
        const filtered = items.filter((item: ChatMessage) => item.id !== itemId);
        localStorage.setItem(key, JSON.stringify(filtered));
        notifyLocalChatSubscribers(username, date);
        return true;
      }
    } catch (error) {}
    return false;
  } else {
    const key = `harmony_${type}_${username}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const items = JSON.parse(stored);
        const filtered = items.filter((item: BookmarkData) => item.id !== itemId);
        localStorage.setItem(key, JSON.stringify(filtered));
        return true;
      }
    } catch (error) {}
    return false;
  }
};

// ==========================================
// CLOUD FIRESTORE SERVICE IMPLEMENTATIONS
// ==========================================

export const saveChatMessage = async (
  username: string, 
  message: Omit<ChatMessage, 'id'>, 
  date?: string
): Promise<string> => {
  if (!isFirebaseAvailable()) {
    return saveToLocalStorage('chat', username, message, date);
  }

  try {
    const targetUserId = auth.currentUser?.uid || username;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const colRef = collection(db, "users", targetUserId, "interactions");
    const docRef = await addDoc(colRef, {
      ...message,
      date: targetDate,
      sender: message.isUser ? "user" : "gemini",
      text: message.content,
      createdAt: serverTimestamp(),
      timestamp: message.timestamp || Date.now(),
    });

    await updateChatMetadata(targetUserId, targetDate, message.content);
    return docRef.id;
  } catch (error) {
    console.error('Error saving chat message to Firestore:', error);
    return saveToLocalStorage('chat', username, message, date);
  }
};

export const getChatMessages = async (username: string, date?: string): Promise<ChatMessage[]> => {
  if (!isFirebaseAvailable()) {
    return getFromLocalStorage('chat', username, date);
  }

  try {
    const targetUserId = auth.currentUser?.uid || username;
    const targetDate = date || new Date().toISOString().split('T')[0];
    const colRef = collection(db, "users", targetUserId, "interactions");
    const q = query(colRef, orderBy("timestamp", "asc"));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const filteredDocs = snapshot.docs.filter((doc) => {
        const data = doc.data();
        const dataDate = typeof data.date === 'string' ? data.date : '';
        const msgDate = dataDate || (data.timestamp ? new Date(data.timestamp).toISOString().split('T')[0] : '');
        return msgDate === targetDate;
      });

      const rawList = filteredDocs.map((doc) => {
        const data = doc.data();
        const rawContent = data.content ?? data.text ?? '';
        const contentStr = typeof rawContent === 'string'
          ? rawContent
          : (typeof rawContent === 'object' && rawContent !== null ? JSON.stringify(rawContent) : String(rawContent || ''));

        return {
          id: doc.id,
          content: contentStr,
          isUser: data.isUser !== undefined ? data.isUser : data.sender === 'user',
          timestamp: data.timestamp || Date.now(),
          userProfileImage: data.userProfileImage,
          language: data.language,
          slashPresets: data.slashPresets,
          attachedReplies: data.attachedReplies,
        };
      });

      // Deduplicate initial welcome messages if multiple exist
      let seenWelcome = false;
      return rawList.filter((msg) => {
        const content = typeof msg.content === 'string' ? msg.content : String(msg.content || '');
        if (content.includes("Welcome to Harmony")) {
          if (seenWelcome) return false;
          seenWelcome = true;
        }
        return true;
      });
    }
    return [];
  } catch (error) {
    console.error('Error getting chat messages from Firestore:', error);
    return getFromLocalStorage('chat', username, date);
  }
};
export const getGuestSampleMessages = (targetDate: string): ChatMessage[] => {
  const t0 = Date.now() - 60000 * 15;
  const t1 = Date.now() - 60000 * 12;
  const t2 = Date.now() - 60000 * 9;
  const t3 = Date.now() - 60000 * 6;
  const t4 = Date.now() - 60000 * 3;

  return [
    {
      id: "sample-msg-1",
      content: "Welcome to Harmony AI! 🌸 Your personal AI reflection & journal auditing companion. Here is an interactive showcase preview of how Harmony connects your journal entries with interactive charts, Daily Logs, Calendar events, and Todo action items.",
      isUser: false,
      timestamp: t0,
    },
    {
      id: "sample-msg-2",
      content: "bhai last time mere maths me 8/10 aye the, iss bar 10/10 aye hai! Can u draw a progress chart, update my calendar, and check off my todo?",
      isUser: true,
      timestamp: t1,
    },
    {
      id: "sample-msg-3",
      content: "Waah bhai! 🌟 Superb performance: 8/10 se direct 10/10 full marks! Here is your test score progress chart:\n\n```json\n{\n  \"type\": \"bar\",\n  \"title\": \"Maths Exam Score Improvement\",\n  \"xKey\": \"test\",\n  \"yKeys\": [\"score\"],\n  \"data\": [\n    { \"test\": \"Test 1\", \"score\": 5 },\n    { \"test\": \"Test 2\", \"score\": 8 },\n    { \"test\": \"Test 3\", \"score\": 10 }\n  ]\n}\n```\n\n### 🗓️ Daily Logs & Calendar Sync\n- **Gemini Highlight Extracted**: *\"Scored 10/10 in Maths test today (improved from 5/10 and 8/10)\"* saved to your Daily Logs.\n- **Calendar Event Logged**: **Maths Exam Progress Audit** (10:00 AM - 11:00 AM Today) and **Weekly Reflection Check-in** (2:00 PM - 3:00 PM Today).\n- **Upcoming Event**: **Friend's Birthday Reminder** set for 2 days from today.",
      isUser: false,
      timestamp: t2,
    },
    {
      id: "sample-msg-4",
      content: "Acha mere todo tasks ka kya status hai?",
      isUser: true,
      timestamp: t3,
    },
    {
      id: "sample-msg-5",
      content: "Here is your updated **Todo Action Items** breakdown:\n\n| Action Item | Priority | Category | Status |\n| :--- | :--- | :--- | :--- |\n| Ask Harmony AI to visualize weekly score progress | Medium | Learning | ✅ Completed |\n| Read 15 pages of personal growth book | High | Personal | ⏳ Pending (Today) |\n| Sign in with Google to sync personal tasks | Low | Work | 📅 Scheduled (Tomorrow) |\n\n> 💡 **Pro-Tip**: Sign in with Google to start your personal journal, sync real-time tasks to Firebase, and save your daily reflections!\n\n*Note: Sample showcase mode preview.*",
      isUser: false,
      timestamp: t4,
    }
  ];
};

export const subscribeToChatMessages = (
  username: string, 
  date: string, 
  callback: (messages: ChatMessage[]) => void
): (() => void) => {
  const isGuest = !auth.currentUser || username.startsWith('local-') || username === 'guest';
  if (!isFirebaseAvailable() || isGuest) {
    const emitCurrentMessages = () => {
      const messages = getFromLocalStorage('chat', username, date);
      const hasChartOrShowcase = messages.some(m => typeof m.content === 'string' && m.content.includes("Maths Exam Score Improvement"));
      const isLegacyOrScratch = messages.some(m => typeof m.content === 'string' && (m.content.includes("hhhello") || m.content === "Welcome to Harmony! How can I assist you today?"));

      if (messages.length === 0 || (!hasChartOrShowcase && isLegacyOrScratch)) {
        callback(getGuestSampleMessages(date));
        return;
      }
      messages.sort((a, b) => a.timestamp - b.timestamp);
      callback(messages);
    };
    emitCurrentMessages();

    const handleLocalUpdate = (event: Event) => {
      emitCurrentMessages();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('harmony-chat-updated', handleLocalUpdate);
      window.addEventListener('storage', handleLocalUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('harmony-chat-updated', handleLocalUpdate);
        window.removeEventListener('storage', handleLocalUpdate);
      }
    };
  }

  const targetUserId = auth.currentUser?.uid || username;
  const colRef = collection(db, "users", targetUserId, "interactions");
  const q = query(colRef, orderBy("timestamp", "asc"));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const filteredDocs = snapshot.docs.filter((doc) => {
      const data = doc.data();
      const dataDate = typeof data.date === 'string' ? data.date : '';
      const msgDate = dataDate || (data.timestamp ? new Date(data.timestamp).toISOString().split('T')[0] : '');
      return msgDate === date;
    });

    const rawList: ChatMessage[] = filteredDocs.map((doc) => {
      const data = doc.data();
      const rawContent = data.content ?? data.text ?? '';
      const contentStr = typeof rawContent === 'string'
        ? rawContent
        : (typeof rawContent === 'object' && rawContent !== null ? JSON.stringify(rawContent) : String(rawContent || ''));

      return {
        id: doc.id,
        content: contentStr,
        isUser: data.isUser !== undefined ? data.isUser : data.sender === 'user',
        timestamp: data.timestamp || Date.now(),
        userProfileImage: data.userProfileImage,
        language: data.language,
        slashPresets: data.slashPresets,
        attachedReplies: data.attachedReplies,
      };
    });

    // Deduplicate initial welcome messages if multiple exist
    let seenWelcome = false;
    const deduplicatedList = rawList.filter((msg) => {
      const content = typeof msg.content === 'string' ? msg.content : String(msg.content || '');
      if (content.includes("Welcome to Harmony")) {
        if (seenWelcome) return false;
        seenWelcome = true;
      }
      return true;
    });

    callback(deduplicatedList);
  }, (error: any) => {
    if (error?.code === 'permission-denied' || error?.message?.includes('insufficient permissions')) {
      console.warn("Firestore subscription closed due to auth state change.");
    } else {
      console.error("Firestore subscription error:", error);
    }
    callback([]);
  });

  return unsubscribe;
};

export const deleteChatMessage = async (username: string, date: string, messageId: string): Promise<boolean> => {
  if (!isFirebaseAvailable()) {
    return removeFromLocalStorage('chat', username, messageId, date);
  }

  try {
    const targetUserId = auth.currentUser?.uid || username;
    await deleteDoc(doc(db, "users", targetUserId, "interactions", messageId));
    return true;
  } catch (error) {
    console.error('Error deleting chat message from Firestore:', error);
    return false;
  }
};

export const saveBookmark = async (
  username: string, 
  bookmark: Omit<BookmarkData, 'id'> & { id?: string }
): Promise<string> => {
  if (!isFirebaseAvailable()) {
    return saveToLocalStorage('bookmark', username, bookmark as any);
  }

  try {
    const targetUserId = auth.currentUser?.uid || username;
    const bookmarkId = bookmark.id || `bm_${Date.now()}`;
    const docRef = doc(db, "users", targetUserId, "bookmarks", bookmarkId);
    
    await setDoc(docRef, {
      ...bookmark,
      id: bookmarkId,
      bookmarkedAt: bookmark.bookmarkedAt || Date.now(),
      createdAt: serverTimestamp(),
    }, { merge: true });

    return bookmarkId;
  } catch (error) {
    console.error('Error saving bookmark to Firestore:', error);
    return saveToLocalStorage('bookmark', username, bookmark as any);
  }
};

export const getBookmarks = async (username: string): Promise<BookmarkData[]> => {
  if (!isFirebaseAvailable()) {
    return getFromLocalStorage('bookmark', username, undefined);
  }

  try {
    const targetUserId = auth.currentUser?.uid || username;
    const colRef = collection(db, "users", targetUserId, "bookmarks");
    const snapshot = await getDocs(colRef);

    if (!snapshot.empty) {
      const list: BookmarkData[] = [];
      const seenIds = new Set<string>();

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const bId = data.id || docSnap.id;
        if (!seenIds.has(bId)) {
          seenIds.add(bId);
          list.push({
            id: bId,
            content: data.content || '',
            timestamp: data.timestamp || Date.now(),
            isUser: data.isUser,
            userProfileImage: data.userProfileImage,
            bookmarkedAt: data.bookmarkedAt || Date.now(),
          });
        }
      });

      return list.sort((a, b) => b.bookmarkedAt - a.bookmarkedAt);
    }
    return [];
  } catch (error) {
    console.error('Error getting bookmarks from Firestore:', error);
    return getFromLocalStorage('bookmark', username, undefined);
  }
};

export const getGuestSampleBookmarks = (): BookmarkData[] => {
  return [
    {
      id: "sample-bm-1",
      content: "Waah bhai! 🌟 Superb performance: 8/10 se direct 10/10 full marks! Here is your test score progress chart:\n\n```json\n{\n  \"type\": \"bar\",\n  \"title\": \"Maths Exam Score Improvement\",\n  \"xKey\": \"test\",\n  \"yKeys\": [\"score\"],\n  \"data\": [\n    { \"test\": \"Test 1\", \"score\": 5 },\n    { \"test\": \"Test 2\", \"score\": 8 },\n    { \"test\": \"Test 3\", \"score\": 10 }\n  ]\n}\n```",
      isUser: false,
      timestamp: Date.now() - 3600000,
      bookmarkedAt: Date.now() - 1800000,
    },
    {
      id: "sample-bm-2",
      content: "Here is your updated **Todo Action Items** breakdown:\n\n| Action Item | Priority | Category | Status |\n| :--- | :--- | :--- | :--- |\n| Ask Harmony AI to visualize weekly score progress | Medium | Learning | ✅ Completed |\n| Read 15 pages of personal growth book | High | Personal | ⏳ Pending (Today) |\n| Sign in with Google to sync personal tasks | Low | Work | 📅 Scheduled (Tomorrow) |",
      isUser: false,
      timestamp: Date.now() - 7200000,
      bookmarkedAt: Date.now() - 3600000,
    }
  ];
};

export const subscribeToBookmarks = (
  username: string, 
  callback: (bookmarks: BookmarkData[]) => void
): (() => void) => {
  const isGuest = !auth.currentUser || username.startsWith('local-') || username === 'guest';
  if (!isFirebaseAvailable() || isGuest) {
    const emitLocal = () => {
      const bookmarks = getFromLocalStorage('bookmark', username, undefined);
      if (bookmarks.length === 0) {
        callback(getGuestSampleBookmarks());
        return;
      }
      callback(bookmarks.sort((a: BookmarkData, b: BookmarkData) => b.bookmarkedAt - a.bookmarkedAt));
    };

    emitLocal();

    const handleLocalUpdate = () => {
      emitLocal();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('harmony-bookmark-updated', handleLocalUpdate);
      window.addEventListener('storage', handleLocalUpdate);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('harmony-bookmark-updated', handleLocalUpdate);
        window.removeEventListener('storage', handleLocalUpdate);
      }
    };
  }

  const targetUserId = auth.currentUser?.uid || username;
  const colRef = collection(db, "users", targetUserId, "bookmarks");

  const unsubscribe = onSnapshot(colRef, (snapshot) => {
    const list: BookmarkData[] = [];
    const seenIds = new Set<string>();

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const bId = data.id || docSnap.id;
      if (!seenIds.has(bId)) {
        seenIds.add(bId);
        list.push({
          id: bId,
          content: data.content || '',
          timestamp: data.timestamp || Date.now(),
          isUser: data.isUser,
          userProfileImage: data.userProfileImage,
          bookmarkedAt: data.bookmarkedAt || Date.now(),
        });
      }
    });

    list.sort((a, b) => b.bookmarkedAt - a.bookmarkedAt);
    callback(list);
  }, (error) => {
    console.error("Firestore bookmarks subscription error:", error);
    callback([]);
  });

  return unsubscribe;
};

export const deleteBookmark = async (username: string, bookmarkId: string): Promise<boolean> => {
  if (!isFirebaseAvailable()) {
    return removeFromLocalStorage('bookmark', username, bookmarkId, undefined);
  }

  try {
    const targetUserId = auth.currentUser?.uid || username;
    // 1. Delete document directly by bookmarkId
    await deleteDoc(doc(db, "users", targetUserId, "bookmarks", bookmarkId));

    // 2. Also cleanup legacy duplicate documents where data().id === bookmarkId
    const colRef = collection(db, "users", targetUserId, "bookmarks");
    const q = query(colRef, where("id", "==", bookmarkId));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      deleteDoc(d.ref).catch(() => {});
    });

    return true;
  } catch (error) {
    console.error('Error deleting bookmark from Firestore:', error);
    return false;
  }
};

export const removeBookmark = deleteBookmark;

const getGuestSampleHistory = (): ChatHistory[] => {
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  return [
    {
      date: todayStr,
      title: "Sample Reflection Journal",
      messageCount: 3,
      lastMessage: "Maths Test Progress Chart",
      lastTimestamp: Date.now(),
      journal: ["Scored 10/10 in Maths test today (improved from 5/10 and 8/10)", "Completed weekly reflection audit"],
    },
    {
      date: yesterdayStr,
      title: "Maths Exam Prep Reflection",
      messageCount: 2,
      lastMessage: "Reviewed key formulas for Maths exam",
      lastTimestamp: Date.now() - 86400000,
      journal: ["Prepared for Maths exam and reviewed key formulas"],
    }
  ];
};

export const getChatHistory = async (username: string): Promise<ChatHistory[]> => {
  const isGuest = !auth.currentUser || username.startsWith('local-') || username === 'guest';
  if (!isFirebaseAvailable() || isGuest) {
    if (typeof window !== 'undefined') {
      const localHistory = localStorage.getItem(`harmony-chat-history-${username}`);
      if (localHistory !== null) {
        try {
          const parsed = JSON.parse(localHistory);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {}
      }
    }
    return getGuestSampleHistory();
  }

  try {
    const targetUserId = auth.currentUser?.uid || username;
    if (!targetUserId) return getGuestSampleHistory();
    
    const colRef = collection(db, "users", targetUserId, "chat_history");
    const snapshot = await getDocs(colRef);

    if (!snapshot.empty) {
      const list = snapshot.docs.map((doc) => {
        const data = doc.data();
        const rawLastMsg = data.lastMessage;
        const lastMsgStr = typeof rawLastMsg === 'string'
          ? rawLastMsg
          : (typeof rawLastMsg === 'object' && rawLastMsg !== null ? (rawLastMsg.content || rawLastMsg.text || JSON.stringify(rawLastMsg)) : String(rawLastMsg || ''));

        return {
          date: doc.id,
          title: data.title || `Journal ${doc.id}`,
          messageCount: data.messageCount || 0,
          lastMessage: lastMsgStr,
          lastTimestamp: data.lastTimestamp || data.createdAt || Date.now(),
          journal: Array.isArray(data.journal) ? data.journal : [],
        };
      });

      return list.sort((a, b) => b.date.localeCompare(a.date));
    }

    // If chat_history is empty, check interactions collection to reconstruct chat history
    const intColRef = collection(db, "users", targetUserId, "interactions");
    const intSnap = await getDocs(intColRef);
    if (!intSnap.empty) {
      const dateMap: Record<string, { count: number; lastMsg: string; lastTime: number }> = {};
      intSnap.docs.forEach((d) => {
        const dData = d.data();
        const dataDate = typeof dData.date === 'string' ? dData.date : '';
        const dDate = dataDate || (dData.timestamp ? new Date(dData.timestamp).toISOString().split('T')[0] : '');
        if (!dDate) return;
        if (!dateMap[dDate]) {
          dateMap[dDate] = { count: 0, lastMsg: '', lastTime: 0 };
        }
        dateMap[dDate].count += 1;
        const time = dData.timestamp || 0;
        if (time >= dateMap[dDate].lastTime) {
          dateMap[dDate].lastTime = time;
          const raw = dData.content || dData.text || '';
          dateMap[dDate].lastMsg = typeof raw === 'string' ? raw : JSON.stringify(raw);
        }
      });

      const list: ChatHistory[] = Object.entries(dateMap).map(([dStr, meta]) => ({
        date: dStr,
        title: `Journal ${dStr}`,
        messageCount: meta.count,
        lastMessage: meta.lastMsg,
        lastTimestamp: meta.lastTime || Date.now(),
        journal: [],
      }));

      return list.sort((a, b) => b.date.localeCompare(a.date));
    }

    return [];
  } catch (error) {
    if (typeof window !== 'undefined') {
      const localHistory = localStorage.getItem(`harmony-chat-history-${username}`);
      return localHistory ? JSON.parse(localHistory) : getGuestSampleHistory();
    }
    return getGuestSampleHistory();
  }
};

export const subscribeToChatHistory = (
  username: string,
  callback: (history: ChatHistory[]) => void
): (() => void) => {
  const isGuest = !auth.currentUser || username.startsWith('local-') || username === 'guest';
  if (!isFirebaseAvailable() || isGuest) {
    const emitLocal = () => {
      getChatHistory(username).then(callback);
    };

    emitLocal();

    if (typeof window !== 'undefined') {
      window.addEventListener('harmony-chat-history-updated', emitLocal);
      window.addEventListener('storage', emitLocal);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('harmony-chat-history-updated', emitLocal);
        window.removeEventListener('storage', emitLocal);
      }
    };
  }

  const targetUserId = auth.currentUser?.uid || username;
  if (!targetUserId) {
    callback(getGuestSampleHistory());
    return () => {};
  }

  const colRef = collection(db, "users", targetUserId, "chat_history");
  return onSnapshot(colRef, async (snapshot) => {
    if (!snapshot.empty) {
      const list = snapshot.docs.map((doc) => {
        const data = doc.data();
        const rawLastMsg = data.lastMessage;
        const lastMsgStr = typeof rawLastMsg === 'string'
          ? rawLastMsg
          : (typeof rawLastMsg === 'object' && rawLastMsg !== null ? (rawLastMsg.content || rawLastMsg.text || JSON.stringify(rawLastMsg)) : String(rawLastMsg || ''));

        return {
          date: doc.id,
          title: data.title || `Journal ${doc.id}`,
          messageCount: data.messageCount || 0,
          lastMessage: lastMsgStr,
          lastTimestamp: data.lastTimestamp || data.createdAt || Date.now(),
          journal: Array.isArray(data.journal) ? data.journal : [],
        };
      });

      list.sort((a, b) => b.date.localeCompare(a.date));
      callback(list);
      return;
    }

    // If chat_history is empty, check interactions collection for existing messages
    try {
      const intColRef = collection(db, "users", targetUserId, "interactions");
      const intSnap = await getDocs(intColRef);
      if (!intSnap.empty) {
        const dateMap: Record<string, { count: number; lastMsg: string; lastTime: number }> = {};
        intSnap.docs.forEach((d) => {
          const dData = d.data();
          const dataDate = typeof dData.date === 'string' ? dData.date : '';
          const dDate = dataDate || (dData.timestamp ? new Date(dData.timestamp).toISOString().split('T')[0] : '');
          if (!dDate) return;
          if (!dateMap[dDate]) {
            dateMap[dDate] = { count: 0, lastMsg: '', lastTime: 0 };
          }
          dateMap[dDate].count += 1;
          const time = dData.timestamp || 0;
          if (time >= dateMap[dDate].lastTime) {
            dateMap[dDate].lastTime = time;
            const raw = dData.content || dData.text || '';
            dateMap[dDate].lastMsg = typeof raw === 'string' ? raw : JSON.stringify(raw);
          }
        });

        const list: ChatHistory[] = Object.entries(dateMap).map(([dStr, meta]) => ({
          date: dStr,
          title: `Journal ${dStr}`,
          messageCount: meta.count,
          lastMessage: meta.lastMsg,
          lastTimestamp: meta.lastTime || Date.now(),
          journal: [],
        }));

        list.sort((a, b) => b.date.localeCompare(a.date));
        callback(list);
        return;
      }
    } catch (err) {
      console.warn("Error fallback reading interactions:", err);
    }

    callback([]);
  }, (error) => {
    console.warn("Firestore chat_history subscription error:", error);
    callback([]);
  });
};

export const appendJournalPointsToHistory = async (
  username: string, 
  date: string, 
  newPoints: string[]
): Promise<boolean> => {
  if (!isFirebaseAvailable() || !newPoints || newPoints.length === 0) return false;
  try {
    const targetUserId = auth.currentUser?.uid || username;
    const docRef = doc(db, "users", targetUserId, "chat_history", date);
    
    const docSnap = await getDoc(docRef);
    let existingJournal: string[] = [];
    if (docSnap.exists() && Array.isArray(docSnap.data().journal)) {
      existingJournal = docSnap.data().journal;
    }

    const nextIndex = existingJournal.length + 1;
    const formattedNewPoints = newPoints.map((pt, i) => {
      const cleanPt = pt.replace(/^\d+[\.\)]\s*/, '').trim();
      return `${nextIndex + i}. ${cleanPt}`;
    });

    const updatedJournal = [...existingJournal, ...formattedNewPoints];

    await setDoc(docRef, {
      journal: updatedJournal,
      updatedAt: Date.now(),
    }, { merge: true });

    return true;
  } catch (error) {
    console.error('Error appending journal points to chat_history:', error);
    return false;
  }
};

export const deleteJournalPointFromHistory = async (
  username: string, 
  date: string, 
  pointIndexToDelete: number
): Promise<boolean> => {
  try {
    const targetUserId = auth.currentUser?.uid || username;
    if (!targetUserId) return false;

    if (!isFirebaseAvailable()) {
      const localHistoryKey = `harmony-chat-history-${username}`;
      const stored = localStorage.getItem(localHistoryKey);
      if (stored) {
        const history: any[] = JSON.parse(stored);
        const targetDoc = history.find((h: any) => h.date === date);
        if (targetDoc && Array.isArray(targetDoc.journal)) {
          targetDoc.journal.splice(pointIndexToDelete, 1);
          localStorage.setItem(localHistoryKey, JSON.stringify(history));
          return true;
        }
      }
      return false;
    }

    const docRef = doc(db, "users", targetUserId, "chat_history", date);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists() && Array.isArray(docSnap.data().journal)) {
      const existingJournal: string[] = docSnap.data().journal;
      const updatedJournal = existingJournal.filter((_, idx) => idx !== pointIndexToDelete);

      await setDoc(docRef, {
        journal: updatedJournal,
        updatedAt: Date.now(),
      }, { merge: true });

      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting journal point from chat_history:', error);
    return false;
  }
};

export const getAllChatDates = async (username: string): Promise<string[]> => {
  if (!isFirebaseAvailable()) {
    const messages = getFromLocalStorage('chat', username);
    const dates = new Set(messages.map((msg: ChatMessage) => 
      new Date(msg.timestamp).toISOString().split('T')[0]
    ));
    return Array.from(dates).sort().reverse();
  }

  try {
    const targetUserId = auth.currentUser?.uid || username;
    if (!targetUserId) return [];
    
    const colRef = collection(db, "users", targetUserId, "interactions");
    const snapshot = await getDocs(colRef);
    const dates = new Set<string>();
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.date) {
        dates.add(data.date);
      } else if (data.timestamp) {
        dates.add(new Date(data.timestamp).toISOString().split('T')[0]);
      }
    });
    return Array.from(dates).sort().reverse();
  } catch (error) {
    return [];
  }
};

export const updateChatTitle = async (username: string, date: string, title: string): Promise<boolean> => {
  if (!isFirebaseAvailable()) return true;
  try {
    const targetUserId = auth.currentUser?.uid || username;
    const docRef = doc(db, "users", targetUserId, "chat_history", date);
    await setDoc(docRef, { title, updatedAt: Date.now() }, { merge: true });
    return true;
  } catch (error) {
    return false;
  }
};

export const deleteChatHistory = async (username: string, date: string): Promise<boolean> => {
  const isGuest = !auth.currentUser || username.startsWith('local-') || username === 'guest';
  
  if (typeof window !== 'undefined') {
    const localHistoryKey = `harmony-chat-history-${username}`;
    const stored = localStorage.getItem(localHistoryKey);
    let currentHistory: ChatHistory[] = [];
    if (stored !== null) {
      try { currentHistory = JSON.parse(stored); } catch (e) {}
    } else {
      currentHistory = getGuestSampleHistory();
    }
    const updated = currentHistory.filter(h => h.date !== date);
    localStorage.setItem(localHistoryKey, JSON.stringify(updated));

    localStorage.removeItem(`harmony-chat-${username}-${date}`);
    const generalKey = `harmony-chat-${username}`;
    const generalStored = localStorage.getItem(generalKey);
    if (generalStored) {
      try {
        const msgs = JSON.parse(generalStored);
        if (Array.isArray(msgs)) {
          const filtered = msgs.filter((m: any) => {
            const mDate = m.date || (m.timestamp ? new Date(m.timestamp).toISOString().split('T')[0] : '');
            return mDate !== date;
          });
          localStorage.setItem(generalKey, JSON.stringify(filtered));
        }
      } catch (e) {}
    }
    localStorage.removeItem(`harmony-journal-log-${username}-${date}`);
    window.dispatchEvent(new Event('harmony-chat-history-updated'));
  }

  if (!isFirebaseAvailable() || isGuest) {
    return true;
  }

  try {
    const targetUserId = auth.currentUser?.uid || username;
    await deleteDoc(doc(db, "users", targetUserId, "chat_history", date));

    const colRef = collection(db, "users", targetUserId, "interactions");
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const deletePromises = snapshot.docs
        .filter((docSnap) => {
          const data = docSnap.data();
          const dataDate = typeof data.date === 'string' ? data.date : '';
          const msgDate = dataDate || (data.timestamp ? new Date(data.timestamp).toISOString().split('T')[0] : '');
          return msgDate === date;
        })
        .map((docSnap) => deleteDoc(doc(db, "users", targetUserId, "interactions", docSnap.id)));
      
      await Promise.all(deletePromises);
    }

    try {
      await deleteDoc(doc(db, "users", targetUserId, "journal_logs", date));
    } catch (e) {
      // Ignore if journal log doesn't exist for this date
    }

    return true;
  } catch (error) {
    console.error('Error deleting chat history from Firestore:', error);
    return false;
  }
};

export const createChatSession = async (username: string, date: string, title?: string): Promise<boolean> => {
  if (!isFirebaseAvailable()) return true;
  try {
    const targetUserId = auth.currentUser?.uid || username;
    const docRef = doc(db, "users", targetUserId, "chat_history", date);
    const now = Date.now();
    const parsedDate = new Date(date + 'T00:00:00');
    const dateTitle = parsedDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });

    await setDoc(docRef, {
      title: dateTitle,
      date,
      createdAt: now,
      lastTimestamp: now,
      lastMessage: '',
      messageCount: 0,
    }, { merge: true });
    return true;
  } catch (error) {
    return false;
  }
};

export const ensureChatSession = async (username: string, date: string): Promise<boolean> => {
  if (!isFirebaseAvailable()) return true;
  return await createChatSession(username, date, `Chat ${date}`);
};

export const updateChatMetadata = async (username: string, date: string, lastMessage: string): Promise<boolean> => {
  if (!isFirebaseAvailable()) return true;

  try {
    const targetUserId = auth.currentUser?.uid || username;
    const docRef = doc(db, "users", targetUserId, "chat_history", date);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      await updateDoc(docRef, {
        lastMessage,
        lastTimestamp: Date.now(),
        messageCount: (docSnap.data().messageCount || 0) + 1,
      });
    } else {
      await setDoc(docRef, {
        date,
        title: `Chat ${date}`,
        messageCount: 1,
        lastMessage,
        lastTimestamp: Date.now(),
      });
    }
    return true;
  } catch (error) {
    console.error('Error updating chat metadata in Firestore:', error);
    return false;
  }
};

export const updateChatMessage = async (
  username: string, 
  date: string, 
  messageId: string, 
  newContent: string
): Promise<boolean> => {
  if (!isFirebaseAvailable()) return false;

  try {
    const targetUserId = auth.currentUser?.uid || username;
    const docRef = doc(db, "users", targetUserId, "interactions", messageId);
    await updateDoc(docRef, {
      content: newContent,
      text: newContent,
    });
    return true;
  } catch (error) {
    console.error('Error updating chat message in Firestore:', error);
    return false;
  }
};

export const hasExistingChats = async (username: string): Promise<boolean> => {
  if (!isFirebaseAvailable()) return false;

  try {
    const targetUserId = auth.currentUser?.uid || username;
    const colRef = collection(db, "users", targetUserId, "interactions");
    const snapshot = await getDocs(query(colRef, orderBy("timestamp", "desc")));
    return !snapshot.empty;
  } catch (error) {
    return false;
  }
};

export const submitPublicQuestion = async (questionData: {
  question: string;
  description?: string;
  category: string;
  author: string;
  authorEmail?: string;
  isAnonymous?: boolean;
}): Promise<string> => {
  if (!isFirebaseAvailable()) throw new Error('Firebase is not configured');
  const colRef = collection(db, "FAQs");
  const docRef = await addDoc(colRef, {
    ...questionData,
    timestamp: Date.now(),
    votes: 0,
    votedBy: [],
  });
  return docRef.id;
};

export const submitPrivateQuestion = async (
  username: string,
  questionData: { question: string; description?: string; category: string }
): Promise<string> => {
  if (!isFirebaseAvailable()) throw new Error('Firebase is not configured');
  const targetUserId = auth.currentUser?.uid || username;
  const colRef = collection(db, "users", targetUserId, "queries");
  const docRef = await addDoc(colRef, {
    ...questionData,
    timestamp: Date.now(),
    status: 'pending',
    answer: 'Yet to answer',
  });
  return docRef.id;
};

export const getPublicQuestions = async (): Promise<Question[]> => {
  if (!isFirebaseAvailable()) return [];
  try {
    const colRef = collection(db, "FAQs");
    const snapshot = await getDocs(query(colRef, orderBy("timestamp", "desc")));
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Question));
  } catch (error) {
    return [];
  }
};

export const getPrivateQuestions = async (username: string): Promise<PrivateQuestion[]> => {
  if (!isFirebaseAvailable()) return [];
  try {
    const targetUserId = auth.currentUser?.uid || username;
    const colRef = collection(db, "users", targetUserId, "queries");
    const snapshot = await getDocs(query(colRef, orderBy("timestamp", "desc")));
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as PrivateQuestion));
  } catch (error) {
    return [];
  }
};

export const hasUserVoted = async (questionId: string, userId: string): Promise<boolean> => {
  if (!isFirebaseAvailable()) return false;
  try {
    const docSnap = await getDoc(doc(db, "FAQs", questionId));
    if (docSnap.exists()) {
      const votedBy = docSnap.data().votedBy || [];
      return votedBy.includes(userId);
    }
    return false;
  } catch (error) {
    return false;
  }
};

export const voteOnQuestion = async (questionId: string, userId: string, increment: boolean = true): Promise<void> => {
  if (!isFirebaseAvailable()) throw new Error('Firebase is not configured');
  try {
    const docRef = doc(db, "FAQs", questionId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const currentVotes = data.votes || 0;
      const votedBy = data.votedBy || [];
      const userAlreadyVoted = votedBy.includes(userId);

      if (increment && userAlreadyVoted) throw new Error('User has already voted');
      let newVotes = currentVotes;
      let newVotedBy = [...votedBy];

      if (increment && !userAlreadyVoted) {
        newVotes += 1;
        newVotedBy.push(userId);
      } else if (!increment && userAlreadyVoted) {
        newVotes = Math.max(0, currentVotes - 1);
        newVotedBy = votedBy.filter((id: string) => id !== userId);
      }

      await updateDoc(docRef, { votes: newVotes, votedBy: newVotedBy });
    }
  } catch (error) {
    console.error('Error voting on question:', error);
    throw error;
  }
};

export const listenToPublicQuestions = (callback: (questions: Question[]) => void): () => void => {
  if (!isFirebaseAvailable()) {
    callback([]);
    return () => {};
  }
  const colRef = collection(db, "FAQs");
  const q = query(colRef, orderBy("timestamp", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Question)));
    },
    (error) => {
      if (error?.code !== 'permission-denied') {
        console.error('Error listening to public questions:', error);
      }
      callback([]);
    }
  );
};

export const listenToPrivateQuestions = (username: string, callback: (questions: PrivateQuestion[]) => void): () => void => {
  if (!isFirebaseAvailable()) {
    callback([]);
    return () => {};
  }
  const targetUserId = auth.currentUser?.uid || username;
  const colRef = collection(db, "users", targetUserId, "queries");
  const q = query(colRef, orderBy("timestamp", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as PrivateQuestion)));
    },
    (error) => {
      if (error?.code !== 'permission-denied') {
        console.error('Error listening to private questions:', error);
      }
      callback([]);
    }
  );
};

export const saveUserSettings = async (username: string, settings: UserSettings): Promise<boolean> => {
  if (!isFirebaseAvailable()) return false;
  try {
    const targetUserId = auth.currentUser?.uid || username;
    const docRef = doc(db, "users", targetUserId, "settings", "preferences");
    await setDoc(docRef, settings, { merge: true });
    return true;
  } catch (error) {
    return false;
  }
};

export const getUserSettings = async (username: string): Promise<UserSettings> => {
  if (!isFirebaseAvailable()) return {};
  try {
    const targetUserId = auth.currentUser?.uid || username;
    const docSnap = await getDoc(doc(db, "users", targetUserId, "settings", "preferences"));
    return docSnap.exists() ? (docSnap.data() as UserSettings) : {};
  } catch (error) {
    return {};
  }
};

export const updateUserSetting = async (username: string, settingPath: string, value: unknown): Promise<boolean> => {
  if (!isFirebaseAvailable()) return false;
  try {
    const targetUserId = auth.currentUser?.uid || username;
    const docRef = doc(db, "users", targetUserId, "settings", "preferences");
    await updateDoc(docRef, { [settingPath]: value });
    return true;
  } catch (error) {
    return false;
  }
};

export const deleteUserData = async (username: string, dataType: 'chats' | 'bookmarks' | 'faqs' | 'all'): Promise<boolean> => {
  if (!isFirebaseAvailable()) return false;
  try {
    const targetUserId = auth.currentUser?.uid || username;
    if (dataType === 'chats' || dataType === 'all') {
      const colSnap = await getDocs(collection(db, "users", targetUserId, "interactions"));
      colSnap.docs.forEach(async (d) => await deleteDoc(d.ref));
    }
    if (dataType === 'bookmarks' || dataType === 'all') {
      const colSnap = await getDocs(collection(db, "users", targetUserId, "bookmarks"));
      colSnap.docs.forEach(async (d) => await deleteDoc(d.ref));
    }
    return true;
  } catch (error) {
    return false;
  }
};

// ==========================================
// CALENDAR & TODO FIRESTORE IMPLEMENTATIONS
// ==========================================

export interface CalendarEventData {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  allDay?: boolean;
  color?: string;
  location?: string;
  createdAt?: number;
}

export interface TodoItemData {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  createdAt?: number;
}

export interface MetricsSourceStats {
  totalChats: number;
  totalMessages: number;
  totalBookmarks: number;
  totalDays: number;
  totalJournalHighlights: number;
  totalTodos: number;
  completedTodos: number;
  totalEvents: number;
  latestActivityAt?: number;
}

export interface MetricsInsightsCache {
  generatedAt: number;
  sourceFingerprint: string;
  sourceStats: MetricsSourceStats;
  insights: unknown;
}

export const saveCalendarEvent = async (
  username: string, 
  event: Omit<CalendarEventData, 'id'>
): Promise<string> => {
  if (!isFirebaseAvailable()) return Date.now().toString();
  try {
    const targetUserId = auth.currentUser?.uid || username;
    const colRef = collection(db, "users", targetUserId, "data", "calendar", "events");
    const payload = Object.fromEntries(
      Object.entries({
        ...event,
        createdAt: Date.now(),
      }).filter(([_, v]) => v !== undefined)
    );
    const docRef = await addDoc(colRef, payload);
    return docRef.id;
  } catch (error) {
    console.error('Error saving calendar event to Firestore:', error);
    return Date.now().toString();
  }
};

export const getCalendarEvents = async (username: string): Promise<CalendarEventData[]> => {
  if (!isFirebaseAvailable()) return [];
  try {
    const targetUserId = auth.currentUser?.uid || username;
    const colRef = collection(db, "users", targetUserId, "data", "calendar", "events");
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as CalendarEventData));
  } catch (error) {
    console.error('Error getting calendar events:', error);
    return [];
  }
};

export const subscribeToCalendarEvents = (
  username: string, 
  callback: (events: CalendarEventData[]) => void
): (() => void) => {
  if (!isFirebaseAvailable()) {
    callback([]);
    return () => {};
  }
  const targetUserId = auth.currentUser?.uid || username;
  const colRef = collection(db, "users", targetUserId, "data", "calendar", "events");
  return onSnapshot(colRef, (snapshot) => {
    const list = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as CalendarEventData));
    callback(list);
  });
};

export const deleteCalendarEvent = async (username: string, eventId: string): Promise<boolean> => {
  if (!isFirebaseAvailable()) return false;
  try {
    const targetUserId = auth.currentUser?.uid || username;
    await deleteDoc(doc(db, "users", targetUserId, "data", "calendar", "events", eventId));
    return true;
  } catch (error) {
    return false;
  }
};

export const updateCalendarEvent = async (
  username: string, 
  eventId: string, 
  updates: Partial<CalendarEventData>
): Promise<boolean> => {
  if (!isFirebaseAvailable()) return false;
  try {
    const targetUserId = auth.currentUser?.uid || username;
    const docRef = doc(db, "users", targetUserId, "data", "calendar", "events", eventId);
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await updateDoc(docRef, cleanUpdates);
    return true;
  } catch (error) {
    return false;
  }
};

export const saveTodoItem = async (
  username: string, 
  todo: Omit<TodoItemData, 'id'>
): Promise<string> => {
  if (!isFirebaseAvailable()) return Date.now().toString();
  try {
    const targetUserId = auth.currentUser?.uid || username;
    const colRef = collection(db, "users", targetUserId, "data", "todo", "items");
    const payload = Object.fromEntries(
      Object.entries({
        ...todo,
        completed: todo.completed || false,
        priority: todo.priority || 'medium',
        createdAt: Date.now(),
      }).filter(([_, v]) => v !== undefined)
    );
    const docRef = await addDoc(colRef, payload);
    return docRef.id;
  } catch (error) {
    console.error('Error saving todo item to Firestore:', error);
    return Date.now().toString();
  }
};

export const getTodoItems = async (username: string): Promise<TodoItemData[]> => {
  if (!isFirebaseAvailable()) return [];
  try {
    const targetUserId = auth.currentUser?.uid || username;
    const colRef = collection(db, "users", targetUserId, "data", "todo", "items");
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as TodoItemData));
  } catch (error) {
    return [];
  }
};

export const subscribeToTodoItems = (
  username: string, 
  callback: (items: TodoItemData[]) => void
): (() => void) => {
  if (!isFirebaseAvailable()) {
    callback([]);
    return () => {};
  }
  const targetUserId = auth.currentUser?.uid || username;
  const colRef = collection(db, "users", targetUserId, "data", "todo", "items");
  return onSnapshot(colRef, (snapshot) => {
    const list = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as TodoItemData));
    callback(list);
  });
};

export const deleteTodoItem = async (username: string, todoId: string): Promise<boolean> => {
  if (!isFirebaseAvailable()) return false;
  try {
    const targetUserId = auth.currentUser?.uid || username;
    await deleteDoc(doc(db, "users", targetUserId, "data", "todo", "items", todoId));
    return true;
  } catch (error) {
    return false;
  }
};

export const toggleTodoItem = async (
  username: string, 
  todoId: string, 
  currentCompleted: boolean
): Promise<boolean> => {
  if (!isFirebaseAvailable()) return false;
  try {
    const targetUserId = auth.currentUser?.uid || username;
    const docRef = doc(db, "users", targetUserId, "data", "todo", "items", todoId);
    await updateDoc(docRef, { completed: !currentCompleted });
    return true;
  } catch (error) {
    return false;
  }
};

export const updateTodoItem = async (
  username: string, 
  todoId: string, 
  updates: Partial<TodoItemData>
): Promise<boolean> => {
  if (!isFirebaseAvailable()) return false;
  try {
    const targetUserId = auth.currentUser?.uid || username;
    const docRef = doc(db, "users", targetUserId, "data", "todo", "items", todoId);
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await updateDoc(docRef, cleanUpdates);
    return true;
  } catch (error) {
    return false;
  }
};

export const getMetricsInsightsCache = async (
  username: string
): Promise<MetricsInsightsCache | null> => {
  if (!isFirebaseAvailable()) return null;
  try {
    const targetUserId = auth.currentUser?.uid || username;
    const docRef = doc(db, "users", targetUserId, "data", "metrics", "insights", "current");
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return docSnap.data() as MetricsInsightsCache;
  } catch (error) {
    console.error('Error getting metrics insights cache:', error);
    return null;
  }
};

export const saveMetricsInsightsCache = async (
  username: string,
  cache: MetricsInsightsCache
): Promise<boolean> => {
  if (!isFirebaseAvailable()) return false;
  try {
    const targetUserId = auth.currentUser?.uid || username;
    const docRef = doc(db, "users", targetUserId, "data", "metrics", "insights", "current");
    await setDoc(docRef, cache, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving metrics insights cache:', error);
    return false;
  }
};

// ==========================================
// DAILY JOURNAL DATA LOG IMPLEMENTATION
// ==========================================

export interface JournalDataLog {
  date: string;
  points: string[];
  updatedAt?: number;
}

export const saveJournalDataLog = async (
  username: string, 
  date: string, 
  points: string[]
): Promise<boolean> => {
  if (!isFirebaseAvailable()) return false;
  try {
    const targetUserId = auth.currentUser?.uid || username;
    const docRef = doc(db, "users", targetUserId, "journal_logs", date);
    await setDoc(docRef, {
      date,
      points,
      updatedAt: Date.now(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving journal log:', error);
    return false;
  }
};

export const getJournalDataLog = async (
  username: string, 
  date: string
): Promise<JournalDataLog | null> => {
  if (!isFirebaseAvailable()) return null;
  try {
    const targetUserId = auth.currentUser?.uid || username;
    const docRef = doc(db, "users", targetUserId, "journal_logs", date);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as JournalDataLog;
    }
    return null;
  } catch (error) {
    console.error('Error getting journal log:', error);
    return null;
  }
};

export const getAllJournalDataLogs = async (
  username: string
): Promise<JournalDataLog[]> => {
  if (!isFirebaseAvailable()) return [];
  try {
    const targetUserId = auth.currentUser?.uid || username;
    const colRef = collection(db, "users", targetUserId, "journal_logs");
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(doc => doc.data() as JournalDataLog);
  } catch (error) {
    console.error('Error getting all journal logs:', error);
    return [];
  }
};

export const subscribeToJournalDataLogs = (
  username: string,
  callback: (logs: JournalDataLog[]) => void
): (() => void) => {
  if (!isFirebaseAvailable()) {
    callback([]);
    return () => {};
  }
  try {
    const targetUserId = auth.currentUser?.uid || username;
    const colRef = collection(db, "users", targetUserId, "journal_logs");
    return onSnapshot(colRef, (snapshot) => {
      const logs = snapshot.docs.map(doc => doc.data() as JournalDataLog);
      callback(logs);
    }, (err) => {
      console.error('Error listening to journal_logs:', err);
      callback([]);
    });
  } catch (error) {
    console.error('Error subscribing to journal logs:', error);
    callback([]);
    return () => {};
  }
};
