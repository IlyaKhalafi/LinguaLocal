import "./load-environment.mjs";
import path from "node:path";
import seed from "../src/content/starter.json" with { type: "json" };
import { serverConfig } from "../src/lib/server-config";
import { defaultSettings } from "../src/lib/default-settings";
import { packSchema } from "../src/lib/schema";
import {
  createServerSnapshot,
  restoreServerSnapshot,
} from "../src/lib/server-snapshot";
import { runCommand } from "../src/lib/cli";
import { storagePaths } from "./storage-paths.mjs";
runCommand(async () => {
  const [command, source, destination] = process.argv.slice(2);
  if (command === "create" && source && !destination) {
    const report = await createServerSnapshot(
      { ...storagePaths(), bundledDirectory: path.resolve("public/demo") },
      source,
      {
        content: packSchema.parse(seed),
        settings: defaultSettings,
        server: serverConfig(),
      },
    );
    console.log(JSON.stringify(report, null, 2));
  } else if (
    command === "restore" &&
    source &&
    destination &&
    process.argv.length === 5
  ) {
    console.log(
      JSON.stringify(
        await restoreServerSnapshot(
          source,
          destination,
          Object.values(storagePaths()),
        ),
        null,
        2,
      ),
    );
  } else
    throw new Error(
      "Usage is server-snapshot create NEW-SNAPSHOT-DIRECTORY or server-snapshot restore SNAPSHOT NEW-DATA-DIRECTORY",
    );
});
