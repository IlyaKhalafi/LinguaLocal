import test from "node:test";
import assert from "node:assert/strict";
import { gapSentence, matchesAnswer } from "../../src/lib/practice";

test("gap-fill removes complete words without revealing repeated answers", () => {
  assert.equal(
    gapSentence({ word: "kind", example: "Kind people are kind." }),
    "_____ people are _____.",
  );
  assert.equal(
    gapSentence({ word: "kind", example: "Kindness matters." }),
    null,
  );
  assert.equal(
    gapSentence({ word: "a+b", example: "Try a+b today." }),
    "Try _____ today.",
  );
  assert.equal(
    gapSentence({ word: "hello", example: "‘Hello!’ she said." }),
    "‘_____!’ she said.",
  );
});
test("practice answers tolerate case, outer punctuation and apostrophe variants", () => {
  assert.equal(matchesAnswer(" Curious! ", "curious"), true);
  assert.equal(matchesAnswer("don't", "don’t"), true);
  assert.equal(matchesAnswer("curiosity", "curious"), false);
  assert.equal(matchesAnswer("", "hello"), false);
});
