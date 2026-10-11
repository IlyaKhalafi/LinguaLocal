import { cookies } from "next/headers";
import { cache } from "react";
import { parsePreferences, PREFERENCES_COOKIE } from "./preferences";
export const getRequestPreferences = cache(async () =>
  parsePreferences((await cookies()).get(PREFERENCES_COOKIE)?.value),
);
