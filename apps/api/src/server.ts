import { createApp } from "./app";
import { appEnv } from "./config";
import { logger } from "./utils/logger";

const app = createApp();

const server = app.listen(appEnv.PORT, () => {
  logger.info(`API listening on http://localhost:${appEnv.PORT}`);
});

function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down API");
  server.close(() => process.exit(0));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
