export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function readLimitedJson(request: Request, limit = 2 * 1024 * 1024): Promise<unknown> {
  if (!request.body) throw new HttpError(400, "A JSON document is required.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new HttpError(413, "This document is too large. The limit is 2 MB."); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "The file is not valid JSON.");
  } finally { reader.releaseLock(); }
}

export function apiError(error: unknown): Response {
  if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
  console.error("Request failed", error);
  return Response.json({ error: "Unable to save this change. Check the server’s data directory and try again." }, { status: 500 });
}
