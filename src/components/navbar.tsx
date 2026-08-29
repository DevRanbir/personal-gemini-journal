"use client";

import { useAuthContext } from "@/contexts/auth-context";
import { Button } from "@/components/button";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/avatar";

export function NavBar() {
  const { user, isAuthenticated, signOut } = useAuthContext();

  return (
    <nav className="border-b bg-card/50 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-2xl text-foreground hover:text-primary transition-colors">
          Harmony
        </Link>
        
        <div className="flex items-center gap-4">
          {!isAuthenticated ? (
            <Link href="/login">
              <Button>Sign In</Button>
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/journal">
                <Button variant="ghost">Journal</Button>
              </Link>
              <Avatar className="size-8">
                <AvatarImage src={user?.photoURL || undefined} />
                <AvatarFallback className="bg-blue-600 text-white font-bold">
                  {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="sm" onClick={signOut}>
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
