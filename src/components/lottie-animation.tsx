"use client";

import React, { useEffect, useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

interface LottieAnimationProps {
  src: string;
  className?: string;
}

export function LottieAnimation({ src, className = "w-72 h-72 object-contain mx-auto" }: LottieAnimationProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div className={`${className} bg-primary/5 rounded-full animate-pulse`} />;
  }

  return (
    <DotLottieReact
      src={src}
      loop
      autoplay
      className={className}
    />
  );
}
