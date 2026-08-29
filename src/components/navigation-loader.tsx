"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export function NavigationLoader() {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);

  useEffect(() => {
    if (pathname !== prevPathname) {
      setIsLoading(true);
      setPrevPathname(pathname);
      
      // Simulate loading time and then hide loader
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [pathname, prevPathname]);

  if (!isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1">
      <div className="h-full" />
    </div>
  );
}

export default NavigationLoader;
