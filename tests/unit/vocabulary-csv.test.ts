import test from "node:test";
import assert from "node:assert/strict";
import seed from "../../src/content/starter.json";
import { packSchema } from "../../src/lib/schema";
import { importVocabulary } from "../../src/lib/vocabulary-csv";

const header = "id,word,part,definition,example,level,phonetic,synonyms";
const row =
  'curious,curious,adjective,"Interested in people, places and ideas.","She asked, ""Why?""",A2,/ˈkjʊəriəs/,interested|inquisitive';

test("spreadsheet import handles BOM, quoted commas, quotes and line breaks", () => {
  const base = packSchema.parse(seed);
  const pack = importVocabulary(
    "\ufeff" +
      header +
      "\r\n" +
      row +
      '\r\nnew-word,new word,noun,A new expression.,"A sentence\nwith two lines.",B1,,\r\n',
    base,
  );
  assert.equal(pack.words.length, base.words.length + 1);
  assert.equal(pack.words[0].example, 'She asked, "Why?"');
  assert.deepEqual(pack.words[0].synonyms, ["interested", "inquisitive"]);
  assert.equal(pack.words.at(-1)?.example, "A sentence\nwith two lines.");
  assert.equal(base.words[0].definition, seed.words[0].definition);
  assert.deepEqual(pack.books, base.books);
  assert.deepEqual(pack.lessons, base.lessons);
});

test("spreadsheet validation rejects misleading headers, duplicates and bad records", () => {
  const base = packSchema.parse(seed);
  assert.throws(
    () => importVocabulary(header + "\n" + row + "\n" + row, base),
    /Duplicate word ID curious/,
  );
  assert.throws(
    () => importVocabulary("id,id\na,b", base),
    /headers must be unique/,
  );
  assert.throws(
    () => importVocabulary("id,word\na,b", base),
    /needs the columns/,
  );
  assert.throws(
    () => importVocabulary(header + ",levle\n" + row + ",A2", base),
    /Unknown CSV columns/,
  );
  assert.throws(() =>
    importVocabulary(header + "\n" + row.replace("A2", "D9"), base),
  );
  assert.throws(() => importVocabulary(header, base), /no vocabulary records/);
  assert.throws(
    () => importVocabulary("x".repeat(2 * 1024 * 1024 + 1), base),
    /size limit/,
  );
});

test("semicolon spreadsheets and error line numbers work", () => {
  const base = packSchema.parse(seed);
  const csv =
    "id;word;part;definition;example;level\nmarket;market;noun;A place to buy food.;We went to the market.;A1";
  assert.equal(importVocabulary(csv, base).words.at(-1)?.id, "market");
  assert.throws(
    () => importVocabulary(csv.replace(";A1", ";D9"), base),
    (error: unknown) => {
      const issues = (error as { issues: { path: (string | number)[] }[] })
        .issues;
      assert.deepEqual(issues[0].path, ["CSV line 2", "level"]);
      return true;
    },
  );
  assert.throws(() => importVocabulary(header + "\ncurious,curious", base));
});
