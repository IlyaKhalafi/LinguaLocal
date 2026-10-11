"use client";
import { useEffect } from "react";

export function usePrintDetails() {
  useEffect(() => {
    const expanded = new Set<HTMLDetailsElement>();
    function prepare() {
      document
        .querySelectorAll<HTMLDetailsElement>(
          "details.print-expand:not([open])",
        )
        .forEach((details) => {
          expanded.add(details);
          details.open = true;
        });
    }
    function restore() {
      expanded.forEach((details) => {
        details.open = false;
      });
      expanded.clear();
    }
    window.addEventListener("beforeprint", prepare);
    window.addEventListener("afterprint", restore);
    return () => {
      window.removeEventListener("beforeprint", prepare);
      window.removeEventListener("afterprint", restore);
      restore();
    };
  }, []);
}
