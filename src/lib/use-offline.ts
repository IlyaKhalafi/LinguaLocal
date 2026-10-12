"use client";
import { useSyncExternalStore } from "react";
import {
  subscribeOffline,
  offlineSnapshot,
  offlineServerSnapshot,
} from "./offline-client";
export function useOffline() {
  return useSyncExternalStore(
    subscribeOffline,
    offlineSnapshot,
    offlineServerSnapshot,
  );
}
