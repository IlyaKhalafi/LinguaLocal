import { loadEnvFile } from "node:process";
export function loadEnvironment(file = ".env") {
  try {
    loadEnvFile(file);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
loadEnvironment();
