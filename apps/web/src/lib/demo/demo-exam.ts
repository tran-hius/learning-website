import type { QuestionType } from "@/lib/api/types";

/**
 * Dữ liệu demo cho phòng thi khi API lỗi (D13: API 200 ưu tiên, fallback demo
 * trung thực). NGUYÊN TẮC: không fake như thật — banner demo phải hiện rõ,
 * điểm chỉ chấm local, KHÔNG gửi server. MATCH_PAIRS dùng shape {leftId, rightId}
 * theo contract P1/E4 (BE-2 TASK-005).
 */
export type DemoExamQuestionType = Extract<
  QuestionType,
  "MCQ_SINGLE" | "MCQ_MULTI" | "FILL_ANSWER" | "MATCH_PAIRS"
>;

export interface DemoExamQuestion {
  id: string;
  type: DemoExamQuestionType;
  stem: string;
  options: Array<{ id: string; content: string }>;
  /** Demo mode: đáp án để chấm local. Không render ra UI trước khi nộp. */
  answer: string | string[] | Array<{ leftId: string; rightId: string }>;
  explanation: string;
}

export interface DemoExam {
  title: string;
  durationSec: number;
  questions: DemoExamQuestion[];
}

export const DEMO_EXAM: DemoExam = {
  title: "Thi thử Toán — demo",
  durationSec: 10 * 60, // 10 phút
  questions: [
    {
      id: "demo-exam-q1",
      type: "MCQ_SINGLE",
      stem: "Đạo hàm của hàm số $f(x) = x^3$ là đáp án nào?",
      options: [
        { id: "demo-exam-a", content: "$3x^2$" },
        { id: "demo-exam-b", content: "$x^2$" },
        { id: "demo-exam-c", content: "$3x$" },
        { id: "demo-exam-d", content: "$x^4/4$" },
      ],
      answer: "demo-exam-a",
      explanation:
        "Áp dụng $(x^n)' = n x^{n-1}$ với $n = 3$ ta được $(x^3)' = 3x^2$. Đáp án D là nguyên hàm, không phải đạo hàm.",
    },
    {
      id: "demo-exam-q2",
      type: "MCQ_MULTI",
      stem: "Những hàm số nào dưới đây có đạo hàm bằng chính nó? (chọn tất cả đáp án đúng)",
      options: [
        { id: "demo-exam-e", content: "$e^x$" },
        { id: "demo-exam-f", content: "$\\sin x$" },
        { id: "demo-exam-g", content: "$e^{2x} \\cdot e^{-x}$" },
        { id: "demo-exam-h", content: "$\\cos x$" },
      ],
      answer: ["demo-exam-e", "demo-exam-g"],
      explanation:
        "$e^x$ đạo hàm bằng chính nó; $e^{2x}\\cdot e^{-x} = e^x$ cũng vậy. $\\sin' x = \\cos x$ và $\\cos' x = -\\sin x$ — không giữ nguyên.",
    },
    {
      id: "demo-exam-q3",
      type: "FILL_ANSWER",
      stem: "Tính $f'(1)$ với $f(x) = x^3 - 2x$. Điền kết quả (chỉ điền số).",
      options: [],
      answer: "1",
      explanation: "$f'(x) = 3x^2 - 2$ nên $f'(1) = 3 - 2 = 1$.",
    },
    {
      id: "demo-exam-q4",
      type: "MATCH_PAIRS",
      stem: "Nối mỗi phép tính với kết quả đúng của nó.",
      options: [
        { id: "opt_l1", content: "2 + 2" },
        { id: "opt_l2", content: "3 × 3" },
        { id: "opt_l3", content: "10 − 4" },
        { id: "opt_r1", content: "4" },
        { id: "opt_r2", content: "9" },
        { id: "opt_r3", content: "6" },
      ],
      answer: [
        { leftId: "opt_l1", rightId: "opt_r1" },
        { leftId: "opt_l2", rightId: "opt_r2" },
        { leftId: "opt_l3", rightId: "opt_r3" },
      ],
      explanation: "2 + 2 = 4 · 3 × 3 = 9 · 10 − 4 = 6.",
    },
    {
      id: "demo-exam-q5",
      type: "MCQ_SINGLE",
      stem: "Một hình chữ nhật có chu vi 20 và chiều dài 7. Chiều rộng là bao nhiêu?",
      options: [
        { id: "demo-exam-i", content: "3" },
        { id: "demo-exam-j", content: "6" },
        { id: "demo-exam-k", content: "13" },
      ],
      answer: "demo-exam-i",
      explanation: "Chu vi = 2 × (dài + rộng) ⇒ rộng = 20/2 − 7 = 3.",
    },
  ],
};
