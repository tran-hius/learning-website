import { describe, expect, it } from "vitest";
import { isAnswerCorrect, correctAnswerOf } from "../../src/utils/scoring";

/**
 * Unit test chấm bài practice (TASK-004, P1) — DoD: case đúng/sai/đa đáp án thiếu 1
 * cho MCQ_SINGLE, MCQ_MULTI, FILL, MATCH_PAIRS.
 */
describe("isAnswerCorrect", () => {
  const mcqSingle = { correctOptionIds: ["opt_b"] };
  const mcqMulti = { correctOptionIds: ["opt_a", "opt_c"] };
  const fill = { correctText: "5" };
  const pairs = { pairs: [{ left: "one", right: "1" }, { left: "two", right: "2" }] };

  it("MCQ_SINGLE: đúng khi khớp 1 option", () => {
    expect(isAnswerCorrect("MCQ_SINGLE", mcqSingle, "opt_b")).toBe(true);
  });
  it("MCQ_SINGLE: sai khi chọn option khác", () => {
    expect(isAnswerCorrect("MCQ_SINGLE", mcqSingle, "opt_a")).toBe(false);
  });
  it("MCQ_SINGLE: sai khi gửi mảng thay vì string", () => {
    expect(isAnswerCorrect("MCQ_SINGLE", mcqSingle, ["opt_b"])).toBe(false);
  });

  it("MCQ_MULTI: đúng khi chọn đủ bộ đáp án", () => {
    expect(isAnswerCorrect("MCQ_MULTI", mcqMulti, ["opt_a", "opt_c"])).toBe(true);
    expect(isAnswerCorrect("MCQ_MULTI", mcqMulti, ["opt_c", "opt_a"])).toBe(true); // thứ tự tự do
  });
  it("MCQ_MULTI: sai khi thiếu 1 đáp án", () => {
    expect(isAnswerCorrect("MCQ_MULTI", mcqMulti, ["opt_a"])).toBe(false);
  });
  it("MCQ_MULTI: sai khi thừa đáp án", () => {
    expect(isAnswerCorrect("MCQ_MULTI", mcqMulti, ["opt_a", "opt_b", "opt_c"])).toBe(false);
  });

  it("FILL_ANSWER: đúng bỏ qua hoa/thường & khoảng trắng", () => {
    expect(isAnswerCorrect("FILL_ANSWER", fill, "5")).toBe(true);
    expect(isAnswerCorrect("FILL_ANSWER", { correctText: "Hello World" }, "  hello world ")).toBe(true);
  });
  it("FILL_ANSWER: sai khi khác đáp án", () => {
    expect(isAnswerCorrect("FILL_ANSWER", fill, "6")).toBe(false);
  });

  it("MATCH_PAIRS: đúng khi đủ cặp, bất kể thứ tự", () => {
    expect(
      isAnswerCorrect("MATCH_PAIRS", pairs, [
        { left: "two", right: "2" },
        { left: "one", right: "1" },
      ]),
    ).toBe(true);
  });
  it("MATCH_PAIRS: sai khi sai 1 cặp", () => {
    expect(
      isAnswerCorrect("MATCH_PAIRS", pairs, [
        { left: "one", right: "1" },
        { left: "two", right: "1" },
      ]),
    ).toBe(false);
  });
  it("MATCH_PAIRS: sai khi thiếu cặp", () => {
    expect(isAnswerCorrect("MATCH_PAIRS", pairs, [{ left: "one", right: "1" }])).toBe(false);
  });

  it("LISTEN_MCQ: chấm như MCQ_SINGLE", () => {
    expect(isAnswerCorrect("LISTEN_MCQ", mcqSingle, "opt_b")).toBe(true);
    expect(isAnswerCorrect("LISTEN_MCQ", mcqSingle, "opt_c")).toBe(false);
  });
});

describe("correctAnswerOf", () => {
  it("trả correctOptionIds / correctText / pairs theo loại", () => {
    expect(correctAnswerOf("MCQ_SINGLE", { correctOptionIds: ["opt_b"] })).toEqual(["opt_b"]);
    expect(correctAnswerOf("FILL_ANSWER", { correctText: "5" })).toBe("5");
    expect(correctAnswerOf("MATCH_PAIRS", { pairs: [{ left: "a", right: "b" }] })).toEqual([
      { left: "a", right: "b" },
    ]);
  });
});
