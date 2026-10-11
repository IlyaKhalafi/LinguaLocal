export function searchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ı/g, "i")
    .replace(/’/g, "'")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function createSearchIndex<T>(
  items: readonly T[],
  text: (item: T) => string,
) {
  return items.map((item) => ({ item, text: searchText(text(item)) }));
}

export function searchIndex<T>(
  index: ReturnType<typeof createSearchIndex<T>>,
  query: string,
  include: (item: T) => boolean = () => true,
): T[] {
  const terms = searchText(query).split(" ").filter(Boolean);
  return index
    .filter(
      (entry) =>
        include(entry.item) && terms.every((term) => entry.text.includes(term)),
    )
    .map((entry) => entry.item);
}
