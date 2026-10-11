import { readUtf8File } from "../src/lib/text-file";
import { parseSubtitles, convertSubtitles } from "../src/lib/subtitles";
import { writeFileAtomically } from "../src/lib/atomic-file";
import { runCommand } from "../src/lib/cli";

runCommand(async () => {
  const [command, source, output] = process.argv.slice(2);
  if (
    !source ||
    !["check", "convert"].includes(command) ||
    (command === "convert"
      ? !output || process.argv.length !== 5
      : process.argv.length !== 4)
  )
    throw new Error(
      "Usage is subtitles check INPUT.vtt or subtitles convert INPUT.srt OUTPUT.vtt",
    );
  const text = await readUtf8File(source, { label: "Subtitle file" });
  const parsed = parseSubtitles(text);
  if (command === "convert")
    await writeFileAtomically(output!, convertSubtitles(text), {
      overwrite: false,
    });
  console.log(
    JSON.stringify(
      {
        format: parsed.format,
        cues: parsed.cues.length,
        duration: parsed.cues.reduce((end, cue) => Math.max(end, cue.end), 0),
        warnings: parsed.warnings,
      },
      null,
      2,
    ),
  );
});
