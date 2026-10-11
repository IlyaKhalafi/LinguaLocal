import { LocalizedText } from "@/components/localized-text";
export default function Loading() {
  return (
    <div className="loading-state" role="status">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-subtitle" />
      <div className="skeleton-grid">
        {[1, 2, 3].map((item) => (
          <div className="skeleton skeleton-card" key={item} />
        ))}
      </div>
      <span className="sr-only">
        <LocalizedText text="Loading" />
      </span>
    </div>
  );
}
