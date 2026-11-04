/**
 * Roadmap milestone unlock logic (TASK-006, R4) — PURE functions.
 *
 * Quy tắc contract R4: milestone mở khi XONG đủ dependencies.
 * - DONE: milestone đã hoàn thành (do service truyền vào `doneIds`).
 * - AVAILABLE: mọi dependsOn đều DONE (hoặc không có dependency).
 * - LOCKED: còn dependency chưa DONE.
 * - Vòng lặp dependencies (dữ liệu bẩn): xử lý fixpoint — milestone không giải
 *   quyết được sau khi hội tụ coi như LOCKED (an toàn, không treo).
 */
export type MilestoneStatus = "LOCKED" | "AVAILABLE" | "DONE";

export type MilestoneNode = { id: string; dependsOn: string[] };

export function computeMilestoneStatuses(
  milestones: MilestoneNode[],
  doneIds: ReadonlySet<string>,
): Map<string, MilestoneStatus> {
  const status = new Map<string, MilestoneStatus>();
  for (const m of milestones) {
    if (doneIds.has(m.id)) status.set(m.id, "DONE");
  }

  // Fixpoint: lặp đến khi không còn milestone mới chuyển sang AVAILABLE.
  const byId = new Map(milestones.map((m) => [m.id, m]));
  let changed = true;
  while (changed) {
    changed = false;
    for (const m of milestones) {
      if (status.has(m.id)) continue;
      const deps = m.dependsOn.filter((d) => byId.has(d)); // dependency lạ → bỏ qua
      const allDone = deps.every((d) => status.get(d) === "DONE");
      if (allDone) {
        status.set(m.id, "AVAILABLE");
        changed = true;
      }
    }
  }
  // Còn lại (trong vòng lặp deps chưa DONE) → LOCKED.
  for (const m of milestones) {
    if (!status.has(m.id)) status.set(m.id, "LOCKED");
  }
  return status;
}

/**
 * F1 hotfix (review db3f181): milestone RỖNG (không lessons, không examBank)
 * chỉ được coi DONE khi nó đã AVAILABLE (deps đã DONE) — KHÔNG tự DONE ngay.
 *
 * Fixpoint: chạy computeMilestoneStatuses với chỉ milestone CÓ nội dung trong
 * `contentDoneIds` trước; milestone rỗng AVAILABLE được thêm vào doneIds rồi
 * tính lại, lặp đến khi hội tụ (xử lý trường hợp milestone rỗng phụ thuộc
 * milestone rỗng). An toàn dừng: mỗi vòng thêm tối đa len phần tử mới.
 */
export type MilestoneContentNode = MilestoneNode & { hasContent: boolean };

export function resolveMilestoneDoneIds(
  milestones: MilestoneContentNode[],
  contentDoneIds: ReadonlySet<string>,
): Set<string> {
  const doneIds = new Set(contentDoneIds);
  let changed = true;
  while (changed) {
    changed = false;
    const statuses = computeMilestoneStatuses(milestones, doneIds);
    for (const m of milestones) {
      if (!m.hasContent && !doneIds.has(m.id) && statuses.get(m.id) === "AVAILABLE") {
        doneIds.add(m.id);
        changed = true;
      }
    }
  }
  return doneIds;
}
