export async function requestJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, init);
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      `The server could not complete this request (${response.status}). Try again or check the server.`,
    );
  }
  if (!response.ok)
    throw new Error(
      [
        result.error || "Unable to complete the request.",
        ...(result.issues ?? []),
      ].join(" "),
    );
  return result as T;
}

export function putJson(
  url: string,
  value: unknown,
  headers: Record<string, string> = {},
) {
  return requestJson<{ ok: boolean }>(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(value),
  });
}

export async function uploadMedia(file: File) {
  if (file.size > 100 * 1024 * 1024)
    throw new Error(
      "The upload limit is 100 MB. Copy larger files to the server’s media directory.",
    );
  return requestJson<{ file: string; size: number }>(
    `/api/upload?name=${encodeURIComponent(file.name)}`,
    { method: "POST", body: file, headers: { "X-LinguaLocal-Upload": "1" } },
  );
}
