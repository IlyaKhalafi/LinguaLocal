import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import english from "../../src/content/locales/en.json";

test("interface text and literal translation calls have catalogue coverage", () => {
  const missing: string[] = [];
  const catalogue: Record<string, string> = english;
  const allowed = new Set(["LinguaLocal", "PDF", "English"]);
  function checkLiteral(node: ts.Node, file: string) {
    if (ts.isStringLiteral(node) && !Object.hasOwn(catalogue, node.text))
      missing.push(`${file} missing ${node.text}`);
    else if (ts.isConditionalExpression(node)) {
      checkLiteral(node.whenTrue, file);
      checkLiteral(node.whenFalse, file);
    }
  }
  function checkDirectory(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        checkDirectory(file);
        continue;
      }
      if (!file.endsWith(".tsx")) continue;
      const ast = ts.createSourceFile(
        file,
        readFileSync(file, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      function visit(node: ts.Node) {
        if (
          ts.isCallExpression(node) &&
          node.expression.getText(ast) === "t" &&
          node.arguments[0]
        )
          checkLiteral(node.arguments[0], file);
        if (
          ts.isJsxText(node) &&
          /[A-Za-z]/.test(node.text) &&
          !allowed.has(node.text.trim())
        )
          missing.push(`${file} untranslated ${node.text.trim()}`);
        if (
          ts.isJsxAttribute(node) &&
          ["placeholder", "aria-label"].includes(node.name.getText(ast)) &&
          node.initializer &&
          ts.isStringLiteral(node.initializer) &&
          /[A-Za-z]/.test(node.initializer.text) &&
          !allowed.has(node.initializer.text)
        )
          missing.push(`${file} untranslated ${node.initializer.text}`);
        ts.forEachChild(node, visit);
      }
      visit(ast);
    }
  }
  checkDirectory("src/app");
  checkDirectory("src/components");
  assert.deepEqual(missing, []);
});
