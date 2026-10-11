"use client";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

export function ClientNotice({ children }: { children: ReactNode }) {
  const root =
    typeof document === "undefined"
      ? null
      : document.getElementById("client-notices");
  return root
    ? createPortal(
        <p className="storage-notice" role="status">
          {children}
        </p>,
        root,
      )
    : null;
}
