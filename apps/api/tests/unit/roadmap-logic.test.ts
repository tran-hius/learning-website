import { describe, expect, it } from "vitest";
import { computeMilestoneStatuses, resolveMilestoneDoneIds } from "../../src/utils/roadmap-logic";

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

/**
 * F1 hotfix (review db3f181): milestone RỖNG chỉ DONE khi AVAILABLE (deps DONE),
 * không tự DONE — nếu không seed toàn milestone rỗng sẽ R4 100% DONE ngay khi enroll.
 */
describe("resolveMilestoneDoneIds (F1 hotfix)", () => {
  const node = (id: string, dependsOn: string[], hasContent: boolean) => ({
    id,
    dependsOn,
    hasContent,
  });

  it("milestone rỗng có deps chưa DONE → KHÔNG DONE (LOCKED)", () => {
    const doneIds = resolveMilestoneDoneIds(
      [node("m1", [], true), node("m2", ["m1"], false)],
      new Set(), // m1 (có nội dung) chưa xong
    );
    expect(doneIds.has("m2")).toBe(false);
    const status = computeMilestoneStatuses(
      [node("m1", [], true), node("m2", ["m1"], false)],
      doneIds,
    );
    expect(status.get("m2")).toBe("LOCKED");
  });

  it("milestone rỗng deps đã DONE → DONE", () => {
    const doneIds = resolveMilestoneDoneIds(
      [node("m1", [], true), node("m2", ["m1"], false)],
      new Set(["m1"]),
    );
    expect(doneIds.has("m2")).toBe(true);
    const status = computeMilestoneStatuses(
      [node("m1", [], true), node("m2", ["m1"], false)],
      doneIds,
    );
    expect(status.get("m2")).toBe("DONE");
  });

  it("chuỗi milestone rỗng nối tiếp: fixpoint hội tụ — rỗng không có việc nên DONE khi tới lượt", () => {
    const nodes = [node("m1", [], true), node("m2", ["m1"], false), node("m3", ["m2"], false)];
    const doneIds = resolveMilestoneDoneIds(nodes, new Set(["m1"]));
    // m2 rỗng AVAILABLE → DONE; m3 rỗng deps (m2) đã DONE → cũng DONE (fixpoint).
    expect(doneIds.has("m2")).toBe(true);
    expect(doneIds.has("m3")).toBe(true);
  });

  it("milestone rỗng cuối chuỗi KHÔNG mở khi milestone CÓ nội dung giữa chưa xong", () => {
    const nodes = [node("m1", [], true), node("m2", ["m1"], true), node("m3", ["m2"], false)];
    const doneIds = resolveMilestoneDoneIds(nodes, new Set(["m1"]));
    // m2 có nội dung chưa xong → LOCKED; m3 rỗng không thể AVAILABLE → không DONE.
    expect(doneIds.has("m2")).toBe(false);
    expect(doneIds.has("m3")).toBe(false);
  });

  it("milestone CÓ nội dung không tự DONE (vẫn do service quyết định)", () => {
    const doneIds = resolveMilestoneDoneIds([node("m1", [], true)], new Set());
    expect(doneIds.has("m1")).toBe(false);
  });
});
