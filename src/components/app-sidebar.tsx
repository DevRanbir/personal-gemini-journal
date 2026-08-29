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
      name: user.displayName || user.email?.split('@')[0] || "User",
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
    <Sidebar {...props} className="dark !border-none z-50">
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
          <SidebarGroupLabel className="uppercase text-sidebar-foreground/50">
            {data.navMain[0]?.title}
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <SidebarMenu>
              {getFilteredNavItems(data.navMain[0]?.items || []).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className="group/menu-button font-medium gap-3 h-9 rounded-md data-[active=true]:hover:bg-transparent data-[active=true]:bg-gradient-to-b data-[active=true]:from-sidebar-primary data-[active=true]:to-sidebar-primary/70 data-[active=true]:shadow-[0_1px_2px_0_rgb(0_0_0/.05),inset_0_1px_0_0_rgb(255_255_255/.12)] [&>svg]:size-auto transition-all duration-300 ease-in-out transform hover:scale-[1.02] active:scale-[0.98]"
                    isActive={isItemActive(item.url)}
                    tooltip={state === "collapsed" ? item.title : undefined}
                  >
                    <Link href={item.url} prefetch={true}>
                      {item.icon && (
                        <item.icon
                          className="text-sidebar-foreground/50 group-data-[active=true]/menu-button:text-sidebar-foreground"
                          size={22}
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
          <SidebarGroupLabel className="uppercase text-sidebar-foreground/50">
            {data.navMain[1]?.title}
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <SidebarMenu>
              {getFilteredSecondaryItems(data.navMain[1]?.items || []).map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.isToggle ? (
                    <SidebarMenuButton
                      className="group/menu-button font-medium gap-3 h-9 rounded-md hover:bg-sidebar-accent [&>svg]:size-auto transition-all duration-300 ease-in-out transform hover:scale-[1.02] active:scale-[0.98]"
                      onClick={toggleSidebar}
                      tooltip={state === "collapsed" ? "Toggle Sidebar" : undefined}
                    >
                      {state === "collapsed" ? (
                        <RiMenuUnfoldLine
                          className="text-sidebar-foreground/50"
                          size={22}
                          aria-hidden="true"
                        />
                      ) : (
                        <RiMenuFoldLine
                          className="text-sidebar-foreground/50"
                          size={22}
                          aria-hidden="true"
                        />
                      )}
                      <span>Toggle Sidebar</span>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton
                      asChild
                      className="group/menu-button font-medium gap-3 h-9 rounded-md [&>svg]:size-auto transition-all duration-300 ease-in-out transform hover:scale-[1.02] active:scale-[0.98]"
                      isActive={isItemActive(item.url)}
                      tooltip={state === "collapsed" ? item.title : undefined}
                    >
                      <Link href={item.url} prefetch={true}>
                        {item.icon && (
                          <item.icon
                            className="text-sidebar-foreground/50 group-data-[active=true]/menu-button:text-primary"
                            size={22}
                            aria-hidden="true"
                          />
                        )}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}
