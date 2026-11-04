import { describe, expect, it } from "vitest";
import { mergeExamAnswers } from "../../src/utils/exam-merge";

/**
 * D16-2 (TASK-006): E4 submit hợp nhất autosave ∪ submit, submit ƯU TIÊN —
 * autosave của câu không submit vẫn giữ lại để chấm (không xoá sạch).
 */
describe("mergeExamAnswers (D16-2)", () => {
  const known = new Set(["q1", "q2", "q3"]);

  it("submit ưu tiên: cùng questionId → lấy value của submit", () => {
    const merged = mergeExamAnswers(
      [{ questionId: "q1", value: "opt_a" }],
      [{ questionId: "q1", value: "opt_b" }],
      known,
    );
    expect(merged).toEqual([{ questionId: "q1", value: "opt_b" }]);
  });

  it("autosave của câu KHÔNG submit vẫn được giữ (không mất đáp án khi reload/submit thiếu câu)", () => {
    const merged = mergeExamAnswers(
      [
        { questionId: "q1", value: "opt_a" },
        { questionId: "q2", value: ["opt_a", "opt_c"] },
      ],
      [{ questionId: "q3", value: "9" }],
      known,
    );
    expect(merged).toHaveLength(3);
    expect(merged.find((m) => m.questionId === "q2")?.value).toEqual(["opt_a", "opt_c"]);
    expect(merged.find((m) => m.questionId === "q3")?.value).toBe("9");
  });

  it("bỏ câu KHÔNG thuộc đề (cả autosave lẫn submit)", () => {
    const merged = mergeExamAnswers(
      [{ questionId: "q_hack", value: "x" }],
      [{ questionId: "q1", value: "opt_a" }, { questionId: "q_evil", value: "y" }],
      known,
    );
    expect(merged.map((m) => m.questionId)).toEqual(["q1"]);
  });

  it("không có gì → rỗng", () => {
    expect(mergeExamAnswers([], [], known)).toEqual([]);
  });
});
