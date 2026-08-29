"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import { RiChat3Line } from "@remixicon/react";
import { Button } from "@/components/button";
import { Sheet, SheetTitle, SheetContent, SheetDescription } from "@/components/sheet";
import * as React from "react";
import { ScrollArea } from "@/components/scroll-area";
import { ChatHistorySection } from "@/components/chat-history-section";

type SettingsPanelContext = {
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  togglePanel: () => void;
};

const SettingsPanelContext = React.createContext<SettingsPanelContext | null>(
  null,
);

function useSettingsPanel() {
  const context = React.useContext(SettingsPanelContext);
  if (!context) {
    throw new Error(
      "useSettingsPanel must be used within a SettingsPanelProvider.",
    );
  }
  return context;
}

const SettingsPanelProvider = ({ children }: { children: React.ReactNode }) => {
  const isMobile = useIsMobile(1024);
  const [openMobile, setOpenMobile] = React.useState(false);

  // Helper to toggle the sidebar.
  const togglePanel = React.useCallback(() => {
    return isMobile && setOpenMobile((open) => !open);
  }, [isMobile, setOpenMobile]);

  const contextValue = React.useMemo<SettingsPanelContext>(
    () => ({
      isMobile,
      openMobile,
      setOpenMobile,
      togglePanel,
    }),
    [isMobile, openMobile, setOpenMobile, togglePanel],
  );

  return (
    <SettingsPanelContext.Provider value={contextValue}>
      {children}
    </SettingsPanelContext.Provider>
  );
};
SettingsPanelProvider.displayName = "SettingsPanelProvider";

const SettingsPanelContent = () => {
  return (
    <div className="flex-1 overflow-hidden">
      <ChatHistorySection />
    </div>
  );
};
SettingsPanelContent.displayName = "SettingsPanelContent";

const SettingsPanel = () => {
  const { isMobile, openMobile, setOpenMobile } = useSettingsPanel();

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent className="w-72 px-4 md:px-6 py-0 bg-background/95 backdrop-blur-md border-border/60 shadow-xl [&>button]:hidden">
          <SheetTitle className="hidden">Journal History</SheetTitle>
          <SheetDescription className="hidden">View and manage previous journal entries</SheetDescription>
          <div className="flex h-full w-full flex-col">
            <SettingsPanelContent />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="w-[300px] px-4 md:px-6 h-full flex flex-col bg-background/50 backdrop-blur-sm border-l border-border/60">
        <SettingsPanelContent />
      </div>
    </ScrollArea>
  );
};
SettingsPanel.displayName = "SettingsPanel";

const SettingsPanelTrigger = ({
  onClick,
}: {
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) => {
  const { isMobile, togglePanel } = useSettingsPanel();

  if (!isMobile) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      className="px-3 py-2 h-9 bg-background/20 backdrop-blur-sm hover:bg-background/40 active:bg-background/60 border border-border/30 hover:border-border/60 transition-all duration-200 shadow-sm hover:shadow-md"
      onClick={(event) => {
        onClick?.(event);
        togglePanel();
      }}
    >
      <RiChat3Line
        className="text-muted-foreground hover:text-foreground transition-colors duration-200 size-5"
        size={20}
        aria-hidden="true"
      />
      <span className="max-sm:sr-only ml-2 text-sm font-medium">History</span>
    </Button>
  );
};
SettingsPanelTrigger.displayName = "SettingsPanelTrigger";

export {
  SettingsPanel,
  SettingsPanelProvider,
  SettingsPanelTrigger,
  useSettingsPanel,
};
