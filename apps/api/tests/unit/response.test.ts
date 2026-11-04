import { describe, expect, it } from "vitest";
import { NextResponse } from "next/server";
import { ok, fail } from "@/server/utils/response";

describe("response helpers (api contract envelope)", () => {
  it("ok() wraps data in the { success, data, error } frame", async () => {
    const res = ok({ status: "ok" });
    expect(res).toBeInstanceOf(NextResponse);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true, data: { status: "ok" }, error: null });
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("ok() honors a custom status", async () => {
    const res = ok({ id: "usr_1" }, 201);
    expect(res.status).toBe(201);
  });

  it("fail() returns { success: false, data: null, error: { code, message } }", async () => {
    const res = fail("NOT_FOUND", "Lesson not found", 404);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({
      success: false,
      data: null,
      error: { code: "NOT_FOUND", message: "Lesson not found" },
    });
  });

  it("fail() attaches optional details (zod shape per contract)", async () => {
    const res = fail("VALIDATION_ERROR", "Bad input", 422, { fieldErrors: [] });
    const body = await res.json();
    expect(body.error.details).toEqual({ fieldErrors: [] });
  });
});
