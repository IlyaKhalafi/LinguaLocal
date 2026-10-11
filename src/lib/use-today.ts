"use client";
import { useSyncExternalStore } from "react";
import { dayKey } from "./learning";

function subscribe(callback: () => void) {
  const timer = window.setInterval(callback, 60_000);
  window.addEventListener("focus", callback);
  return () => {
    clearInterval(timer);
    window.removeEventListener("focus", callback);
  };
}
export function useToday(serverDay: string): string {
  return useSyncExternalStore(
    subscribe,
    () => dayKey(),
    () => serverDay,
  );
}
