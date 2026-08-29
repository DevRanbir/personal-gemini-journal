"use client";

import * as React from "react";
import { Button } from "@/components/button";
import { useSidebar } from "@/components/sidebar";
import { cn } from "@/lib/utils";
import { RiSkipLeftLine, RiSkipRightLine } from "@remixicon/react";

export function SidebarToggle({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar, open } = useSidebar();

  return (
    <Button
      data-sidebar="trigger"
      variant="ghost"
      size="icon"
      className={cn(
        "text-muted-foreground/70 hover:text-foreground",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      {open ? (
        <RiSkipLeftLine className="size-5.5" size={22} aria-hidden="true" />
      ) : (
        <RiSkipRightLine className="size-5.5" size={22} aria-hidden="true" />
      )}
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}
