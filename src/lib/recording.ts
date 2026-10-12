import { z } from "zod";
import { bookSchema } from "./schema";

export const recordingLimits = {
  count: 10,
  seconds: 60,
  fileBytes: 16 * 1024 * 1024,
  totalBytes: 64 * 1024 * 1024,
} as const;

const extensions = new Map([
  ["audio/webm", "webm"],
  ["audio/mp4", "m4a"],
  ["audio/ogg", "ogg"],
  ["audio/wav", "wav"],
]);

export const recordingSchema = z.object({
  id: z.uuid(),
  bookId: bookSchema.shape.id,
  title: bookSchema.shape.title,
  createdAt: z.number().int().positive().max(8_640_000_000_000_000),
  seconds: z.number().positive().max(recordingLimits.seconds),
  blob: z.custom<Blob>(
    (blob) =>
      blob instanceof Blob &&
      blob.size > 0 &&
      blob.size <= recordingLimits.fileBytes &&
      extensions.has(blob.type.split(";")[0].trim().toLowerCase()),
    "Use a supported audio recording within the file limit",
  ),
});

export type Recording = z.infer<typeof recordingSchema>;

export function recordingFilename(recording: Recording) {
  const extension = extensions.get(
    recording.blob.type.split(";")[0].trim().toLowerCase(),
  );
  if (!extension) throw new Error("Unsupported recording format");
  const date = new Date(recording.createdAt).toISOString().replaceAll(":", "-");
  return `${recording.bookId}-${date}-${recording.id.slice(0, 8)}.${extension}`;
}

export function recordingCapacity(
  records: Pick<Recording, "id" | "blob">[],
  next: Recording,
) {
  const others = records.filter((record) => record.id !== next.id);
  return (
    others.length < recordingLimits.count &&
    others.reduce(
      (total, record) => total + record.blob.size,
      next.blob.size,
    ) <= recordingLimits.totalBytes
  );
}
