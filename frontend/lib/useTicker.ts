"use client";

import { useEffect, useState } from "react";

/**
 * Forces a re-render every `intervalMs`. Components that render relative time
 * (formatLastSeen, "5m ago" style text) are otherwise pure functions of props
 * that never change on their own — without this they compute the right value
 * once and then visually freeze until something unrelated re-renders them.
 */
export function useTicker(intervalMs = 30_000) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
}
