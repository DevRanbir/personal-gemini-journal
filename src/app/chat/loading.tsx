import { LoadingSkeleton } from '@/components/loading-skeleton';

export default function Loading() {
  return (
    <LoadingSkeleton 
      header={{ showHeader: false }}
      content={{ 
        layout: 'chat',
        itemCount: 10
      }}
      showAppSidebar={true}
    />
  );
}
