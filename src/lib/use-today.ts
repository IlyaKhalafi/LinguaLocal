"use client";
import { useSyncExternalStore } from "react";
import { dayKey } from "./learning";

function subscribe(callback: () => void) {
  const timer = window.setInterval(callback, 60_000);
  window.addEventListener("focus", callback);
  document.addEventListener("visibilitychange", callback);
  return () => {
    clearInterval(timer);
    window.removeEventListener("focus", callback);
    document.removeEventListener("visibilitychange", callback);
  };
}
export function useToday(serverDay = ""): string {
  return useSyncExternalStore(
    subscribe,
    () => dayKey(),
    () => serverDay,
  );
}
