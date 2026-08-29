"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/auth-context';
import { 
  saveBookmark, 
  getBookmarks, 
  removeBookmark as removeFirebaseBookmark, 
  subscribeToBookmarks,
  BookmarkData 
} from '@/lib/firebase-service';
import { getChatOwnerId } from '@/lib/local-user';
import { showHarmonyToast } from '@/components/progress-toast';

export interface BookmarkedMessage {
  id: string;
  content: string;
  timestamp: Date;
  isUser: boolean;
  userProfileImage?: string;
  bookmarkedAt: Date;
}

type StoredBookmark = Omit<BookmarkedMessage, 'timestamp' | 'bookmarkedAt'> & {
  timestamp: string | number | Date;
  bookmarkedAt: string | number | Date;
};

interface BookmarksContextType {
  bookmarks: BookmarkedMessage[];
  addBookmark: (message: Omit<BookmarkedMessage, 'bookmarkedAt'>) => Promise<void>;
  removeBookmark: (id: string) => Promise<void>;
  isBookmarked: (id: string) => boolean;
  clearAllBookmarks: () => void;
  isLoading: boolean;
}

const BookmarksContext = createContext<BookmarksContextType | undefined>(undefined);

export function BookmarksProvider({ children }: { children: React.ReactNode }) {
  const [bookmarks, setBookmarks] = useState<BookmarkedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, loading: authLoading } = useAuthContext();
  const bookmarkOwnerId = getChatOwnerId(user);

  // Convert Firebase bookmark data to component format
  const convertFromFirebase = (firebaseBookmarks: BookmarkData[]): BookmarkedMessage[] => {
    return firebaseBookmarks.map(bookmark => ({
      ...bookmark,
      timestamp: new Date(bookmark.timestamp),
      bookmarkedAt: new Date(bookmark.bookmarkedAt),
    }));
  };

  // Convert component bookmark to Firebase format
  const convertToFirebase = (bookmark: Omit<BookmarkedMessage, 'bookmarkedAt'>): BookmarkData => {
    return {
      ...bookmark,
      timestamp: bookmark.timestamp.getTime(),
      bookmarkedAt: Date.now(),
    };
  };

  // Load bookmarks when user is available
  useEffect(() => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }

    let unsubscribe: (() => void) | null = null;

    const loadBookmarks = async () => {
      try {
        // Subscribe to real-time updates
        unsubscribe = subscribeToBookmarks(bookmarkOwnerId, (firebaseBookmarks) => {
          const convertedBookmarks = convertFromFirebase(firebaseBookmarks);
          setBookmarks(convertedBookmarks);
          setIsLoading(false);
        });
      } catch (error) {
        console.error('Failed to load bookmarks:', error);
        // Fallback to localStorage if Firebase fails
        const savedBookmarks = localStorage.getItem('harmony-bookmarks');
        if (savedBookmarks) {
          try {
            const parsed = JSON.parse(savedBookmarks) as StoredBookmark[];
            const bookmarksWithDates = parsed.map((bookmark) => ({
              ...bookmark,
              timestamp: new Date(bookmark.timestamp),
              bookmarkedAt: new Date(bookmark.bookmarkedAt),
            }));
            setBookmarks(bookmarksWithDates);
          } catch (parseError) {
            console.error('Failed to parse bookmarks from localStorage:', parseError);
          }
        }
        setIsLoading(false);
      }
    };

    loadBookmarks();

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [bookmarkOwnerId]);

  // Save bookmarks to localStorage as backup whenever bookmarks change
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('harmony-bookmarks', JSON.stringify(bookmarks));
    }
  }, [bookmarks, isLoading]);

  const addBookmark = async (message: Omit<BookmarkedMessage, 'bookmarkedAt'>) => {
    try {
      const firebaseBookmark = convertToFirebase(message);
      await saveBookmark(bookmarkOwnerId, firebaseBookmark);
      const bookmark: BookmarkedMessage = {
        ...message,
        bookmarkedAt: new Date(firebaseBookmark.bookmarkedAt),
      };
      setBookmarks(prev => {
        const withoutDuplicate = prev.filter(existing => existing.id !== bookmark.id);
        return [bookmark, ...withoutDuplicate];
      });
      showHarmonyToast({
        title: "Bookmark Saved",
        description: "Message saved to your personal bookmarks",
        iconType: "bookmark",
      });
    } catch (error) {
      console.error('Failed to add bookmark:', error);
      // Fallback to local state update
      const bookmark: BookmarkedMessage = {
        ...message,
        bookmarkedAt: new Date(),
      };
      setBookmarks(prev => [bookmark, ...prev]);
      showHarmonyToast({
        title: "Bookmark Saved",
        description: "Message saved to temporary local bookmarks",
        iconType: "bookmark",
      });
    }
  };

  const removeBookmark = async (id: string) => {
    try {
      await removeFirebaseBookmark(bookmarkOwnerId, id);
      setBookmarks(prev => prev.filter(bookmark => bookmark.id !== id));
      showHarmonyToast({
        title: "Bookmark Removed",
        description: "Message removed from saved bookmarks",
        iconType: "trash",
      });
    } catch (error) {
      console.error('Failed to remove bookmark:', error);
      // Fallback to local state update
      setBookmarks(prev => prev.filter(bookmark => bookmark.id !== id));
      showHarmonyToast({
        title: "Bookmark Removed",
        description: "Message removed from local bookmarks",
        iconType: "trash",
      });
    }
  };

  const isBookmarked = (id: string) => {
    return bookmarks.some(bookmark => bookmark.id === id);
  };

  // Function to clear all bookmarks from memory
  const clearAllBookmarks = () => {
    setBookmarks([]);
    setIsLoading(false);
  };

  return (
    <BookmarksContext.Provider value={{
      bookmarks,
      addBookmark,
      removeBookmark,
      isBookmarked,
      clearAllBookmarks,
      isLoading,
    }}>
      {children}
    </BookmarksContext.Provider>
  );
}

export function useBookmarks() {
  const context = useContext(BookmarksContext);
  if (context === undefined) {
    throw new Error('useBookmarks must be used within a BookmarksProvider');
  }
  return context;
}
