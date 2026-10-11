import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultPreferences,
  parsePreferences,
  preferenceAttributes,
} from "../../src/lib/preferences";

test("reading preferences accept partial cookies and reject damaged values", () => {
  assert.deepEqual(parsePreferences(), defaultPreferences);
  assert.deepEqual(parsePreferences("%invalid"), defaultPreferences);
  assert.deepEqual(parsePreferences("x".repeat(2049)), defaultPreferences);
  assert.deepEqual(
    parsePreferences(
      encodeURIComponent(JSON.stringify({ size: "huge", quiet: true })),
    ),
    defaultPreferences,
  );
  const result = parsePreferences(
    encodeURIComponent(JSON.stringify({ size: "large", quiet: true })),
  );
  assert.equal(result.size, "large");
  assert.equal(result.quiet, true);
  assert.equal(result.font, "default");
  assert.equal(preferenceAttributes(result)["data-quiet"], "true");
});
