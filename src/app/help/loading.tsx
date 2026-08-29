import { LoadingSkeleton } from '@/components/loading-skeleton';

export default function Loading() {
  const customHelpContent = (
    <div className="space-y-6">
      {/* Tab skeleton */}
      <div className="flex space-x-4 border-b pb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-gray-200 rounded-lg w-24 animate-pulse"></div>
        ))}
      </div>
      
      {/* Search bar skeleton */}
      <div className="h-12 bg-gray-200 rounded-lg w-full animate-pulse"></div>
      
      {/* FAQ items skeleton */}
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white border rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse"></div>
              <div className="h-6 w-6 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="h-6 bg-gray-200 rounded w-20 animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <LoadingSkeleton 
      header={{ 
        titleWidth: "w-1/3",
        subtitleWidth: "w-1/2"
      }}
      content={{ 
        layout: 'custom',
        customContent: customHelpContent
      }}
      showAppSidebar={true}
    />
  );
}