"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthContext } from "@/contexts/auth-context";
import { getChatOwnerId, getUserAvatarUrl } from "@/lib/local-user";

import { TeamSwitcher } from "@/components/team-switcher";
import { Button } from "@/components/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/sidebar";
import { useTheme } from "@/contexts/theme-context";
import {
  RiBardLine,
  RiUser5Line,
  RiSeedlingLine,
  RiBookmarkLine,
  RiMenuFoldLine,
  RiMenuUnfoldLine,
  RiCalendarEventLine,
  RiCheckDoubleLine,
  RiBookOpenLine,
  RiSunLine,
  RiMoonLine,
} from "@remixicon/react";

// Navigation data
const navData = {
  navMain: [
    {
      title: "Harmony",
      url: "#",
      items: [
        {
          title: "Journal",
          url: "/journal",
          icon: RiBookOpenLine,
        },
        {
          title: "Daily Logs",
          url: "/calendar",
          icon: RiCalendarEventLine,
        },
        {
          title: "Todo",
          url: "/todo",
          icon: RiCheckDoubleLine,
        },
        {
          title: "Bookmarks",
          url: "/bookmarks",
          icon: RiBookmarkLine,
        },
        {
          title: "Metrics",
          url: "/data",
          icon: RiUser5Line,
        }
      ],
    },
    {
      title: "More",
      url: "#",
      items: [
        {
          title: "About",
          url: "/",
          icon: RiBardLine,
        },
        {
          title: "Help Centre",
          url: "/help",
          icon: RiSeedlingLine,
        },
        {
          title: "Toggle Sidebar",
          url: "#",
          icon: null,
          isToggle: true,
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuthContext();
  const { state, toggleSidebar, isMobile, setOpenMobile } = useSidebar();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => {
    setMounted(true);
  }, []);
  
  // Create teams data based on user information
  const teams = React.useMemo(() => {
    // Show consistent data until mounted and loaded
    if (!mounted || isLoading) {
      return [{
        name: "Loading...",
        logo: "",
      }];
    }
    
    if (!isAuthenticated || !user) {
      return [{
        name: "Not signed in",
        logo: "",
      }];
    }

    return [{
      name: user.displayName || (typeof user.email === 'string' ? user.email.split('@')[0] : "User"),
      logo: getUserAvatarUrl(user),
    }];
  }, [user, isAuthenticated, isLoading, mounted]);

  const data = {
    teams,
    navMain: navData.navMain,
  };
  const userDataUrl = user ? `/${encodeURIComponent(user.username || getChatOwnerId(user))}/data` : "/chat";

  // Filter navigation items based on authentication status
  const getFilteredNavItems = (items: typeof navData.navMain[0]["items"]) => {
    if (!isAuthenticated || !user) {
      // Exclude Metrics for non-authenticated users, but keep Bookmarks accessible in sample mode
      return items.filter(item => item.title !== "Metrics");
    }
    // If user is signed in, show all items
    return items.map(item => (
      item.title === "Metrics"
        ? { ...item, url: userDataUrl }
        : item
    ));
  };

  // Filter secondary navigation items (More section)
  const getFilteredSecondaryItems = (items: typeof navData.navMain[1]["items"]) => {
    return items;
  };
  
  // Function to check if an item is active based on current path
  const isItemActive = (itemUrl: string) => {
    if (itemUrl === "/") {
      return pathname === "/";
    }
    if (itemUrl === "/chat") {
      return pathname === "/chat";
    }
    if (itemUrl === "/login") {
      return pathname === "/login";
    }
    if (itemUrl.endsWith("/data")) {
      return pathname.includes("/data");
    }
    if (itemUrl === "/bookmarks") {
      return pathname === "/bookmarks";
    }
    return pathname === itemUrl;
  };

  return (
    <Sidebar {...props} className="z-50 border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* Mobile close button */}
      {isMobile && (
        <div className="absolute top-4 right-4 z-50 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpenMobile(false)}
            className="h-8 w-8 bg-sidebar-accent/50 hover:bg-sidebar-accent text-sidebar-foreground rounded-full shadow-lg"
          >
            <RiMenuFoldLine className="h-4 w-4" />
            <span className="sr-only">Close sidebar</span>
          </Button>
        </div>
      )}
      
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        {/* We only show the first parent group */}
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase text-sidebar-foreground/60 font-bold text-[10px] tracking-wider">
            {data.navMain[0]?.title}
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <SidebarMenu>
              {getFilteredNavItems(data.navMain[0]?.items || []).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className="group/menu-button font-medium gap-3 h-9 rounded-lg text-sidebar-foreground/80 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-bold hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground [&>svg]:size-auto transition-all duration-200 ease-in-out"
                    isActive={isItemActive(item.url)}
                    tooltip={state === "collapsed" ? item.title : undefined}
                  >
                    <Link href={item.url} prefetch={true}>
                      {item.icon && (
                        <item.icon
                          className="text-sidebar-foreground/70 group-data-[active=true]/menu-button:text-sidebar-accent-foreground group-hover/menu-button:text-sidebar-accent-foreground"
                          size={20}
                          aria-hidden="true"
                        />
                      )}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {/* Secondary Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase text-sidebar-foreground/60 font-bold text-[10px] tracking-wider">
            {data.navMain[1]?.title}
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <SidebarMenu>
              {getFilteredSecondaryItems(data.navMain[1]?.items || []).map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.isToggle ? (
                    <SidebarMenuButton
                      className="group/menu-button font-medium gap-3 h-9 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground [&>svg]:size-auto transition-all duration-200 ease-in-out cursor-pointer"
                      onClick={toggleSidebar}
                      tooltip={state === "collapsed" ? "Toggle Sidebar" : undefined}
                    >
                      {state === "collapsed" ? (
                        <RiMenuUnfoldLine
                          className="text-sidebar-foreground/70 group-hover/menu-button:text-sidebar-accent-foreground"
                          size={20}
                          aria-hidden="true"
                        />
                      ) : (
                        <RiMenuFoldLine
                          className="text-sidebar-foreground/70 group-hover/menu-button:text-sidebar-accent-foreground"
                          size={20}
                          aria-hidden="true"
                        />
                      )}
                      <span>Toggle Sidebar</span>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton
                      asChild
                      className="group/menu-button font-medium gap-3 h-9 rounded-lg text-sidebar-foreground/80 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-bold hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground [&>svg]:size-auto transition-all duration-200 ease-in-out"
                      isActive={isItemActive(item.url)}
                      tooltip={state === "collapsed" ? item.title : undefined}
                    >
                      <Link href={item.url} prefetch={true}>
                        {item.icon && (
                          <item.icon
                            className="text-sidebar-foreground/70 group-data-[active=true]/menu-button:text-sidebar-accent-foreground group-hover/menu-button:text-sidebar-accent-foreground"
                            size={20}
                            aria-hidden="true"
                          />
                        )}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}

              {/* Theme Toggle Button */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="group/menu-button font-medium gap-3 h-9 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground [&>svg]:size-auto transition-all duration-200 ease-in-out cursor-pointer"
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                  tooltip={state === "collapsed" ? (resolvedTheme === "dark" ? "Light Mode" : "Dark Mode") : undefined}
                >
                  {resolvedTheme === "dark" ? (
                    <RiSunLine
                      className="text-sidebar-foreground/70 group-hover/menu-button:text-sidebar-accent-foreground"
                      size={20}
                      aria-hidden="true"
                    />
                  ) : (
                    <RiMoonLine
                      className="text-sidebar-foreground/70 group-hover/menu-button:text-sidebar-accent-foreground"
                      size={20}
                      aria-hidden="true"
                    />
                  )}
                  <span>{resolvedTheme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}
