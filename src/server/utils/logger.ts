import pino from "pino";
import { isProduction } from "../config/app";

export const logger = pino({
  level: isProduction ? "info" : "debug",
  // Pretty logs are a dev-only convenience.
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:HH:MM:ss.l" },
      },
  redact: ["password", "passwordHash", "token", "accessToken", "refreshToken"],
});
