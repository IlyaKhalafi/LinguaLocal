import { z } from "zod";
export const PREFERENCES_COOKIE = "lingualocal.preferences";
export const preferencesSchema = z.object({
  appearance: z.enum(["light", "dark", "system"]).default("light"),
  size: z.enum(["standard", "large"]).default("standard"),
  spacing: z.enum(["standard", "relaxed"]).default("standard"),
  font: z.enum(["default", "readable"]).default("default"),
  contrast: z.boolean().default(false),
  quiet: z.boolean().default(false),
});
export type Preferences = z.infer<typeof preferencesSchema>;
export const defaultPreferences = preferencesSchema.parse({});
export function parsePreferences(value?: string): Preferences {
  try {
    if (!value || value.length > 2048) return defaultPreferences;
    const result = preferencesSchema.safeParse(
      JSON.parse(decodeURIComponent(value)),
    );
    return result.success ? result.data : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
}
export function preferenceAttributes(preferences: Preferences) {
  return {
    "data-appearance": preferences.appearance,
    "data-reading-size": preferences.size,
    "data-reading-spacing": preferences.spacing,
    "data-reading-font": preferences.font,
    "data-contrast": String(preferences.contrast),
    "data-quiet": String(preferences.quiet),
  };
}
