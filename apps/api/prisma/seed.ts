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

  // ── TASK-005: exam bank + câu hỏi thi (source EXAM) cho E1–E6 ──────────
  const examBank = await db.examBank.upsert({
    where: { slug: "toan-co-ban" },
    update: { name: "Kiểm tra Toán cơ bản", durationSec: 1800 },
    create: { slug: "toan-co-ban", name: "Kiểm tra Toán cơ bản", durationSec: 1800 },
  });
  const examQuestionCount = await db.questionItem.count({
    where: { examBankId: examBank.id },
  });
  if (examQuestionCount === 0) {
    await db.questionItem.createMany({
      data: [
        {
          type: "MCQ_SINGLE",
          difficulty: "EASY",
          source: "EXAM",
          examBankId: examBank.id,
          stem: "Kết quả của $7 \\times 8$ là bao nhiêu?",
          options: [
            { id: "opt_a", content: "54" },
            { id: "opt_b", content: "56" },
            { id: "opt_c", content: "58" },
          ],
          answer: { correctOptionIds: ["opt_b"] },
          explanation: "7 × 8 = 56.",
          thinkingHints: ["Nhớ bảng cửu chương 7."],
          hintAnswerRef: "Nhanhnhan",
        },
        {
          type: "MCQ_SINGLE",
          difficulty: "MEDIUM",
          source: "EXAM",
          examBankId: examBank.id,
          stem: "Giá trị của $\\frac{3}{4} + \\frac{1}{4}$ là bao nhiêu?",
          options: [
            { id: "opt_a", content: "1" },
            { id: "opt_b", content: "4/8" },
            { id: "opt_c", content: "3/8" },
          ],
          answer: { correctOptionIds: ["opt_a"] },
          explanation: "3/4 + 1/4 = 4/4 = 1.",
          thinkingHints: ["Hai phân số cùng mẫu thì cộng tử số."],
          hintAnswerRef: "Phanso",
        },
        {
          type: "MCQ_MULTI",
          difficulty: "MEDIUM",
          source: "EXAM",
          examBankId: examBank.id,
          stem: "Chọn các số là số tự nhiên:",
          options: [
            { id: "opt_a", content: "0" },
            { id: "opt_b", content: "-3" },
            { id: "opt_c", content: "12" },
          ],
          answer: { correctOptionIds: ["opt_a", "opt_c"] },
          explanation: "Số tự nhiên là 0, 1, 2, ... nên -3 không thuộc.",
          thinkingHints: ["Số tự nhiên bắt đầu từ 0."],
          hintAnswerRef: "Sotunhien",
        },
        {
          type: "FILL_ANSWER",
          difficulty: "MEDIUM",
          source: "EXAM",
          examBankId: examBank.id,
          stem: "Nhập kết quả của $15 - 6$.",
          options: [],
          answer: { correctText: "9" },
          explanation: "15 - 6 = 9.",
          thinkingHints: ["Trừ từng hàng chục, đơn vị."],
          hintAnswerRef: "Pheptru",
        },
        {
          type: "MATCH_PAIRS",
          difficulty: "HARD",
          source: "EXAM",
          examBankId: examBank.id,
          stem: "Nối phép tính với kết quả đúng.",
          options: [
            { id: "opt_l1", content: "2 + 2" },
            { id: "opt_l2", content: "3 × 3" },
            { id: "opt_r1", content: "4" },
            { id: "opt_r2", content: "9" },
          ],
          // BE-2 (TASK-005): shape thống nhất {leftId, rightId} theo contract P1.
          answer: {
            pairs: [
              { leftId: "opt_l1", rightId: "opt_r1" },
              { leftId: "opt_l2", rightId: "opt_r2" },
            ],
          },
          explanation: "2 + 2 = 4 và 3 × 3 = 9.",
          thinkingHints: ["Tính từng phép tính rồi nối."],
          hintAnswerRef: "Pheptinh",
        },
        {
          type: "MCQ_SINGLE",
          difficulty: "HARD",
          source: "EXAM",
          examBankId: examBank.id,
          stem: "Một hình chữ nhật có chu vi 20 và chiều dài 7. Chiều rộng là bao nhiêu?",
          options: [
            { id: "opt_a", content: "3" },
            { id: "opt_b", content: "6" },
            { id: "opt_c", content: "13" },
          ],
          answer: { correctOptionIds: ["opt_a"] },
          explanation: "Chu vi = 2 × (dài + rộng) → rộng = 20/2 - 7 = 3.",
          thinkingHints: ["Dùng công thức chu vi hình chữ nhật."],
          hintAnswerRef: "Hinhchunhat",
        },
      ],
    });
  }

  // ── TASK-006: 3 lộ trình mẫu (R1/R2 🔓) + badges (G5) ──────────────────
  // F1 hotfix (review db3f181): milestone phải có nội dung thật (lessons /
  // examBankId tham chiếu dữ liệu đã seed) — không còn milestone rỗng nào.
  const lessonRef = (l: { id: string; title: string }) => ({ lessonId: l.id, title: l.title });
  const roadmapData = [
    {
      slug: "backend",
      title: "Backend Developer",
      description: "Node.js, API, database và deploy ứng dụng backend.",
      icon: "server",
      milestones: [
        { title: "Nền tảng JavaScript & Node.js", lessons: [lessonRef(l1), lessonRef(l2)], examBankId: null as string | null },
        { title: "REST API với Express", lessons: [lessonRef(le1)], examBankId: null },
        { title: "Database & ORM (Prisma)", lessons: [lessonRef(le2)], examBankId: null },
        { title: "Auth & Bảo mật", lessons: [lessonRef(l1)], examBankId: null },
        { title: "Deploy & DevOps cơ bản", lessons: [], examBankId: examBank.id },
      ],
    },
    {
      slug: "frontend",
      title: "Frontend Developer",
      description: "HTML/CSS, JavaScript, React và Next.js.",
      icon: "layout",
      milestones: [
        { title: "HTML & CSS cơ bản", lessons: [lessonRef(le1)], examBankId: null },
        { title: "JavaScript hiện đại", lessons: [lessonRef(le2)], examBankId: null },
        { title: "React components & hooks", lessons: [lessonRef(l1)], examBankId: null },
        { title: "Next.js & routing", lessons: [], examBankId: examBank.id },
      ],
    },
    {
      slug: "data-scientist",
      title: "Data Scientist",
      description: "Python, thống kê, machine learning và trực quan hoá dữ liệu.",
      icon: "chart",
      milestones: [
        { title: "Python cơ bản", lessons: [lessonRef(l2)], examBankId: null },
        { title: "NumPy & Pandas", lessons: [lessonRef(l1)], examBankId: null },
        { title: "Thống kê ứng dụng", lessons: [lessonRef(le1)], examBankId: null },
        { title: "Machine Learning nhập môn", lessons: [], examBankId: examBank.id },
      ],
    },
  ];

  for (const rm of roadmapData) {
    const roadmap = await db.roadmap.upsert({
      where: { slug: rm.slug },
      update: { title: rm.title, description: rm.description, icon: rm.icon },
      create: { slug: rm.slug, title: rm.title, description: rm.description, icon: rm.icon },
    });
    const existingMilestones = await db.milestone.findMany({
      where: { roadmapId: roadmap.id },
      orderBy: { order: "asc" },
    });
    // Tạo milestone thiếu (idempotent) rồi nối dependsOn theo chuỗi tuyến tính.
    // F1 hotfix: update cũng ghi lessons/examBankId để milestone cũ (đang rỗng)
    // được gán nội dung tham chiếu khi re-seed.
    const created: string[] = existingMilestones.map((m) => m.id);
    for (let i = created.length; i < rm.milestones.length; i++) {
      const m = rm.milestones[i]!;
      const row = await db.milestone.create({
        data: {
          roadmapId: roadmap.id,
          title: m.title,
          order: i + 1,
          lessons: m.lessons as unknown as object,
          examBankId: m.examBankId,
        },
        select: { id: true },
      });
      created.push(row.id);
    }
    for (let i = 0; i < created.length; i++) {
      const m = rm.milestones[i]!;
      const dependsOn = i === 0 ? [] : [created[i - 1]];
      await db.milestone.update({
        where: { id: created[i] },
        data: {
          dependsOn: dependsOn as unknown as object,
          lessons: m.lessons as unknown as object,
          examBankId: m.examBankId,
        },
      });
    }
  }

  // Badges (G5): schema có bảng Badge — seed để UserBadge lazy-award có FK hợp lệ.
  const badgeDefs = [
    { name: "Bước đầu tiên", icon: "🌱", description: "Hoàn thành bài học đầu tiên" },
    { name: "Học bền bỉ", icon: "🔥", description: "Streak 3 ngày liên tục" },
    { name: "Tuần vàng", icon: "🏅", description: "Streak 7 ngày liên tục" },
    { name: "Tri thức tập sự", icon: "⭐", description: "Đạt 200 XP" },
    { name: "Chiến binh phòng thi", icon: "📝", description: "Hoàn thành 5 bài thi" },
  ];
  for (const b of badgeDefs) {
    await db.badge.upsert({
      where: { name: b.name },
      update: { icon: b.icon, description: b.description },
      create: b,
    });
  }

  console.log(
    `Seed OK: subjects=2, chapters=2, lessons=4, practiceSets=${await db.practiceSet.count()}, questions=${await db.questionItem.count()}, examBanks=${await db.examBank.count()}, examQuestions=${await db.questionItem.count({ where: { source: "EXAM" } })}, roadmaps=${await db.roadmap.count()}, milestones=${await db.milestone.count()}, badges=${await db.badge.count()}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
