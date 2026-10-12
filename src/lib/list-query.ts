import { levels } from "./schema";

export type ListQuery = {
  search: string;
  level: string;
  category: string;
  page: number;
  saved: boolean;
};

function boundedText(value: string) {
  const points: string[] = [];
  for (const point of value) {
    if (points.length === 200) break;
    points.push(point);
  }
  return points.join("");
}

export function readListQuery(
  params: Pick<URLSearchParams, "get">,
  categories: readonly string[] = [],
): ListQuery {
  const level = params.get("level") ?? "";
  const category = params.get("category") ?? "";
  const page = params.get("page") ?? "1";
  return {
    search: boundedText(params.get("search") ?? ""),
    level: levels.includes(level as (typeof levels)[number]) ? level : "",
    category: categories.includes(category) ? category : "",
    page: /^[1-9]\d{0,3}$/.test(page) ? Number(page) - 1 : 0,
    saved: params.get("saved") === "1",
  };
}

export function updateListQuery(
  params: URLSearchParams,
  changes: Partial<ListQuery>,
) {
  const next = new URLSearchParams(params);
  if (
    ["search", "level", "category", "saved"].some(
      (key) => changes[key as keyof ListQuery] !== undefined,
    )
  )
    next.delete("word");
  if (
    ["search", "level", "category", "saved"].some(
      (key) => changes[key as keyof ListQuery] !== undefined,
    ) &&
    changes.page === undefined
  )
    next.delete("page");
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined) continue;
    const encoded =
      key === "page"
        ? Number.isSafeInteger(value) &&
          Number(value) > 0 &&
          Number(value) < 9999
          ? String(Number(value) + 1)
          : ""
        : key === "saved"
          ? value
            ? "1"
            : ""
          : boundedText(String(value));
    if (encoded) next.set(key, encoded);
    else next.delete(key);
  }
  return next;
}
