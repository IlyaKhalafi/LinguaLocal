"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { readListQuery, updateListQuery, type ListQuery } from "./list-query";

export function useListQuery(categories?: readonly string[]) {
  const params = useSearchParams();
  // Keep text inputs synchronous while the router processes history updates.
  const query = useSyncExternalStore(subscribe, readLocation, () =>
    params.toString(),
  );
  // Router navigation also changes the location without a popstate event.
  useEffect(() => {
    window.dispatchEvent(new Event(queryEvent));
  }, [params]);
  const filters = readListQuery(new URLSearchParams(query), categories);
  return { ...filters, update: updateLocation };
}

const queryEvent = "lingualocal:querychange";
const readLocation = () => window.location.search;
function subscribe(notify: () => void) {
  window.addEventListener("popstate", notify);
  window.addEventListener(queryEvent, notify);
  return () => {
    window.removeEventListener("popstate", notify);
    window.removeEventListener(queryEvent, notify);
  };
}

function updateLocation(
  changes: Partial<ListQuery>,
  history: "push" | "replace" = "push",
) {
  const next = updateListQuery(
    new URLSearchParams(window.location.search),
    changes,
  );
  const query = next.toString();
  const url =
    window.location.pathname +
    (query ? `?${query}` : "") +
    window.location.hash;
  if (query === new URLSearchParams(window.location.search).toString()) return;
  window.history[history === "push" ? "pushState" : "replaceState"](
    null,
    "",
    url,
  );
  window.dispatchEvent(new Event(queryEvent));
}
