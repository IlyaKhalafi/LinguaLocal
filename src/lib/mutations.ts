import { HttpError } from "./http";

export function checkMutation(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  let source: URL;
  try {
    source = new URL(origin);
  } catch {
    throw new HttpError(
      403,
      "Open this action from your school’s learning hub.",
    );
  }
  // Next.js may resolve the request URL through its internal listening host.
  const host = request.headers.get("host") ?? new URL(request.url).host;
  if (!["http:", "https:"].includes(source.protocol) || source.host !== host)
    throw new HttpError(
      403,
      "Open this action from your school’s learning hub.",
    );
}
