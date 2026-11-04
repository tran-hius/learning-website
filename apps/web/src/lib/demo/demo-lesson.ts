import type { QuestionType } from "@/lib/api/types";

/**
 * Dữ liệu demo cho chế độ fallback (API/DB chưa chạy — backend chưa có MySQL).
 * NGUYÊN TẮC: KHÔNG fake data như thật — UI phải hiện banner "chế độ demo"
 * rõ ràng. Đáp án nằm ở client CHỈ trong demo mode để chấm local.
 */
export type DemoQuestionType = Extract<QuestionType, "MCQ_SINGLE" | "MCQ_MULTI" | "FILL_ANSWER">;

export interface DemoQuestion {
  id: string;
  type: DemoQuestionType;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  stem: string;
  options: Array<{ id: string; content: string }>;
  /** Demo mode: đáp án để chấm local. Không bao giờ render ra UI trước khi nộp. */
  answer: string | string[];
  explanation: string;
  /** Hint bậc 1→2 (contract P2). */
  thinkingHints: [string, string];
}

export interface DemoLesson {
  id: string;
  slug: string;
  title: string;
  subjectName: string;
  subjectSlug: string;
  chapterTitle: string;
  estimatedMinutes: number;
  thinkingSection: string;
  content: string;
  questions: DemoQuestion[];
}

/** Demo lesson Toán — có công thức KaTeX để demo render. */
export const DEMO_LESSON: DemoLesson = {
  id: "demo-lesson-1",
  slug: "dao-ham-cua-ham-so",
  title: "Đạo hàm của hàm số — hiểu bản chất trước khi nhớ công thức",
  subjectName: "Toán",
  subjectSlug: "toan",
  chapterTitle: "Chương 1 · Hàm số và đạo hàm",
  estimatedMinutes: 12,
  thinkingSection:
    "Đạo hàm trả lời một câu hỏi rất đời thường: **nếu mình nhích đi một chút, thì cái mình đoan chỉ đổi thay bao nhiêu?** Tốc độ xe là đạo hàm của quãng đường theo thời gian. Nắm được ý «tốc độ thay đổi» này thì mọi công thức bên dưới đều trở thành hệ quả tự nhiên, không cần học vẹt.",
  content: `## Đạo hàm là gì?

Cho hàm số $y = f(x)$ xác định quanh điểm $x_0$. Khi $x$ nhích từ $x_0$ thêm một lượng rất nhỏ $\\Delta x$, độ cao của đồ thị thay đổi $\\Delta y = f(x_0 + \\Delta x) - f(x_0)$.

Tỉ số $\\dfrac{\\Delta y}{\\Delta x}$ là **tốc độ thay đổi trung bình**. Khi $\\Delta x$ tiến dần về $0$, ta được tốc độ thay đổi tức thời — chính là đạo hàm:

$$f'(x_0) = \\lim_{\\Delta x \\to 0} \\frac{f(x_0 + \\Delta x) - f(x_0)}{\\Delta x}$$

## Ý nghĩa hình học

Đạo hàm tại một điểm là **hệ số góc của tiếp tuyến** với đồ thị tại điểm đó:

- $f'(x_0) > 0$: đồ thị đang "leo dốc" tại $x_0$.
- $f'(x_0) < 0$: đồ thị đang "đi xuống".
- $f'(x_0) = 0$: điểm bằng — ứng viên cho cực trị.

## Bảng đạo hàm hay gặp

| Hàm số | Đạo hàm |
| --- | --- |
| $x^n$ | $n x^{n-1}$ |
| $\\sin x$ | $\\cos x$ |
| $e^x$ | $e^x$ |
| $\\ln x$ | $\\dfrac{1}{x}$ |

> 💡 **Mẹo nhớ:** hàm mũ $e^x$ là hàm "trung thành" nhất — đạo hàm bằng chính nó.

## Ví dụ giải từng bước

Tính đạo hàm của $f(x) = x^3 - 2x$ tại $x = 1$.

1. Đạo hàm tổng: $f'(x) = (x^3)' - (2x)' = 3x^2 - 2$.
2. Thay $x = 1$: $f'(1) = 3 \\cdot 1 - 2 = 1$.
3. Kết luận: tại $x=1$ đồ thị đang leo dốc nhẹ (hệ số góc $= 1$).`,
  questions: [
    {
      id: "demo-q1",
      type: "MCQ_SINGLE",
      difficulty: "EASY",
      stem: "Đạo hàm của hàm số $f(x) = x^3$ là đáp án nào?",
      options: [
        { id: "a", content: "$3x^2$" },
        { id: "b", content: "$x^2$" },
        { id: "c", content: "$3x$" },
        { id: "d", content: "$x^4/4$" },
      ],
      answer: "a",
      explanation:
        "Áp dụng công thức $(x^n)' = n x^{n-1}$ với $n = 3$ ta được $(x^3)' = 3x^2$. Đáp án D là nguyên hàm, không phải đạo hàm.",
      thinkingHints: [
        "Công thức tổng quát: lũy thừa hạ xuống một bậc rồi nhân hệ số với số mũ cũ.",
        "$(x^n)' = n x^{n-1}$ — thay $n = 3$ vào là ra.",
      ],
    },
    {
      id: "demo-q2",
      type: "MCQ_MULTI",
      difficulty: "MEDIUM",
      stem: "Những hàm số nào dưới đây có đạo hàm bằng chính nó (chọn tất cả đáp án đúng)?",
      options: [
        { id: "a", content: "$e^x$" },
        { id: "b", content: "$\\sin x$" },
        { id: "c", content: "$e^{2x} \\cdot e^{-x}$" },
        { id: "d", content: "$\\cos x$" },
      ],
      answer: ["a", "c"],
      explanation:
        "$e^x$ đạo hàm bằng chính nó. Với đáp án C: $e^{2x} \\cdot e^{-x} = e^{2x-x} = e^x$ nên cũng bằng chính nó. Còn $\\sin' = \\cos$ và $\\cos' = -\\sin$ — tuần hoàn, không giữ nguyên.",
      thinkingHints: [
        "Thu gọn biểu thức trước khi đạo hàm — đáp án C trông phức tạp nhưng là tích của hai lũy thừa cùng cơ số.",
        "$\\sin' x = \\cos x$, $\\cos' x = -\\sin x$; chỉ $e^x$ (và biến đổi ra $e^x$) giữ nguyên.",
      ],
    },
    {
      id: "demo-q3",
      type: "FILL_ANSWER",
      difficulty: "MEDIUM",
      stem:
        "Tính $f'(1)$ với $f(x) = x^3 - 2x$. Điền kết quả (chỉ điền số).",
      options: [],
      answer: "1",
      explanation:
        "$f'(x) = 3x^2 - 2$ nên $f'(1) = 3 - 2 = 1$. Tại $x=1$ đồ thị đang leo dốc với hệ số góc 1.",
      thinkingHints: [
        "Đạo hàm từng hạng tử rồi cộng lại: $(x^3)'$ và $(2x)'$.",
        "$(x^3)' = 3x^2$, $(2x)' = 2$ → thay $x=1$: $3 - 2 = ?$",
      ],
    },
  ],
};

/** Tra demo lesson theo slug (fallback cho /lessons/[slug]). */
export function findDemoLesson(slug: string): DemoLesson | null {
  return slug === DEMO_LESSON.slug ? DEMO_LESSON : null;
}
