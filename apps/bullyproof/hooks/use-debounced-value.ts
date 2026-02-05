"use client";

import { useState, useEffect } from "react";

/**
 * Returns a debounced version of the given value. The debounced value
 * updates only after the input value has been stable for `delayMs` ms.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
