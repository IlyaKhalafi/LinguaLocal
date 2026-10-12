import { ZodError } from "zod";

export function commandErrorMessage(error: unknown, depth = 0): string {
  if (error instanceof ZodError) {
    const messages = error.issues
      .slice(0, 20)
      .map(
        (issue) =>
          `[${issue.path.map(String).join(".") || "document"}] ${issue.message}`,
      );
    if (error.issues.length > 20)
      messages.push("Additional validation errors were omitted.");
    return messages.join("\n");
  }
  if (!(error instanceof Error)) return "Command failed.";
  return error.cause && depth < 3
    ? `${error.message}\n${commandErrorMessage(error.cause, depth + 1)}`
    : error.message;
}
export function runCommand(command: () => Promise<void>) {
  void command().catch((error: unknown) => {
    console.error(commandErrorMessage(error));
    process.exitCode = 1;
  });
}
