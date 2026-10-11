import test from "node:test";
import assert from "node:assert/strict";
import { transcriptSelection } from "../../src/lib/transcript-selection";

test("dictionary selections discard timestamp controls and edge punctuation", () => {
  assert.equal(transcriptSelection(" Hello. "), "Hello");
  assert.equal(transcriptSelection("0:04 ‘kind’ 0:08"), "kind");
  assert.equal(transcriptSelection("a well-known word"), "a well-known word");
  assert.equal(transcriptSelection("…دوست،"), "دوست");
  assert.equal(transcriptSelection("x".repeat(101)), "");
});
