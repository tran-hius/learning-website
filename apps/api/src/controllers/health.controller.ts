import type { Request, Response } from "express";
import { sendOk } from "../utils/response";

/** GET /api/v1/health — liveness probe, no DB dependency. */
export function healthController(_req: Request, res: Response): void {
  sendOk(res, {
    status: "ok",
    uptimeSec: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}
