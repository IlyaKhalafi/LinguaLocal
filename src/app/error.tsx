"use client";
import Link from "next/link";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="empty-state">
      <h1>Unable to load this page</h1>
      <p className="muted">Try again or ask the school to check the server.</p>
      <div className="button-row">
        <button className="button primary" onClick={reset}>
          Try again
        </button>
        <Link className="button secondary" href="/">
          Home
        </Link>
      </div>
    </div>
  );
}
