"use client";

import { useCallback, useEffect, useRef } from "react";

export function useFocusOnChange(value: string | number | boolean) {
  const target = useRef<HTMLElement | null>(null);
  const previous = useRef(value);
  useEffect(() => {
    if (previous.current !== value) {
      previous.current = value;
      target.current?.focus({ preventScroll: true });
    }
  }, [value]);
  return useCallback((element: HTMLElement | null) => {
    target.current = element;
  }, []);
}
