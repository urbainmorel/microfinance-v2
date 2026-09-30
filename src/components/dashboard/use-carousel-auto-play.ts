"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseCarouselAutoPlayProps {
  count: number;
  intervalMs?: number;
  onNext: () => void;
}

export function useCarouselAutoPlay({
  count,
  intervalMs = 4500,
  onNext,
}: UseCarouselAutoPlayProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isUserPaused, setIsUserPaused] = useState(false);
  const nextCallbackRef = useRef(onNext);

  useEffect(() => {
    nextCallbackRef.current = onNext;
  }, [onNext]);

  const isAutoPlaying = count > 1 && !isHovered && !isUserPaused;

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);
  const handleClick = useCallback(() => setIsUserPaused(true), []);

  const togglePlay = useCallback(() => {
    setIsUserPaused((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!isAutoPlaying) return;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      nextCallbackRef.current();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isAutoPlaying, intervalMs]);

  return {
    isAutoPlaying,
    isUserPaused,
    handleMouseEnter,
    handleMouseLeave,
    handleClick,
    togglePlay,
  };
}
