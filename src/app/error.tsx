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
      <h1>Let’s try that again.</h1>
      <p className="muted">
        Something interrupted this page. Try again, or ask your school to check
        the server and content files.
      </p>
      <div className="button-row">
        <button className="button primary" onClick={reset}>
          Try again
        </button>
        <Link className="button secondary" href="/">
          Back to overview
        </Link>
      </div>
    </div>
  );
}
