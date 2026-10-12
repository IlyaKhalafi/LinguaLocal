import { spreadsheetCell as cell } from "./csv-cell";
import { DOCUMENT_LIMIT } from "./document-limits";
import type { Word } from "./schema";

export const vocabularyEncoding = "lingualocal-v1";

export function exportVocabulary(words: readonly Word[]): string {
  if (!words.length) throw new Error("No vocabulary matches this selection.");
  const columns = [
    "id",
    "word",
    "part",
    "definition",
    "example",
    "level",
    "phonetic",
    "synonyms",
    "encoding",
  ];
  const rows = words.map((word) =>
    [
      word.id,
      word.word,
      word.part,
      word.definition,
      word.example,
      word.level,
      word.phonetic,
      JSON.stringify(word.synonyms),
      vocabularyEncoding,
    ]
      .map(cell)
      .join(","),
  );
  const csv =
    "\uFEFF" + columns.join(",") + "\r\n" + rows.join("\r\n") + "\r\n";
  if (Buffer.byteLength(csv) > DOCUMENT_LIMIT)
    throw new Error("The exported CSV exceeds the size limit.");
  return csv;
}
