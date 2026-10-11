export function searchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ı/g, "i")
    .replace(/[’‘ʼ]/g, "'")
    .replace(/[\u200c\u0640]/g, "")
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
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
