'use client';

interface SkeletonHeaderConfig {
  showHeader?: boolean;
  titleWidth?: string;
  subtitleWidth?: string;
  titleHeight?: string;
  subtitleHeight?: string;
}

interface SkeletonContentConfig {
  layout?: 'grid' | 'list' | 'sidebar' | 'chat' | 'custom';
  gridCols?: string;
  itemCount?: number;
  showCards?: boolean;
  customContent?: React.ReactNode;
}

interface LoadingSkeletonProps {
  header?: SkeletonHeaderConfig;
  content?: SkeletonContentConfig;
  className?: string;
  containerClassName?: string;
  showAppSidebar?: boolean; // New prop to show sidebar layout
}

export function LoadingSkeleton({ 
  header = {}, 
  content = {}, 
  className = "",
  containerClassName = "",
  showAppSidebar = true
}: LoadingSkeletonProps) {
  const {
    showHeader = true,
    titleWidth = "w-1/3",
    subtitleWidth = "w-2/3", 
    titleHeight = "h-8",
    subtitleHeight = "h-4"
  } = header;

  const {
    layout = 'grid',
    gridCols = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    itemCount = 6,
    showCards = true,
    customContent
  } = content;

  // Render sidebar skeleton
  const renderSidebarSkeleton = () => (
    <div className="w-[280px] bg-sidebar border-r border-sidebar-border flex-shrink-0">
      <div className="p-4 space-y-4">
        {/* Team switcher skeleton */}
        <div className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
        
        {/* Navigation sections */}
        <div className="space-y-6">
          {/* Main nav */}
          <div>
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-3 animate-pulse"></div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-8 bg-gray-200 rounded flex-1 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Secondary nav */}
          <div>
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-3 animate-pulse"></div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-8 bg-gray-200 rounded flex-1 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Subscription info skeleton */}
        <div className="mt-auto pt-4 border-t border-sidebar-border">
          <div className="h-16 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      </div>
    </div>
  );

  const renderGridLayout = () => (
    <div className={`grid ${gridCols} gap-6`}>
      {[...Array(itemCount)].map((_, i) => (
        <div key={i} className={`${showCards ? 'bg-white border rounded-lg p-6' : 'space-y-4'}`}>
          <div className="h-6 bg-gray-200 rounded-lg w-3/4 mb-4 animate-pulse"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6 animate-pulse"></div>
          </div>
          <div className="mt-4 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      ))}
    </div>
  );

  const renderListLayout = () => (
    <div className="space-y-4">
      {[...Array(itemCount)].map((_, i) => (
        <div key={i} className={`${showCards ? 'bg-white border rounded-lg p-4' : 'border-b pb-4'}`}>
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse flex-shrink-0"></div>
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-gray-200 rounded w-1/3 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderChatLayout = () => (
    <div className="flex flex-col h-full">
      {/* Chat header skeleton */}
      <div className="py-5 bg-background sticky top-0 z-10 border-b border-gray-200">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
            <div className="flex items-center space-x-2">
              <div className="h-5 bg-gray-200 rounded w-16 animate-pulse"></div>
              <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-5 bg-gray-200 rounded w-12 animate-pulse"></div>
            </div>
          </div>
          <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
      
      {/* Chat messages area */}
      <div className="flex-1 p-4 space-y-4 overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
              i % 2 === 0 ? 'bg-gray-200' : 'bg-blue-200'
            } animate-pulse`}>
              <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-300 rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Chat input skeleton */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-end space-x-2">
          <div className="flex-1 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      </div>
    </div>
  );

  const renderMainContent = () => {
    if (customContent) return customContent;
    
    switch (layout) {
      case 'list':
        return renderListLayout();
      case 'chat':
        return renderChatLayout();
      case 'grid':
      default:
        return renderGridLayout();
    }
  };

  // If not showing app sidebar, render simple layout
  if (!showAppSidebar) {
    return (
      <div className={`min-h-screen bg-background p-6 ${className}`}>
        <div className={`max-w-7xl mx-auto ${containerClassName}`}>
          {showHeader && (
            <div className="mb-8">
              <div className={`${titleHeight} bg-gray-200 rounded-lg ${titleWidth} mb-4 animate-pulse`}></div>
              <div className={`${subtitleHeight} bg-gray-200 rounded-lg ${subtitleWidth} animate-pulse`}></div>
            </div>
          )}
          {renderMainContent()}
        </div>
      </div>
    );
  }

  // Render with sidebar layout (matching app structure)
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar skeleton */}
      {renderSidebarSkeleton()}
      
      {/* Main content area */}
      <div className="flex-1 bg-sidebar">
        <div className="h-full bg-[hsl(240_5%_92.16%)] md:rounded-s-3xl">
          <div className="h-full bg-background shadow-md md:rounded-s-[inherit] min-[1024px]:rounded-e-3xl">
            <div className={`h-full flex flex-col ${className}`}>
              {layout === 'chat' ? (
                renderChatLayout()
              ) : (
                <div className="p-4 md:p-6 lg:p-8 flex-1 overflow-auto">
                  {showHeader && (
                    <div className="mb-8">
                      <div className={`${titleHeight} bg-gray-200 rounded-lg ${titleWidth} mb-4 animate-pulse`}></div>
                      <div className={`${subtitleHeight} bg-gray-200 rounded-lg ${subtitleWidth} animate-pulse`}></div>
                    </div>
                  )}
                  {renderMainContent()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoadingSkeleton;
