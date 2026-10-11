import Link from "next/link";
import { Compass } from "lucide-react";
export default function NotFound() {
  return (
    <div className="not-found">
      <Compass size={58} />
      <h1>Page not found</h1>
      <p className="muted">This page is unavailable.</p>
      <Link href="/" className="button primary">
        Home
      </Link>
    </div>
  );
}
