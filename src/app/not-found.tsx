import Link from "next/link";
import { Compass } from "lucide-react";
export default function NotFound() {
  return (
    <div className="not-found">
      <span className="eyebrow">A LITTLE DETOUR</span>
      <Compass size={58} />
      <h1>This page took a different path.</h1>
      <p className="muted">
        We could not find what you were looking for. There is plenty more to
        discover.
      </p>
      <Link href="/" className="button primary">
        Back to overview
      </Link>
    </div>
  );
}
