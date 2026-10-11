import { HttpError } from "./http";

export function checkMutation(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    throw new HttpError(
      403,
      "Open this action from your school’s learning hub.",
    );
}
