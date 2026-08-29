"use client";

import { useChat } from '@/contexts/chat-context';
import { useBookmarks } from '@/contexts/bookmarks-context';
import { LoadingSkeleton } from '@/components/loading-skeleton';

interface FirebaseLoaderProps {
  children: React.ReactNode;
}

export function FirebaseLoader({ children }: FirebaseLoaderProps) {
  const { isLoading: chatLoading } = useChat();
  const { isLoading: bookmarksLoading } = useBookmarks();

  if (chatLoading || bookmarksLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <LoadingSkeleton />
        <p className="text-sm text-muted-foreground">
          Connecting to Firebase...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
