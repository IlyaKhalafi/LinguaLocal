import test from "node:test";
import assert from "node:assert/strict";
import seed from "../../src/content/starter.json";
import { packSchema } from "../../src/lib/schema";
import { createWorksheets } from "../../src/lib/worksheets";

test("printable student sheets and separate keys retain the selected curriculum", () => {
  const content = packSchema.parse(seed);
  const original = JSON.stringify(content);
  const { files } = createWorksheets(content, "A1");
  const vocabulary = files.find(
    (file) => file.name === "vocabulary.html",
  )!.html;
  const lessons = files.find((file) => file.name === "lessons.html")!.html;
  const key = files.find((file) => file.name === "answers.html")!.html;
  const ids = Array.from(
    vocabulary.matchAll(/data-word-id="([^"]+)"/g),
    (match) => match[1],
  );
  assert.deepEqual(
    ids,
    content.words.filter((word) => word.level === "A1").map((word) => word.id),
  );
  for (const lesson of content.lessons) {
    if (lesson.level === "A1") {
      assert.ok(lessons.includes(`data-lesson-id="${lesson.id}"`));
      assert.ok(!lessons.includes(lesson.explanation));
      assert.ok(key.includes(lesson.explanation));
      assert.ok(key.includes(lesson.options[lesson.answer]));
    } else assert.ok(!lessons.includes(`data-lesson-id="${lesson.id}"`));
  }
  for (const file of files) {
    assert.match(file.html, /<html lang="en">/);
    assert.match(file.html, /@media print/);
    assert.doesNotMatch(file.html, /<script|https?:\/\//);
  }
  assert.equal(JSON.stringify(content), original);
});

test("worksheets escape imported content and omit ambiguous vocabulary", () => {
  const content = packSchema.parse(seed);
  content.words = [
    {
      ...content.words[0],
      definition: '<img src=x onerror="alert(1)"> & a meaning.',
    },
    { ...content.words[0], id: "same-headword" },
    { ...content.words[1], word: "<script>hello</script>" },
    { ...content.words[2], definition: content.words[1].definition },
  ];
  content.lessons = [];
  const { files, skipped } = createWorksheets(content);
  assert.equal(skipped, 2);
  const vocabulary = files.find(
    (file) => file.name === "vocabulary.html",
  )!.html;
  assert.match(
    vocabulary,
    /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt; &amp; a meaning/,
  );
  assert.match(vocabulary, /&lt;script&gt;hello&lt;\/script&gt;/);
  assert.ok(!vocabulary.includes('data-word-id="same-headword"'));
  assert.ok(!vocabulary.includes(`data-word-id="${content.words[3].id}"`));
  assert.ok(!files.some((file) => file.name === "lessons.html"));
  assert.throws(
    () => createWorksheets({ ...content, words: [], lessons: [] }),
    /No material matches/,
  );
});
