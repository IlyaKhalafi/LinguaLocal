import { ZodError } from "zod";

export function runCommand(command: () => Promise<void>) {
  void command().catch((error: unknown) => {
    if (error instanceof ZodError) {
      for (const issue of error.issues.slice(0, 20))
        console.error(
          `[${issue.path.map(String).join(".") || "pack"}] ${issue.message}`,
        );
      if (error.issues.length > 20)
        console.error("Additional validation errors were omitted.");
    } else {
      console.error(error instanceof Error ? error.message : "Command failed.");
    }
    process.exitCode = 1;
  });
}
