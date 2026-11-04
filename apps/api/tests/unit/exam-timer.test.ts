import { describe, expect, it } from "vitest";
import {
  remainingSeconds,
  isExpired,
  timeSpentSeconds,
  pickQuestionIdsByDifficulty,
} from "../../src/utils/exam-timer";

/**
 * TASK-005 DoD: logic timer là PURE function — KHÔNG phụ thuộc Redis.
 * Redis chỉ mirror deadline (best-effort); remaining luôn tính từ expiresAt (DB).
 */
describe("exam timer (pure, Redis-independent)", () => {
  const now = new Date("2026-11-05T10:00:00.000Z");

  it("remainingSeconds: tính đúng từ expiresAt, không cần Redis", () => {
    const exp = new Date("2026-11-05T10:29:30.000Z"); // +29m30s
    expect(remainingSeconds(exp, now)).toBe(1770);
  });

  it("remainingSeconds: quá hạn → 0 (clamp, không âm)", () => {
    expect(remainingSeconds(new Date("2026-11-05T09:59:00.000Z"), now)).toBe(0);
  });

  it("remainingSeconds: nhận ISO string như Date (fallback DB shape)", () => {
    expect(remainingSeconds("2026-11-05T10:01:00.000Z", now)).toBe(60);
  });

  it("isExpired: đúng biên deadline", () => {
    expect(isExpired(new Date("2026-11-05T10:00:00.000Z"), now)).toBe(true);
    expect(isExpired(new Date("2026-11-05T10:00:01.000Z"), now)).toBe(false);
  });

  it("timeSpentSeconds: nộp trước deadline → thời gian thực", () => {
    const started = new Date("2026-11-05T10:00:00.000Z");
    const submitted = new Date("2026-11-05T10:12:40.000Z");
    const expires = new Date("2026-11-05T10:30:00.000Z");
    expect(timeSpentSeconds(started, submitted, expires)).toBe(760);
  });

  it("timeSpentSeconds: clamp theo deadline (guard nộp muộn)", () => {
    const started = new Date("2026-11-05T10:00:00.000Z");
    const submitted = new Date("2026-11-05T10:40:00.000Z"); // muộn hơn deadline 10p
    const expires = new Date("2026-11-05T10:30:00.000Z");
    expect(timeSpentSeconds(started, submitted, expires)).toBe(1800);
  });
});

describe("pickQuestionIdsByDifficulty (60/20/20 — contract mục 5)", () => {
  const pool = [
    ...Array.from({ length: 10 }, (_, i) => ({ id: `m${i}`, difficulty: "MEDIUM" as const })),
    ...Array.from({ length: 6 }, (_, i) => ({ id: `e${i}`, difficulty: "EASY" as const })),
    ...Array.from({ length: 6 }, (_, i) => ({ id: `h${i}`, difficulty: "HARD" as const })),
  ];

  it("chọn đủ total, ưu tiên tỷ lệ 60/20/20", () => {
    const picked = pickQuestionIdsByDifficulty(pool, 10, () => 0.5);
    expect(picked).toHaveLength(10);
    expect(new Set(picked).size).toBe(10); // không trùng
    const medium = picked.filter((id) => id.startsWith("m")).length;
    const easy = picked.filter((id) => id.startsWith("e")).length;
    const hard = picked.filter((id) => id.startsWith("h")).length;
    expect(medium).toBe(6); // 60%
    expect(easy).toBe(2); // 20%
    expect(hard).toBe(2); // 20%
  });

  it("pool thiếu một độ khó → lấy bù từ độ khó khác, vẫn đủ total", () => {
    const skewed = [
      ...Array.from({ length: 20 }, (_, i) => ({ id: `m${i}`, difficulty: "MEDIUM" as const })),
    ];
    const picked = pickQuestionIdsByDifficulty(skewed, 5);
    expect(picked).toHaveLength(5);
    expect(new Set(picked).size).toBe(5);
  });

  it("pool nhỏ hơn total → lấy hết pool", () => {
    const small = [{ id: "m0", difficulty: "MEDIUM" as const }];
    expect(pickQuestionIdsByDifficulty(small, 20)).toEqual(["m0"]);
  });
});
