import { afterEach, describe, expect, it, vi } from "vitest";
import { PracticeService } from "../../src/services/practice.service";

/**
 * Unit test Piston proxy (TASK-004, P3) — MOCK fetch global.
 *
 * KÊ KHAI: test request THẬT đến https://emkc.org/api/v2/piston/execute đã bị
 * chặn bởi server (HTTP 401 Unauthorized — từ 15/02/2026 public Piston API chỉ
 * chấp nhận project whitelisted). Theo task file, test dùng mock fetch và việc
 * này được kê khai rõ. URL có thể đổi qua env PISTON_URL khi self-host/whitelist.
 */
describe("PracticeService.execPython (mock fetch)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("map response Piston → { stdout, stderr, exitCode, timeMs }", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ run: { stdout: "5\n", stderr: "", code: 0, signal: null } }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const service = new PracticeService(
      { findPracticeSetById: vi.fn() } as never,
      { addXp: vi.fn() } as never,
    );
    const result = await service.execPython("usr_test", { code: "print(2+3)" });

    expect(result.stdout).toBe("5\n");
    expect(result.stderr).toBe("");
    expect(result.exitCode).toBe(0);
    expect(result.timeMs).toBeGreaterThanOrEqual(0);

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.language).toBe("python");
    expect(body.version).toBe("3.10.0");
    expect(body.stdin).toBeUndefined();
  });

  it("gửi stdin khi có", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ run: { stdout: "", code: 0 } }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const service = new PracticeService({} as never, {} as never);
    await service.execPython("usr_test", { code: "input()", stdin: "hello" });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as { stdin?: string };
    expect(body.stdin).toBe("hello");
  });

  it("HTTP lỗi từ Piston → AppError INTERNAL", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("unauthorized", { status: 401 })),
    );
    const service = new PracticeService({} as never, {} as never);
    await expect(service.execPython("usr_test", { code: "x" })).rejects.toMatchObject({
      code: "INTERNAL",
      status: 500,
    });
  });

  it("fetch throw (mạng lỗi) → AppError INTERNAL", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    const service = new PracticeService({} as never, {} as never);
    await expect(service.execPython("usr_test", { code: "x" })).rejects.toMatchObject({
      code: "INTERNAL",
    });
  });
});
