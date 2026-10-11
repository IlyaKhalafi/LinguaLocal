"use client";

import { useCallback, useEffect, useRef } from "react";

export function useFocusOnChange(
  value: string | number | boolean,
  preventScroll = true,
) {
  const target = useRef<HTMLElement | null>(null);
  const previous = useRef(value);
  useEffect(() => {
    if (previous.current !== value) {
      previous.current = value;
      target.current?.focus({ preventScroll });
    }
  }, [value, preventScroll]);
  return useCallback((element: HTMLElement | null) => {
    target.current = element;
  }, []);
}
