export const dictationWordLimit = 120;
export const dictationTextLimit = 2000;

export function dictationTokens(text: string) {
  return Array.from(
    text.matchAll(
      /[\p{L}\p{N}][\p{L}\p{N}\p{M}]*(?:['’][\p{L}\p{N}][\p{L}\p{N}\p{M}]*)*/gu,
    ),
    (match) => ({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
    }),
  );
}

function normalized(word: string) {
  return word
    .normalize("NFKC")
    .replaceAll("’", "'")
    .toUpperCase()
    .toLowerCase();
}

export function compareDictation(reference: string, answer: string) {
  if (
    reference.length > dictationTextLimit ||
    answer.length > dictationTextLimit
  )
    throw new Error("Dictation text exceeds the size limit.");
  const expected = dictationTokens(reference);
  const actual = dictationTokens(answer);
  if (!expected.length) throw new Error("Dictation needs a reference passage.");
  if (
    expected.length > dictationWordLimit ||
    actual.length > dictationWordLimit
  )
    throw new Error("Dictation exceeds the word limit.");
  const left = expected.map((word) => normalized(word.text));
  const right = actual.map((word) => normalized(word.text));
  const columns = right.length + 1;
  const distance = new Uint16Array((left.length + 1) * columns);
  const at = (row: number, column: number) => row * columns + column;
  for (let row = 0; row <= left.length; row++) distance[at(row, 0)] = row;
  for (let column = 0; column <= right.length; column++)
    distance[at(0, column)] = column;
  for (let row = 1; row <= left.length; row++) {
    for (let column = 1; column <= right.length; column++) {
      distance[at(row, column)] = Math.min(
        distance[at(row - 1, column)] + 1,
        distance[at(row, column - 1)] + 1,
        distance[at(row - 1, column - 1)] +
          (left[row - 1] === right[column - 1] ? 0 : 1),
      );
    }
  }
  const matched = Array<boolean>(left.length).fill(false);
  const extra: string[] = [];
  let row = left.length;
  let column = right.length;
  while (row || column) {
    if (
      row &&
      column &&
      distance[at(row, column)] ===
        distance[at(row - 1, column - 1)] +
          (left[row - 1] === right[column - 1] ? 0 : 1)
    ) {
      matched[row - 1] = left[row - 1] === right[column - 1];
      row--;
      column--;
    } else if (
      row &&
      distance[at(row, column)] === distance[at(row - 1, column)] + 1
    ) {
      row--;
    } else {
      extra.push(actual[column - 1].text);
      column--;
    }
  }
  extra.reverse();
  const score = Math.max(0, matched.filter(Boolean).length - extra.length);
  return {
    words: expected.map((word, index) => ({
      ...word,
      correct: matched[index],
    })),
    extra,
    score,
    total: expected.length,
    correct: score === expected.length,
  };
}
