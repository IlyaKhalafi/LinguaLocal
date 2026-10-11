"use client";
import { useLocale } from "@/components/locale-provider";
import Link from "next/link";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="empty-state">
      <h1>{t("Unable to load this page")}</h1>
      <p className="muted">
        {t("Try again or ask the school to check the server.")}
      </p>
      <div className="button-row">
        <button className="button primary" onClick={reset}>
          {t("Try again")}
        </button>
        <Link className="button secondary" href="/">
          {t("Home")}
        </Link>
      </div>
    </div>
  );
}
