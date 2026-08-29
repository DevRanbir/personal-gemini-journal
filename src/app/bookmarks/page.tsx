'use client';

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
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { ScrollArea } from "@/components/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
import { ClientRouteGuard } from "@/components/client-route-guard";
import { useBookmarks } from "@/contexts/bookmarks-context";
import { ChatMessage } from "@/components/chat-message";
import { FormattedMessage } from "@/components/formatted-message";
import {
  RiBookmarkLine,
  RiDeleteBinLine,
  RiTimeLine,
  RiSearchLine,
  RiFilterLine,
  RiSortAsc,
  RiSortDesc,
  RiFileCopyLine,
  RiCheckLine,
} from "@remixicon/react";
import { useAuth } from "@/contexts/auth-context";
import { useState as useReactState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useState, useMemo } from "react";

export default function BookmarksPage() {
  const { user } = useAuth();
  const { bookmarks, removeBookmark } = useBookmarks();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterBy, setFilterBy] = useState("all");
  const [copiedId, setCopiedId] = useReactState<string | null>(null);

  const filteredAndSortedBookmarks = useMemo(() => {
    let filtered = bookmarks;
    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(bookmark =>
        bookmark.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    if (filterBy !== "all") {
      filtered = filtered.filter(bookmark => {
        switch (filterBy) {
          case "short":
            return bookmark.content.length <= 200;
          case "medium":
            return bookmark.content.length > 200 && bookmark.content.length <= 500;
          case "long":
            return bookmark.content.length > 500;
          case "code":
            return bookmark.content.includes('```') || 
                   bookmark.content.includes('function') || 
                   bookmark.content.includes('const ') || 
                   bookmark.content.includes('import ') ||
                   bookmark.content.includes('export ') ||
                   (bookmark.content.includes('{') && bookmark.content.includes('}'));
          case "today":
            const today = new Date();
            const bookmarkDate = new Date(bookmark.bookmarkedAt);
            return bookmarkDate.toDateString() === today.toDateString();
          case "week":
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return new Date(bookmark.bookmarkedAt) >= weekAgo;
          case "month":
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return new Date(bookmark.bookmarkedAt) >= monthAgo;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.bookmarkedAt).getTime() - new Date(a.bookmarkedAt).getTime();
        case "oldest":
          return new Date(a.bookmarkedAt).getTime() - new Date(b.bookmarkedAt).getTime();
        case "content":
          return a.content.localeCompare(b.content);
        case "length":
          return b.content.length - a.content.length;
        default:
          return 0;
      }
    });

    return sorted;
  }, [bookmarks, searchQuery, sortBy, filterBy]);

  const handleRemoveBookmark = (id: string) => {
    removeBookmark(id);
  };

  // Helper to parse markdown table and convert to dictionary-like string
  function markdownTableToDict(markdown: string): string | null {
    // Find the first markdown table in the string
    const tableRegex = /((?:^|\n)\|.+\|\n\|[\s:-]+\|(?:\n\|.*\|)+)/m;
    const match = markdown.match(tableRegex);
    if (!match) return null;
    const table = match[1].trim();
    const lines = table.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 3) return null;
    const headers = lines[0].split('|').map(h => h.trim()).filter(Boolean);
    // Remove separator row
    const rows = lines.slice(2).map(row => row.split('|').map(cell => cell.trim()).filter(Boolean));
    // Build dictionary-like string
    let dictString = '';
    rows.forEach((row, i) => {
      dictString += `Row ${i+1}: {\n`;
      headers.forEach((header, j) => {
        dictString += `  ${header}: ${row[j] ?? ''}\n`;
      });
      dictString += '}\n';
    });
    return dictString.trim();
  }

  const handleCopyBookmark = async (content: string, id: string) => {
    try {
      let toCopy = content;
      const dict = markdownTableToDict(content);
      if (dict) {
        toCopy = dict;
      }
      await navigator.clipboard.writeText(toCopy);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (e) {
      // Optionally handle error
    }
  };

  return (
    <ClientRouteGuard requireAuth={false} lightLoading={true}>
      <SidebarProvider>
        <AppSidebar collapsible="hidden" />
        <SidebarInset className="bg-sidebar group/sidebar-inset">
          <div className="flex h-[calc(100svh)] bg-[hsl(240_5%_92.16%)] md:rounded-s-3xl md:group-peer-data-[state=collapsed]/sidebar-inset:rounded-s-none transition-all ease-in-out duration-300">
            <ScrollArea className="flex-1 [&>div>div]:h-full w-full shadow-md md:rounded-s-[inherit] min-[1024px]:rounded-e-3xl bg-background">
              <div className="h-full flex flex-col px-4 md:px-6 lg:px-8">
                {/* Header */}
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
                            <BreadcrumbPage>Bookmarks</BreadcrumbPage>
                          </BreadcrumbItem>
                        </BreadcrumbList>
                      </Breadcrumb>
                      {!user && (
                        <span className="text-[11px] font-medium text-amber-500/90 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                          Sample Data • Sign in to sync
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 -my-2 -me-2">
                      <span className="text-sm text-muted-foreground/70 px-2">
                        {filteredAndSortedBookmarks.length} of {bookmarks.length} bookmark{bookmarks.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Search and Filter Bar */}
                <div className="px-4 md:px-6 lg:px-8 py-4 bg-background border-b border-border/40">
                  <div className="max-w-3xl mx-auto">
                    <div className="flex flex-col sm:flex-row gap-3">
                      {/* Search Input */}
                      <div className="relative flex-1">
                        <RiSearchLine 
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/70" 
                          size={16} 
                        />
                        <Input
                          placeholder="Search bookmarks..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 h-9"
                        />
                      </div>
                      
                      {/* Filter and Sort */}
                      <div className="flex gap-3">
                        <Select value={filterBy} onValueChange={setFilterBy}>
                          <SelectTrigger className="w-40 h-9">
                            <RiFilterLine size={14} className="mr-1" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Show All</SelectItem>
                            <SelectItem value="short">Short</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="long">Long</SelectItem>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="week">This Week</SelectItem>
                            <SelectItem value="month">This Month</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Select value={sortBy} onValueChange={setSortBy}>
                          <SelectTrigger className="w-40 h-9">
                            {sortBy === "oldest" ? (
                              <RiSortAsc size={14} className="mr-1" />
                            ) : (
                              <RiSortDesc size={14} className="mr-1" />
                            )}
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="newest">Newest First</SelectItem>
                            <SelectItem value="oldest">Oldest First</SelectItem>
                            <SelectItem value="content">A-Z Content</SelectItem>
                            <SelectItem value="length">By Length</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="relative grow">
                  <div className="max-w-3xl mx-auto mt-4 space-y-4">
                    {filteredAndSortedBookmarks.length === 0 ? (
                      <div className="text-center my-16">
                        {searchQuery || filterBy !== "all" ? (
                          <>
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-muted rounded-full mb-4">
                              <RiSearchLine
                                className="text-muted-foreground/70"
                                size={20}
                                aria-hidden="true"
                              />
                            </div>
                            <h3 className="text-lg font-medium text-foreground mb-2">
                              No results found
                            </h3>
                            <p className="text-muted-foreground/70 max-w-sm mx-auto">
                              Try adjusting your search or filter to find what you&apos;re looking for.
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-muted rounded-full mb-4">
                              <RiBookmarkLine
                                className="text-muted-foreground/70"
                                size={20}
                                aria-hidden="true"
                              />
                            </div>
                            <h3 className="text-lg font-medium text-foreground mb-2">
                              No bookmarks yet
                            </h3>
                            <p className="text-muted-foreground/70 max-w-sm mx-auto">
                              Start bookmarking your favorite chat messages to access them later.
                            </p>
                          </>
                        )}
                      </div>
                    ) : (
                      <>
                        {searchQuery || filterBy !== "all" || sortBy !== "newest" ? (
                          <div className="text-center my-6">
                            <div className="inline-flex items-center bg-white rounded-full border border-black/[0.08] shadow-xs text-xs font-medium py-1 px-3 text-foreground/80 dark:bg-sidebar border-white/[0.12]">
                              <RiBookmarkLine
                                className="me-1.5 text-muted-foreground/70 -ms-1"
                                size={12}
                                aria-hidden="true"
                              />
                              {filteredAndSortedBookmarks.length} Result{filteredAndSortedBookmarks.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center my-6">
                            <div className="inline-flex items-center bg-white rounded-full border border-black/[0.08] shadow-xs text-xs font-medium py-1 px-3 text-foreground/80 dark:bg-sidebar border-white/[0.12]">
                              <RiBookmarkLine
                                className="me-1.5 text-muted-foreground/70 -ms-1"
                                size={12}
                                aria-hidden="true"
                              />
                              All Saved Messages
                            </div>
                          </div>
                        )}

                        {filteredAndSortedBookmarks.map((bookmark) => (
                          <div key={bookmark.id} className="relative group">
                            {/* Bookmark metadata */}
                            <div className="flex items-center justify-between mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                                <RiTimeLine size={10} />
                                <span>
                                  Bookmarked {formatDistanceToNow(bookmark.bookmarkedAt, { addSuffix: true })}
                                </span>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopyBookmark(bookmark.content, bookmark.id)}
                                  className="h-6 px-2 text-muted-foreground hover:text-foreground"
                                >
                                  {copiedId === bookmark.id ? (
                                    <RiCheckLine size={12} />
                                  ) : (
                                    <RiFileCopyLine size={12} />
                                  )}
                                  <span className="sr-only">Copy bookmark</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveBookmark(bookmark.id)}
                                  className="h-6 px-2 text-muted-foreground hover:text-destructive"
                                >
                                  <RiDeleteBinLine size={12} />
                                  <span className="sr-only">Remove bookmark</span>
                                </Button>
                              </div>
                            </div>
                            
                            {/* Message */}
                            <ChatMessage 
                              isUser={bookmark.isUser} 
                              userProfileImage={bookmark.userProfileImage}
                            >
                              <FormattedMessage content={bookmark.content} />
                            </ChatMessage>
                            
                            {/* Separator */}
                            <div className="h-px bg-gradient-to-r from-transparent via-black/[0.06] to-transparent mt-4" />
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {/* Footer spacing */}
                <div className="pb-8" />
              </div>
            </ScrollArea>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ClientRouteGuard>
  );
}
