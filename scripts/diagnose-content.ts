import "./load-environment.mjs";
import path from "node:path";
import { storagePaths } from "./storage-paths.mjs";
import { packSchema } from "../src/lib/schema";
import { readValidatedJson } from "../src/lib/json-file";
import { runCommand } from "../src/lib/cli";
import { diagnoseContent } from "../src/lib/content-diagnostics";

runCommand(async () => {
  const source = process.argv[2];
  if (!source || process.argv.length !== 3)
    throw new Error("Usage is diagnose-content PATH-TO-PACK.json");
  const content = await readValidatedJson(source, packSchema);
  const { mediaDirectory } = storagePaths();
  const report = await diagnoseContent(
    content,
    mediaDirectory,
    path.resolve("public/demo"),
  );
  console.log(JSON.stringify(report, null, 2));
  if (report.missing.length || report.empty.length || report.errors.length)
    process.exitCode = 1;
});
