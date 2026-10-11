import { z } from "zod";
import { schoolUrl } from "./network-address";
export const serverConfigSchema = z.object({
  port: z.number().int().min(1).max(65535).default(3000),
  host: z
    .string()
    .regex(/^[a-zA-Z0-9.:[\]-]+$/)
    .max(253)
    .default("0.0.0.0"),
  publicUrl: z
    .string()
    .optional()
    .refine((value) => {
      if (!value) return true;
      try {
        schoolUrl(value);
        return true;
      } catch {
        return false;
      }
    }, "Use an HTTP or HTTPS school network address"),
});
export type ServerConfig = z.infer<typeof serverConfigSchema>;
export function serverConfig(env = process.env): ServerConfig {
  return serverConfigSchema.parse({
    port: Number(env.PORT || 3000),
    host: env.LINGUALOCAL_HOST || "0.0.0.0",
    publicUrl: env.LINGUALOCAL_PUBLIC_URL || undefined,
  });
}
export function configTemplate(config: ServerConfig) {
  return `PORT=${config.port}\nLINGUALOCAL_HOST=${config.host}\n${config.publicUrl ? `LINGUALOCAL_PUBLIC_URL=${schoolUrl(config.publicUrl)}\n` : ""}# Set the restored data directory for this computer.\n# LINGUALOCAL_DATA_DIR=/srv/lingualocal-restored\n# LINGUALOCAL_MEDIA_DIR=/srv/lingualocal-restored/media\n`;
}
