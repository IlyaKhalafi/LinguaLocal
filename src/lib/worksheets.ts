import { distinctGameWords } from "./learning";
import type { ContentPack, Word } from "./schema";

function escape(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );
}

const styles = `
*{box-sizing:border-box}body{margin:0;padding:32px 16px;background:#f5f7f3;color:#233c30;font:16px/1.6 system-ui,sans-serif}
main{max-width:820px;margin:auto}h1,h2,h3{line-height:1.25}h1{font-size:28px;margin:0 0 12px}h2{font-size:21px}h3{font-size:17px}
p{margin:12px 0}.sheet{background:white;border:1px solid #dfe5da;border-radius:16px;padding:40px;margin:24px 0;overflow-wrap:anywhere}
.meta{color:#476a51;font-size:13px;font-weight:600;letter-spacing:.04em;margin:0 0 12px}.identity{display:flex;gap:40px;flex-wrap:wrap;margin:28px 0;font-size:14px}
.bank{display:flex;gap:10px 18px;flex-wrap:wrap;background:#edf3e6;padding:16px 20px;border-radius:10px;list-style:none;margin:20px 0 28px}
.questions{padding-inline-start:24px}.questions>li{padding:12px 0 18px;break-inside:avoid}.answer-line{display:block;border-bottom:1px solid #9da99b;width:70%;height:30px}
.options{list-style-type:upper-alpha;margin:16px 0;padding-inline-start:28px}.options li{padding:5px 0}.reading{white-space:pre-wrap}.key,.exercise{break-inside:avoid}.key{padding:12px 0;border-bottom:1px solid #e4e8e1}
a{color:#28563c;text-underline-offset:4px}nav{display:flex;gap:16px;flex-wrap:wrap}button{font:inherit;background:#214c39;color:white;border:0;border-radius:8px;padding:10px 18px;cursor:pointer}a:focus-visible,button:focus-visible{outline:3px solid #597c65;outline-offset:4px}
@media(max-width:500px){body{padding:16px 12px}.sheet{padding:24px 20px}h1{font-size:24px}.identity{gap:16px}.answer-line{width:100%}}
@page{size:A4;margin:18mm}@media print{body{padding:0;background:white;font-size:12pt}.sheet{padding:0;border:0;border-radius:0;margin:0;break-before:page}.sheet:first-of-type{break-before:auto}nav,.no-print{display:none}.bank{background:#f0f3ec;print-color-adjust:exact}h1,h2,h3{break-after:avoid}main{max-width:none}.key{border-color:#bbb}}
`;

function document(title: string, body: string, navigation = true): string {
  const controls = navigation
    ? '<nav class="no-print" aria-label="Worksheet navigation"><a href="index.html">All worksheets</a><button onclick="window.print()">Print</button></nav>'
    : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title><style>${styles}</style></head><body><main>${controls}${body}</main></body></html>`;
}

function vocabularyGroups(words: Word[]): Word[][] {
  const groups: Word[][] = [];
  let group: Word[] = [];
  let size = 0;
  for (const word of words) {
    const length = word.word.length + word.definition.length + 60;
    if (group.length && (group.length === 8 || size + length > 1800)) {
      groups.push(group);
      group = [];
      size = 0;
    }
    group.push(word);
    size += length;
  }
  if (group.length) groups.push(group);
  return groups;
}

export function createWorksheets(content: ContentPack, level?: Word["level"]) {
  const selectedWords = content.words.filter(
    (word) => !level || word.level === level,
  );
  const words = distinctGameWords(selectedWords);
  const lessons = content.lessons.filter(
    (lesson) => !level || lesson.level === level,
  );
  if (!words.length && !lessons.length)
    throw new Error("No material matches this selection.");
  const label = level ?? "All levels";
  const groups = vocabularyGroups(words);
  const skipped = selectedWords.length - words.length;
  const files: { name: string; title: string; html: string }[] = [];
  const key: string[] = [];
  if (groups.length) {
    const sheets = groups.map((group, index) => {
      const bank = [...group].sort((left, right) =>
        left.word.localeCompare(right.word, "en"),
      );
      key.push(
        `<section class="key"><h2>Vocabulary ${index + 1}</h2><ol>${group.map((word) => `<li data-word-id="${escape(word.id)}">${escape(word.word)}</li>`).join("")}</ol></section>`,
      );
      return `<section class="sheet"><p class="meta">${escape(label)} · Worksheet ${index + 1}</p><h1>Find the right word</h1><p>Match each meaning to a word from the box.</p><div class="identity"><span>Name ____________________</span><span>Date ______________</span></div><ul class="bank" aria-label="Word bank">${bank.map((word) => `<li>${escape(word.word)}</li>`).join("")}</ul><ol class="questions">${group.map((word) => `<li data-word-id="${escape(word.id)}">${escape(word.definition)}<span class="answer-line" aria-hidden="true"></span></li>`).join("")}</ol></section>`;
    });
    files.push({
      name: "vocabulary.html",
      title: "Vocabulary worksheets",
      html: document("Vocabulary worksheets", sheets.join("")),
    });
  }
  if (lessons.length) {
    const sheets = lessons.map((lesson) => {
      key.push(
        `<section class="key" data-lesson-id="${escape(lesson.id)}"><h2>${escape(lesson.title)}</h2><p><strong>${String.fromCharCode(65 + lesson.answer)} · ${escape(lesson.options[lesson.answer])}</strong></p><p>${escape(lesson.explanation)}</p></section>`,
      );
      return `<section class="sheet" data-lesson-id="${escape(lesson.id)}"><p class="meta">${escape(lesson.level)} · ${escape(lesson.category)}</p><h1>${escape(lesson.title)}</h1><div class="identity"><span>Name ____________________</span><span>Date ______________</span></div>${lesson.sections.map((section) => `<h2>${escape(section.title)}</h2><p class="reading">${escape(section.body)}</p>`).join("")}<div class="exercise"><h2>Check your understanding</h2><p>${escape(lesson.question)}</p><ol class="options">${lesson.options.map((option) => `<li>${escape(option)}</li>`).join("")}</ol><p>Your answer<span class="answer-line" aria-hidden="true"></span></p></div></section>`;
    });
    files.push({
      name: "lessons.html",
      title: "Lesson worksheets",
      html: document("Lesson worksheets", sheets.join("")),
    });
  }
  files.push({
    name: "answers.html",
    title: "Answer key",
    html: document(
      "Answer key",
      `<section class="sheet"><p class="meta">${escape(label)}</p><h1>Answer key</h1>${key.join("")}</section>`,
    ),
  });
  const links = files
    .map((file) => `<li><a href="${file.name}">${file.title}</a></li>`)
    .join("");
  files.unshift({
    name: "index.html",
    title: "Classroom worksheets",
    html: document(
      "Classroom worksheets",
      `<section class="sheet"><p class="meta">${escape(label)}</p><h1>Classroom worksheets</h1><p>Open a worksheet and print it from your browser.</p><ul>${links}</ul><p>${words.length} words · ${lessons.length} lessons</p>${skipped ? `<p>${skipped} repeated entries omitted from matching sheets.</p>` : ""}</section>`,
      false,
    ),
  });
  return { files, skipped };
}
