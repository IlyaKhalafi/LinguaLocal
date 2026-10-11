"use client";
export default function GlobalError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "Arial, sans-serif",
          padding: 40,
          background: "#f8f9f7",
          color: "#243f36",
        }}
      >
        <h1>Unable to load this page</h1>
        <p>Ask the school to check the server files.</p>
        <button
          onClick={reset}
          style={{ padding: "12px 20px", cursor: "pointer" }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
