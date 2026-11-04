/**
 * Seed script (TASK-003): 2 môn mẫu (Toán, Tiếng Anh), mỗi môn 1 chương 2 bài
 * + practice sets với câu hỏi MCQ để frontend có dữ liệu test.
 *
 * Chạy: pnpm --filter @learning/api seed
 * Idempotent: upsert theo slug / find-first theo (subjectId, title).
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

type SeedQuestion = {
  type: "MCQ_SINGLE" | "MCQ_MULTI" | "FILL_ANSWER" | "MATCH_PAIRS" | "LISTEN_MCQ";
  stem: string;
  options: Array<{ id: string; content: string }>;
  answer: { correctOptionIds?: string[]; correctText?: string };
  explanation: string;
  thinkingHints: string[];
};

async function upsertSubject(slug: string, data: { name: string; icon: string; color: string; order: number; description: string }) {
  return db.subject.upsert({
    where: { slug },
    update: { name: data.name, icon: data.icon, color: data.color, order: data.order, description: data.description },
    create: { slug, ...data },
  });
}

async function findOrCreateChapter(subjectId: string, title: string, order: number) {
  const existing = await db.chapter.findFirst({ where: { subjectId, title } });
  if (existing) return existing;
  return db.chapter.create({ data: { subjectId, title, order } });
}

async function upsertLesson(
  chapterId: string,
  slug: string,
  data: { title: string; content: string; thinkingSection: string; estimatedMinutes: number; order: number },
) {
  return db.lesson.upsert({
    where: { chapterId_slug: { chapterId, slug } },
    update: { title: data.title, content: data.content, thinkingSection: data.thinkingSection },
    create: {
      chapterId,
      slug,
      title: data.title,
      content: data.content,
      thinkingSection: data.thinkingSection,
      estimatedMinutes: data.estimatedMinutes,
      order: data.order,
      status: "PUBLISHED" as const,
    },
  });
}

async function findOrCreatePracticeSet(
  lessonId: string,
  mode: "QUIZ" | "CODING" | "LISTENING",
  order: number,
  questions: SeedQuestion[],
) {
  const existing = await db.practiceSet.findFirst({
    where: { lessonId, order },
    include: { questions: { select: { id: true } } },
  });
  if (existing && existing.questions.length > 0) return existing;
  if (existing) {
    return db.practiceSet.update({
      where: { id: existing.id },
      data: {
        questions: {
          create: questions.map((q) => ({
            type: q.type,
            difficulty: "EASY" as const,
            source: "PRACTICE" as const,
            stem: q.stem,
            options: q.options,
            answer: q.answer,
            explanation: q.explanation,
            thinkingHints: q.thinkingHints,
          })),
        },
      },
      include: { questions: true },
    });
  }
  return db.practiceSet.create({
    data: {
      lessonId,
      mode,
      order,
      questions: {
        create: questions.map((q) => ({
          type: q.type,
          difficulty: "EASY" as const,
          source: "PRACTICE" as const,
          stem: q.stem,
          options: q.options,
          answer: q.answer,
          explanation: q.explanation,
          thinkingHints: q.thinkingHints,
        })),
      },
    },
    include: { questions: true },
  });
}

async function main() {
  // ── Môn 1: Toán ──────────────────────────────────────────────────────
  const toan = await upsertSubject("toan", {
    name: "Toán",
    icon: "math",
    color: "#4F46E5",
    order: 1,
    description: "Toán học cơ bản: số học, đại số và hình học.",
  });
  const chToan = await findOrCreateChapter(toan.id, "Số học cơ bản", 1);
  const l1 = await upsertLesson(chToan.id, "so-tu-nhien", {
    title: "Số tự nhiên",
    content:
      "# Số tự nhiên\n\nSố tự nhiên là các số **0, 1, 2, 3, ...** dùng để đếm.\n\n## Ví dụ\n\n- $2 + 3 = 5$\n- $7 - 4 = 3$",
    thinkingSection: "## Cách tư duy\n\n1. Đếm từng đối tượng một.\n2. Gộp nhóm rồi cộng dần.",
    estimatedMinutes: 15,
    order: 1,
  });
  const l2 = await upsertLesson(chToan.id, "phan-so", {
    title: "Phân số",
    content:
      "# Phân số\n\nPhân số $\\frac{a}{b}$ gồm **tử số** $a$ và **mẫu số** $b \\neq 0$.\n\n## Quy tắc\n\n- Cộng hai phân số cùng mẫu: cộng tử, giữ mẫu.",
    thinkingSection: "## Cách tư duy\n\n1. Quy đồng mẫu số trước khi cộng.\n2. Rút gọn kết quả cuối cùng.",
    estimatedMinutes: 20,
    order: 2,
  });
  await findOrCreatePracticeSet(l1.id, "QUIZ", 1, [
    {
      type: "MCQ_SINGLE",
      stem: "Kết quả của $2 + 3$ là bao nhiêu?",
      options: [
        { id: "opt_a", content: "4" },
        { id: "opt_b", content: "5" },
        { id: "opt_c", content: "6" },
      ],
      answer: { correctOptionIds: ["opt_b"] },
      explanation: "2 + 3 = 5.",
      thinkingHints: ["Đếm thêm 3 đơn vị sau số 2."],
    },
    {
      type: "MCQ_SINGLE",
      stem: "Số nào là số tự nhiên?",
      options: [
        { id: "opt_a", content: "-1" },
        { id: "opt_b", content: "0" },
        { id: "opt_c", content: "1/2" },
      ],
      answer: { correctOptionIds: ["opt_b"] },
      explanation: "0 là số tự nhiên nhỏ nhất.",
      thinkingHints: ["Số tự nhiên bắt đầu từ 0."],
    },
  ]);
  await findOrCreatePracticeSet(l2.id, "QUIZ", 1, [
    {
      type: "MCQ_SINGLE",
      stem: "Mẫu số của phân số có được bằng 0 không?",
      options: [
        { id: "opt_a", content: "Được" },
        { id: "opt_b", content: "Không được" },
      ],
      answer: { correctOptionIds: ["opt_b"] },
      explanation: "Chia cho 0 là không xác định nên mẫu số phải khác 0.",
      thinkingHints: ["Nhớ lại định nghĩa phép chia."],
    },
  ]);

  // ── Môn 2: Tiếng Anh ─────────────────────────────────────────────────
  const anh = await upsertSubject("tieng-anh", {
    name: "Tiếng Anh",
    icon: "english",
    color: "#0EA5E9",
    order: 2,
    description: "Tiếng Anh giao tiếp và ngữ pháp cơ bản.",
  });
  const chAnh = await findOrCreateChapter(anh.id, "Grammar Basics", 1);
  const le1 = await upsertLesson(chAnh.id, "verb-to-be", {
    title: "Verb to be",
    content:
      '# Verb to be\n\nĐộng từ **to be** (am/is/are) diễn tả trạng thái hay bản chất.\n\n## Ví dụ\n\n- I **am** a student.\n- She **is** a teacher.\n- They **are** friends.',
    thinkingSection: "## How to think\n\n1. Xác định chủ ngữ số ít hay số nhiều.\n2. Chọn am/is/are tương ứng.",
    estimatedMinutes: 15,
    order: 1,
  });
  const le2 = await upsertLesson(chAnh.id, "articles", {
    title: "Articles: a / an / the",
    content:
      "# Articles\n\n- **a/an**: danh từ đếm được số ít, chưa xác định.\n- **the**: danh từ đã xác định.\n\n## Ví dụ\n\n- I have **a** cat. The cat is white.",
    thinkingSection: "## How to think\n\n1. Danh từ đã được nhắc trước đó chưa?\n2. Chưa nhắc → a/an, đã nhắc → the.",
    estimatedMinutes: 15,
    order: 2,
  });
  await findOrCreatePracticeSet(le1.id, "QUIZ", 1, [
    {
      type: "MCQ_SINGLE",
      stem: "She ___ a doctor.",
      options: [
        { id: "opt_a", content: "am" },
        { id: "opt_b", content: "is" },
        { id: "opt_c", content: "are" },
      ],
      answer: { correctOptionIds: ["opt_b"] },
      explanation: "Chủ ngữ ngôi thứ ba số ít (she) dùng 'is'.",
      thinkingHints: ["She đi với am, is hay are?"],
    },
    {
      type: "MCQ_MULTI",
      stem: "Chọn các câu ĐÚNG:",
      options: [
        { id: "opt_a", content: "I am a student." },
        { id: "opt_b", content: "They is friends." },
        { id: "opt_c", content: "We are happy." },
      ],
      answer: { correctOptionIds: ["opt_a", "opt_c"] },
      explanation: "'They is' sai chủ vị; 'they/we' đi với 'are'.",
      thinkingHints: ["Kiểm tra chủ ngữ số nhiều đi với động từ nào."],
    },
  ]);
  await findOrCreatePracticeSet(le2.id, "QUIZ", 1, [
    {
      type: "MCQ_SINGLE",
      stem: "I have ___ orange.",
      options: [
        { id: "opt_a", content: "a" },
        { id: "opt_b", content: "an" },
        { id: "opt_c", content: "the" },
      ],
      answer: { correctOptionIds: ["opt_b"] },
      explanation: "'Orange' bắt đầu bằng nguyên âm /ɒ/ nên dùng 'an'.",
      thinkingHints: ["Nghe âm đầu của từ 'orange'."],
    },
  ]);

  // ── TASK-004: 1 practice set Python (CODING) + 1 set listening (LISTENING) ──
  await findOrCreatePracticeSet(l2.id, "CODING", 2, [
    {
      type: "FILL_ANSWER",
      stem: "Đoạn code `print(2 + 3)` in ra màn hình giá trị nào?",
      options: [],
      answer: { correctText: "5" },
      explanation: "Hàm print() in kết quả của biểu thức 2 + 3 = 5.",
      thinkingHints: ["Tính giá trị biểu thức bên trong print()."],
    },
  ]);
  // Payload CODING: frontend dùng làm starter code cho /python/exec (P3).
  const codingSet = await db.practiceSet.findFirst({ where: { lessonId: l2.id, mode: "CODING" } });
  if (codingSet && !codingSet.payload) {
    await db.practiceSet.update({
      where: { id: codingSet.id },
      data: {
        payload: {
          language: "python",
          version: "3.10.0",
          starterCode: "# Viết code Python của bạn ở đây\nprint(2 + 3)",
        },
      },
    });
  }

  await findOrCreatePracticeSet(le2.id, "LISTENING", 2, [
    {
      type: "LISTEN_MCQ",
      stem: "Listen to the audio. What does the speaker say?",
      options: [
        { id: "opt_a", content: "I like reading books." },
        { id: "opt_b", content: "I like reading footballs." },
        { id: "opt_c", content: "I like riding bikes." },
      ],
      answer: { correctOptionIds: ["opt_a"] },
      explanation: "The speaker says: 'I like reading books.'",
      thinkingHints: ["Focus on the object after 'reading'."],
    },
  ]);
  const listeningSet = await db.practiceSet.findFirst({
    where: { lessonId: le2.id, mode: "LISTENING" },
  });
  if (listeningSet && !listeningSet.payload) {
    await db.practiceSet.update({
      where: { id: listeningSet.id },
      data: {
        payload: {
          title: "Free-time activities",
          audioUrl: "https://res.cloudinary.com/demo/video/upload/v1/sample-listening-free-time.mp3",
          transcript: "Hi everyone! In my free time, I like reading books and listening to music.",
          lockedUntilSubmit: true,
        },
      },
    });
  }

  console.log(
    `Seed OK: subjects=2, chapters=2, lessons=4, practiceSets=${await db.practiceSet.count()}, questions=${await db.questionItem.count()}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
