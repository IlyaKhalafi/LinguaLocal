import { spawn } from "node:child_process";
import path from "node:path";

const args = process.argv.slice(2);
const portIndex = args.findIndex((arg) => arg === "--port" || arg === "-p");
const port = portIndex >= 0 ? args[portIndex + 1] : process.env.PORT || "3000";
if (!port || !/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535)
  throw new Error("Choose a port from 1 to 65535.");
const dataDirectory = path.resolve(process.env.LINGUALOCAL_DATA_DIR || "data");
console.log(`LinguaLocal data directory ${dataDirectory}`);
const child = spawn(process.execPath, [".next/standalone/server.js"], {
  stdio: "inherit",
  env: {
    ...process.env,
    HOSTNAME: process.env.LINGUALOCAL_HOST || "0.0.0.0",
    PORT: port,
    LINGUALOCAL_DATA_DIR: dataDirectory,
    LINGUALOCAL_MEDIA_DIR: path.resolve(
      process.env.LINGUALOCAL_MEDIA_DIR || path.join(dataDirectory, "media"),
    ),
  },
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code, signal) =>
  process.exit(code ?? (signal === "SIGINT" || signal === "SIGTERM" ? 0 : 1)),
);
child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
