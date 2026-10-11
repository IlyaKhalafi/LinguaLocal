import assert from "node:assert/strict";
import { test } from "node:test";
import { checkMutation } from "../../src/lib/mutations";

test("browser writes use the public request host even with an internal server URL", () => {
  assert.doesNotThrow(() =>
    checkMutation(
      new Request("http://localhost:3000/api/settings", {
        headers: {
          Host: "192.168.1.10:3000",
          Origin: "http://192.168.1.10:3000",
        },
      }),
    ),
  );
  assert.doesNotThrow(() =>
    checkMutation(new Request("http://localhost:3000/api/settings")),
  );
});

test("browser writes reject malformed and unrelated origins", () => {
  for (const origin of [
    "null",
    "https://another.school",
    "file://localhost:3000",
  ]) {
    assert.throws(
      () =>
        checkMutation(
          new Request("http://localhost:3000/api/settings", {
            headers: { Origin: origin },
          }),
        ),
      /learning hub/,
    );
  }
});
