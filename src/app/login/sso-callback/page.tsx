'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SSOCallback() {
  const router = useRouter();

  useEffect(() => {
    router.push('/journal');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <p>Completing authentication...</p>
      </div>
    </div>
  );
}
