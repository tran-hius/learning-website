import { describe, expect, it } from "vitest";
import { okBody, failBody } from "@/utils/response";

describe("response helpers (api contract envelope)", () => {
  it("okBody() wraps data in the { success, data, error } frame", () => {
    expect(okBody({ status: "ok" })).toEqual({
      success: true,
      data: { status: "ok" },
      error: null,
    });
  });

  it("failBody() returns { success: false, data: null, error: { code, message } }", () => {
    expect(failBody("NOT_FOUND", "Lesson not found")).toEqual({
      success: false,
      data: null,
      error: { code: "NOT_FOUND", message: "Lesson not found" },
    });
  });

  it("failBody() attaches optional details (zod shape per contract)", () => {
    const body = failBody("VALIDATION_ERROR", "Bad input", { fieldErrors: [] });
    expect(body.error?.details).toEqual({ fieldErrors: [] });
  });
});
