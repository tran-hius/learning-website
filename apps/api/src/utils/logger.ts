import pino from "pino";
import { isProdEnv } from "../config/app";

export const logger = pino({
  level: isProdEnv ? "info" : "debug",
  // Pretty logs are a dev-only convenience.
  transport: isProdEnv
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:HH:MM:ss.l" },
      },
  redact: ["password", "passwordHash", "token", "accessToken", "refreshToken"],
});
