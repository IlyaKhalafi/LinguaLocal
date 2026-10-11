import { spawnSync } from "node:child_process";
const phrases = [
  "Hello. A new conversation starts here.",
  "How are you today?",
  "I am well. Thank you for asking.",
];
const filters = [
  "drawbox=x=0:y=0:w=12:h=ih:color=0x356d52:t=fill",
  ...phrases.map(
    (text, index) =>
      `drawtext=text='${text}':fontcolor=0x243f36:fontsize=40:x=(w-text_w)/2:y=(h-text_h)/2:enable='gte(t,${index * 4})*lt(t,${(index + 1) * 4})'`,
  ),
];
const result = spawnSync(
  "ffmpeg",
  [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "color=c=0xeef3ec:s=960x540:r=25:d=12",
    "-vf",
    filters.join(","),
    "-an",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "public/demo/greetings.mp4",
  ],
  { stdio: "inherit" },
);
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
