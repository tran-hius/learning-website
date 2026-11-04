import { NextRequest, NextResponse } from "next/server";
import { fail } from "../utils";

export type Role = "STUDENT" | "TEACHER" | "ADMIN";

type RouteContext = { params: Promise<Record<string, string>> };

/**
 * Resolve the requester's role from the request auth context (JWT cookie).
 * Placeholder until auth lands in a later task; always AUTH_REQUIRED for now.
 */
async function resolveRequesterRole(req: NextRequest): Promise<Role | null> {
  // TODO: read at_v cookie + JWT claims in the auth task.
  void req;
  return null;
}

/**
 * Higher-order function securing a route handler behind one of `roles`.
 * Usage: export const GET = requireRole(["ADMIN"])(async (req, ctx) => { ... });
 */
export function requireRole(
  roles: Role[],
): (
  handler: (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>,
) => (req: NextRequest, ctx: RouteContext) => Promise<NextResponse> {
  return (handler) => async (req, ctx) => {
    const role = await resolveRequesterRole(req);
    if (!role) return fail("AUTH_REQUIRED", "Authentication required", 401);
    if (!roles.includes(role)) {
      return fail("FORBIDDEN", "Insufficient permissions", 403);
    }
    return handler(req, ctx);
  };
}
