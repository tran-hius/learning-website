import { NextResponse } from "next/server";

/** GET /api/health — scaffold liveness probe, no DB dependency yet. */
export async function GET() {
  return NextResponse.json(
    {
      success: true,
      data: { status: "ok", uptimeSec: Math.floor(process.uptime()) },
      error: null,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
