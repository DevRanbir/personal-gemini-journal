import { LoadingSkeleton } from '@/components/loading-skeleton';

export default function Loading() {
  return (
    <LoadingSkeleton 
      header={{ 
        titleWidth: "w-1/4",
        subtitleWidth: "w-1/2"
      }}
      content={{ 
        layout: 'list',
        itemCount: 8,
        showCards: true
      }}
      showAppSidebar={true}
    />
  );
}