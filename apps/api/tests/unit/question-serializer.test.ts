import { describe, expect, it } from "vitest";
import {
  serializeQuestionForStudent,
  serializeQuestionsForStudent,
} from "../../src/utils/question-serializer";
import type { QuestionForStudent } from "../../src/utils/question-serializer";

/**
 * Unit test serializer câu hỏi (TASK-003 DoD):
 * câu hỏi trả client KHI LÀM BÀI phải KHÔNG leak answer/explanation/hints[1..].
 */
describe("serializeQuestionForStudent", () => {
  const fullQuestion: QuestionForStudent = {
    id: "q_1",
    type: "MCQ_SINGLE",
    difficulty: "EASY",
    stem: "Kết quả của 2 + 3 là bao nhiêu?",
    media: { imageUrls: ["https://cdn.example.com/a.png"] },
    options: [
      { id: "opt_a", content: "4" },
      { id: "opt_b", content: "5" },
    ],
    answer: { correctOptionIds: ["opt_b"] },
    explanation: "2 + 3 = 5",
    thinkingHints: ["Gợi ý bậc 1", "Gợi ý bậc 2"],
    hintAnswerRef: "opt_b",
  };

  it("không trả answer / explanation / hintAnswerRef", () => {
    const out = serializeQuestionForStudent(fullQuestion) as unknown as Record<string, unknown>;
    expect(out).not.toHaveProperty("answer");
    expect(out).not.toHaveProperty("explanation");
    expect(out).not.toHaveProperty("hintAnswerRef");
    expect(JSON.stringify(out)).not.toContain("correctOptionIds");
    expect(JSON.stringify(out)).not.toContain("2 + 3 = 5");
  });

  it("chỉ giữ thinkingHints bậc 1 (hints[1..] bị bỏ)", () => {
    const out = serializeQuestionForStudent(fullQuestion);
    expect(Array.isArray(out.thinkingHints)).toBe(true);
    expect(out.thinkingHints).toHaveLength(1);
    expect(out.thinkingHints[0]).toBe("Gợi ý bậc 1");
    expect(JSON.stringify(out)).not.toContain("Gợi ý bậc 2");
  });

  it("giữ id/type/difficulty/stem/options/media", () => {
    const out = serializeQuestionForStudent(fullQuestion);
    expect(out).toMatchObject({
      id: "q_1",
      type: "MCQ_SINGLE",
      difficulty: "EASY",
      stem: "Kết quả của 2 + 3 là bao nhiêu?",
    });
    expect(out.options).toEqual(fullQuestion.options);
    expect(out.media).toEqual(fullQuestion.media);
  });

  it("tolerant với thinkingHints/media/options null", () => {
    const out = serializeQuestionForStudent({
      ...fullQuestion,
      media: null,
      options: null,
      thinkingHints: null,
    });
    expect(out.media).toBeNull();
    expect(out.options).toEqual([]);
    expect(out.thinkingHints).toEqual([]);
  });

  it("serializeQuestionsForStudent giữ thứ tự và ẩn đáp án cho cả mảng", () => {
    const items = [fullQuestion, { ...fullQuestion, id: "q_2", type: "FILL_ANSWER" as const }];
    const out = serializeQuestionsForStudent(items);
    expect(out.map((q) => q.id)).toEqual(["q_1", "q_2"]);
    for (const q of out) {
      expect(q).not.toHaveProperty("answer");
      expect(q).not.toHaveProperty("explanation");
      expect(q.thinkingHints.length).toBeLessThanOrEqual(1);
    }
  });
});
