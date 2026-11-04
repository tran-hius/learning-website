import { describe, expect, it } from "vitest";
import { examSubmitSchema, startExamSchema } from "../../src/validations/exam.schema";
import { pomodoroSchema } from "../../src/validations/progress.schema";

/**
 * TASK-006: validate contract v1.1
 * - D15-BE: E4 nhận `violations?: number` (0..99), không gửi → optional.
 * - D14: G6 minutes ∈ [25..60] (integer).
 */
describe("examSubmitSchema — violations (D15-BE)", () => {
  const validAnswers = [{ questionId: "q1", value: "opt_a" }];

  it("không gửi violations → OK (optional)", () => {
    const r = examSubmitSchema.parse({ answers: validAnswers });
    expect(r.violations).toBeUndefined();
  });

  it("violations = 0 và 99 → OK", () => {
    expect(examSubmitSchema.parse({ answers: validAnswers, violations: 0 }).violations).toBe(0);
    expect(examSubmitSchema.parse({ answers: validAnswers, violations: 99 }).violations).toBe(99);
  });

  it("violations < 0, > 99, lẻ/thập phân, không phải số → REJECT", () => {
    expect(() => examSubmitSchema.parse({ answers: validAnswers, violations: -1 })).toThrow();
    expect(() => examSubmitSchema.parse({ answers: validAnswers, violations: 100 })).toThrow();
    expect(() => examSubmitSchema.parse({ answers: validAnswers, violations: 1.5 })).toThrow();
    expect(() => examSubmitSchema.parse({ answers: validAnswers, violations: "3" })).toThrow();
  });
});

describe("pomodoroSchema (G6/D14)", () => {
  it("minutes 25..60 integer → OK", () => {
    expect(pomodoroSchema.parse({ minutes: 25 }).minutes).toBe(25);
    expect(pomodoroSchema.parse({ minutes: 30 }).minutes).toBe(30);
    expect(pomodoroSchema.parse({ minutes: 60 }).minutes).toBe(60);
  });

  it("ngoài [25..60] / thập phân / thiếu → REJECT", () => {
    expect(() => pomodoroSchema.parse({ minutes: 24 })).toThrow();
    expect(() => pomodoroSchema.parse({ minutes: 61 })).toThrow();
    expect(() => pomodoroSchema.parse({ minutes: 29.5 })).toThrow();
    expect(() => pomodoroSchema.parse({})).toThrow();
  });

  it("completedAt không hợp lệ → REJECT; ISO hợp lệ → OK", () => {
    expect(() => pomodoroSchema.parse({ minutes: 30, completedAt: "yesterday" })).toThrow();
    expect(pomodoroSchema.parse({ minutes: 30, completedAt: "2026-11-05T10:00:00.000Z" }).completedAt).toBe(
      "2026-11-05T10:00:00.000Z",
    );
  });
});

describe("startExamSchema (E1) — giữ nguyên hành vi TASK-005", () => {
  it("PLACEMENT_TEST không cần examBankId", () => {
    expect(() => startExamSchema.parse({ kind: "PLACEMENT_TEST" })).not.toThrow();
  });
  it("PRACTICE_TEST thiếu examBankId → REJECT", () => {
    expect(() => startExamSchema.parse({ kind: "PRACTICE_TEST" })).toThrow();
  });
});
