"use client";

import * as React from "react";
import { useAuthContext } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/sidebar";
import { RiExpandUpDownLine, RiAddLine, RiLogoutBoxLine } from "@remixicon/react";

export function TeamSwitcher({
  teams,
}: {
  teams: {
    name: string;
    logo: string;
  }[];
}) {
  const [activeTeam, setActiveTeam] = React.useState(teams[0] ?? null);
  const [mounted, setMounted] = React.useState(false);
  const { user, isAuthenticated, signOut } = useAuthContext();
  const { state } = useSidebar();
  const router = useRouter();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (mounted && teams.length > 0 && (!activeTeam || activeTeam.name === "Loading...")) {
      setActiveTeam(teams[0]);
    }
  }, [teams, activeTeam, mounted]);

  if (!teams.length) return null;

  const isUserSignedIn = isAuthenticated && user;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size={state === "collapsed" ? "sm" : "lg"}
              className={`data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground [&>svg]:size-auto transition-all duration-200 ease-in-out ${
                state === "collapsed" 
                  ? "gap-0 justify-center w-10 h-10 p-1 flex items-center" 
                  : "gap-3"
              }`}
              tooltip={state === "collapsed" ? (mounted ? (activeTeam?.name ?? "Select a User") : "Loading...") : undefined}
            >
              <div className={`flex items-center justify-center rounded-md overflow-hidden bg-sidebar-primary text-sidebar-primary-foreground relative after:rounded-[inherit] after:absolute after:inset-0 after:shadow-[0_1px_2px_0_rgb(0_0_0/.05),inset_0_1px_0_0_rgb(255_255_255/.12)] after:pointer-events-none transition-all duration-200 ease-in-out ${
                state === "collapsed" 
                  ? "w-8 h-8 min-w-8 min-h-8" 
                  : "aspect-square size-9"
              }`}>
                {mounted && activeTeam && activeTeam.logo ? (
                  <img
                    src={activeTeam.logo}
                    width={32}
                    height={32}
                    alt={activeTeam.name}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(activeTeam.name)}&background=2563eb&color=fff&bold=true`;
                      if (target.src !== fallback) {
                        target.src = fallback;
                      }
                    }}
                    className={`object-cover transition-all duration-200 ease-in-out ${
                      state === "collapsed" ? "w-8 h-8" : "w-full h-full"
                    }`}
                  />
                ) : (
                  <span className={`font-semibold transition-all duration-200 ease-in-out ${
                    state === "collapsed" ? "text-sm" : "text-lg"
                  }`} suppressHydrationWarning>
                    {mounted ? (activeTeam?.name?.charAt(0)?.toUpperCase() || "U") : "L"}
                  </span>
                )}
              </div>
              {state !== "collapsed" && (
                <>
                  <div className="grid flex-1 text-left text-base leading-tight opacity-100 transition-opacity duration-200 ease-in-out">
                    <span className="truncate font-medium" suppressHydrationWarning>
                      {mounted ? (activeTeam?.name ?? "Select a User") : "Loading..."}
                    </span>
                    {!isUserSignedIn && activeTeam?.name === "Not signed in" && (
                      <span className="text-xs text-muted-foreground">
                        Click to sign in
                      </span>
                    )}
                  </div>
                  <RiExpandUpDownLine
                    className="ms-auto text-sidebar-foreground/50 opacity-100 transition-opacity duration-200 ease-in-out"
                    size={20}
                    aria-hidden="true"
                  />
                </>
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="dark w-[240px] rounded-md z-[60]"
            align={state === "collapsed" ? "start" : "start"}
            side={state === "collapsed" ? "right" : "bottom"}
            sideOffset={state === "collapsed" ? 12 : 4}
            alignOffset={state === "collapsed" ? -4 : 0}
          >
            <DropdownMenuLabel className="uppercase text-muted-foreground/70 text-xs">
              {isUserSignedIn ? "User" : "Authentication"}
            </DropdownMenuLabel>
            {isUserSignedIn ? (
              teams.map((team) => (
                <DropdownMenuItem
                  key={team.name}
                  onClick={() => setActiveTeam(team)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-md overflow-hidden bg-sidebar-primary text-sidebar-primary-foreground">
                    {team.logo ? (
                      <img 
                        src={team.logo} 
                        width={36} 
                        height={36} 
                        alt={team.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-semibold">
                        {team.name?.charAt(0)?.toUpperCase() || "U"}
                      </span>
                    )}
                  </div>
                  {team.name}
                </DropdownMenuItem>
              ))
            ) : (
              <DropdownMenuItem 
                className="gap-2 p-2"
                onClick={() => router.push('/login')}
              >
                <RiAddLine className="opacity-60" size={16} aria-hidden="true" />
                <div className="font-medium">Sign In / Sign Up</div>
              </DropdownMenuItem>
            )}
            
            {isUserSignedIn && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="gap-2 p-2 text-destructive focus:text-destructive"
                  onClick={() => signOut()}
                >
                  <RiLogoutBoxLine className="opacity-60" size={16} aria-hidden="true" />
                  <div className="font-medium">Sign Out</div>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
