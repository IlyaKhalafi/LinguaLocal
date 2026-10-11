"use client";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLocale } from "./locale-provider";

export function Pagination({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}) {
  const { t } = useLocale();
  if (pages < 2) return null;
  return (
    <nav className="pagination" aria-label={t("Result pages")}>
      <button
        className="button secondary"
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
      >
        <ArrowLeft size={16} />
        {t("Previous page")}
      </button>
      <span>
        {t("Page {current} of {total}", { current: page + 1, total: pages })}
      </span>
      <button
        className="button secondary"
        disabled={page === pages - 1}
        onClick={() => onChange(page + 1)}
      >
        {t("Next page")}
        <ArrowRight size={16} />
      </button>
    </nav>
  );
}
