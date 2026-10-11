"use client";

import { useLocale } from "./locale-provider";

export function NumberRatio({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const { t } = useLocale();
  return (
    <strong className="number-ratio" dir="ltr">
      <bdi dir="ltr">{t("{count}", { count: current })}</bdi>
      {" / "}
      <bdi dir="ltr">{t("{count}", { count: total })}</bdi>
    </strong>
  );
}
