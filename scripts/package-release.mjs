import {
  cp,
  link,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

async function packageRelease() {
  const [destination] = process.argv.slice(2);
  if (!destination || process.argv.length !== 3)
    throw new Error("Usage is package-release NEW-ARCHIVE.tar.gz");
  if (!destination.endsWith(".tar.gz"))
    throw new Error("The archive must end in .tar.gz");
  const { version } = JSON.parse(await readFile("package.json", "utf8"));
  if (!/^\d+\.\d+\.\d+$/.test(version))
    throw new Error("Invalid release version");
  const parent = path.dirname(path.resolve(destination));
  await mkdir(parent, { recursive: true });
  const temporary = await mkdtemp(path.join(parent, ".lingualocal-release-"));
  let interrupted = false;
  let archiver;
  const interrupt = () => {
    interrupted = true;
    archiver?.kill("SIGTERM");
  };
  const checkInterrupted = () => {
    if (interrupted) throw new Error("Packaging interrupted");
  };
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", interrupt);
  try {
    const name = `lingualocal-${version}-${process.platform}-${process.arch}`;
    const root = path.join(temporary, name);
    await mkdir(root);
    for (const file of [
      "server.js",
      "package.json",
      "node_modules",
      ".next",
      "public",
      "scripts",
    ])
      await cp(path.join(".next/standalone", file), path.join(root, file), {
        recursive: true,
        verbatimSymlinks: true,
        filter: (source) =>
          path.resolve(source) !==
          path.resolve(".next/standalone/public/uploads"),
      });
    checkInterrupted();
    for (const file of ["LICENSE", "CHANGELOG.md"])
      await cp(file, path.join(root, file));
    await mkdir(path.join(root, "docs"));
    for (const file of ["DEPLOYMENT.md", "CONTENT.md", "ARCHITECTURE.md"])
      await cp(path.join("docs", file), path.join(root, "docs", file));
    await writeFile(
      path.join(root, "README.txt"),
      [
        `LinguaLocal ${version}`,
        "",
        `Built for ${process.platform} ${process.arch}. Use Node.js 22.13 or newer on the same platform.`,
        "Linux and macOS use HOSTNAME=0.0.0.0 node server.js from this directory.",
        "Windows PowerShell uses $env:HOSTNAME='0.0.0.0'; node server.js",
        "Open http://localhost:3000 on the school computer.",
        "Students use http://YOUR-SERVER-LAN-IP:3000 on the same network.",
        "Set LINGUALOCAL_DATA_DIR to an absolute directory for school content and media.",
        "School data and environment files are not included in this archive.",
        "The docs directory contains deployment, content, and architecture guides.",
        "",
      ].join("\n"),
    );
    const archive = path.join(temporary, "release.tar.gz");
    await new Promise((resolve, reject) => {
      checkInterrupted();
      const child = spawn("tar", ["-czf", archive, "-C", temporary, name], {
        stdio: "inherit",
      });
      archiver = child;
      child.once("error", reject);
      child.once("exit", (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`Archive creation failed with exit ${code}`)),
      );
    });
    checkInterrupted();
    await link(archive, path.resolve(destination));
    console.log(`Created ${destination}`);
  } finally {
    process.off("SIGINT", interrupt);
    process.off("SIGTERM", interrupt);
    await rm(temporary, { recursive: true, force: true });
  }
}

packageRelease().catch((error) => {
  console.error(error instanceof Error ? error.message : "Packaging failed");
  process.exitCode = 1;
});
