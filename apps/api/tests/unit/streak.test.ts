import { describe, expect, it } from "vitest";
import { computeStreaks, utcDayKey, lastNDayKeys } from "../../src/utils/streak";

/**
 * TASK-006 (G1/G4): streak = ngày liên tục có hoạt động. Unit test pure —
 * hoạt động derive từ lesson completes / exam submits / pomodoro sessions.
 */
describe("streak logic (TASK-006)", () => {
  const today = "2026-11-05";

  it("utcDayKey: chuẩn hoá theo UTC", () => {
    expect(utcDayKey(new Date("2026-11-05T23:59:59.000Z"))).toBe("2026-11-05");
    expect(utcDayKey("2026-01-01T00:00:00.000Z")).toBe("2026-01-01");
  });

  it("hoạt động liên tục 5 ngày kết thúc hôm nay → current=5, longest=5", () => {
    const days = ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05"];
    expect(computeStreaks(days, today)).toEqual({ current: 5, longest: 5 });
  });

  it("hôm nay chưa hoạt động → chuỗi kết thúc HÔM QUA vẫn được tính (GitHub pattern)", () => {
    const days = ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04"];
    expect(computeStreaks(days, today).current).toBe(4);
  });

  it("nghỉ 1 ngày giữa chừng → current dừng, longest giữ mốc cao nhất", () => {
    const days = ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-05"];
    const r = computeStreaks(days, today);
    expect(r.current).toBe(1);
    expect(r.longest).toBe(3);
  });

  it("hoạt động xa (>1 ngày) → current = 0", () => {
    expect(computeStreaks(["2026-10-01", "2026-10-02"], today)).toEqual({ current: 0, longest: 2 });
  });

  it("không có hoạt động nào → 0/0", () => {
    expect(computeStreaks([], today)).toEqual({ current: 0, longest: 0 });
  });

  it("lastNDayKeys: đủ N ngày, cũ → mới", () => {
    expect(lastNDayKeys("2026-11-05", 3)).toEqual(["2026-11-03", "2026-11-04", "2026-11-05"]);
  });
});
