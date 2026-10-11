import { cache } from "react";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, parseLocale, translate } from "./locale";

export const getRequestLocale = cache(async () =>
  parseLocale((await cookies()).get(LOCALE_COOKIE)?.value),
);
export async function localizedMetadata(title: string) {
  return { title: translate(await getRequestLocale(), title) };
}
