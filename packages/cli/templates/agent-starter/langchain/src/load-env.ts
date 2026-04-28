import { config } from "dotenv";

export function loadEnv(): void {
  config();
}
