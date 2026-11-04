import { describe, expect, it } from "vitest";
import { computeMilestoneStatuses } from "../../src/utils/roadmap-logic";

/**
 * TASK-006 (R4): milestone mở theo dependencies — AVAILABLE khi mọi dependsOn DONE.
 */
describe("computeMilestoneStatuses (R4)", () => {
  const ms = (id: string, dependsOn: string[] = []) => ({ id, dependsOn });

  it("không dependency → AVAILABLE; có DONE đầu tiên → mở milestone kế", () => {
    const status = computeMilestoneStatuses(
      [ms("m1"), ms("m2", ["m1"]), ms("m3", ["m2"])],
      new Set(["m1"]),
    );
    expect(status.get("m1")).toBe("DONE");
    expect(status.get("m2")).toBe("AVAILABLE");
    expect(status.get("m3")).toBe("LOCKED"); // m2 chưa DONE
  });

  it("xong đủ chuỗi → tất cả DONE", () => {
    const status = computeMilestoneStatuses(
      [ms("m1"), ms("m2", ["m1"]), ms("m3", ["m1", "m2"])],
      new Set(["m1", "m2", "m3"]),
    );
    expect([...status.values()].every((s) => s === "DONE")).toBe(true);
  });

  it("multi-dependency: cần TẤT CẢ deps DONE mới mở", () => {
    const status = computeMilestoneStatuses(
      [ms("m1"), ms("m2"), ms("m3", ["m1", "m2"])],
      new Set(["m1"]),
    );
    expect(status.get("m3")).toBe("LOCKED");
  });

  it("vòng lặp dependencies (dữ liệu bẩn) → không treo, còn lại LOCKED", () => {
    const status = computeMilestoneStatuses(
      [ms("a", ["b"]), ms("b", ["a"]), ms("c")],
      new Set(),
    );
    expect(status.get("c")).toBe("AVAILABLE");
    expect(status.get("a")).toBe("LOCKED");
    expect(status.get("b")).toBe("LOCKED");
  });

  it("dependency trỏ id lạ (không tồn tại) → bỏ qua, vẫn mở", () => {
    const status = computeMilestoneStatuses([ms("m1", ["ghost"])], new Set());
    expect(status.get("m1")).toBe("AVAILABLE");
  });
});
