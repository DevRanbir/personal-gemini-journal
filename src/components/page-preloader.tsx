"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const PAGES_TO_PRELOAD = [
  '/chat',
  '/login',
];

export function PagePreloader() {
  const router = useRouter();

  useEffect(() => {
    // Preload pages after a short delay to avoid blocking initial render
    const preloadTimer = setTimeout(() => {
      PAGES_TO_PRELOAD.forEach(page => {
        router.prefetch(page);
      });
    }, 1000);

    return () => clearTimeout(preloadTimer);
  }, [router]);

  // Also preload on hover/focus events
  useEffect(() => {
    const links = document.querySelectorAll('a[href^="/"]');
    
    const handleMouseEnter = (e: Event) => {
      const target = e.target as HTMLAnchorElement;
      if (target.href) {
        const url = new URL(target.href);
        router.prefetch(url.pathname);
      }
    };

    links.forEach(link => {
      link.addEventListener('mouseenter', handleMouseEnter);
    });

    return () => {
      links.forEach(link => {
        link.removeEventListener('mouseenter', handleMouseEnter);
      });
    };
  }, [router]);

  return null; // This component doesn't render anything
}

export default PagePreloader;
