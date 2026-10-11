export function transcriptSelection(value: string) {
  const query = value
    .replace(/\b\d+:\d{2}(?::\d{2})?\b/g, " ")
    .trim()
    .replace(/^[\p{P}\p{S}\s]+|[\p{P}\p{S}\s]+$/gu, "")
    .replace(/\s+/g, " ");
  return query.length <= 100 ? query : "";
}
