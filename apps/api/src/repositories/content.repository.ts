import { Prisma } from "@prisma/client";
import { db } from "../utils/db";

/**
 * Content repository — subjects / chapters / lessons / practice-sets / questions.
 * Tách theo tầng: service không đụng Prisma trực tiếp (giữ style TASK-002).
 */

export type SubjectRow = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  color: string | null;
  order: number;
  description: string | null;
};

export type SubjectWithCountRow = SubjectRow & { _count: { chapters: number } };

export type ChapterBriefRow = { id: string; title: string; order: number };

export type LessonBriefRow = {
  id: string;
  slug: string;
  title: string;
  estimatedMinutes: number;
  order: number;
};

export type QuestionRow = {
  id: string;
  type: "MCQ_SINGLE" | "MCQ_MULTI" | "FILL_ANSWER" | "MATCH_PAIRS" | "LISTEN_MCQ";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  stem: string;
  media: unknown;
  options: unknown;
  answer: unknown;
  explanation: string | null;
  thinkingHints: unknown;
  hintAnswerRef: string | null;
};

export type PracticeSetRow = {
  id: string;
  lessonId: string;
  mode: "LISTENING" | "SPEAKING" | "READING" | "WRITING" | "CODING" | "QUIZ";
  payload: unknown;
  order: number;
  questions: QuestionRow[];
};

export type LessonFullRow = {
  id: string;
  chapterId: string;
  slug: string;
  title: string;
  content: string | null;
  media: unknown;
  estimatedMinutes: number;
  thinkingSection: string | null;
  order: number;
  status: "DRAFT" | "PUBLISHED";
  chapter: {
    id: string;
    title: string;
    order: number;
    subject: { id: string; slug: string; name: string };
  };
  practiceSets: PracticeSetRow[];
};

export interface IContentRepository {
  findSubjectById(id: string): Promise<SubjectRow | null>;
  listSubjectsWithChapterCount(): Promise<SubjectWithCountRow[]>;
  findSubjectBySlug(slug: string): Promise<(SubjectRow & { chapters: ChapterBriefRow[] }) | null>;
  createSubject(data: Partial<SubjectRow>): Promise<SubjectRow>;
  updateSubject(id: string, data: Partial<SubjectRow>): Promise<SubjectRow>;
  findChapterById(id: string): Promise<{ id: string; subjectId: string; title: string; order: number; subject: { slug: string; name: string } } | null>;
  createChapter(subjectId: string, data: { title: string; order?: number }): Promise<ChapterBriefRow>;
  updateChapter(id: string, data: { title?: string; order?: number }): Promise<ChapterBriefRow>;
  listPublishedLessonsByChapter(chapterId: string): Promise<LessonBriefRow[]>;
  findLessonById(id: string): Promise<LessonFullRow | null>;
  findLessonBySlug(slug: string): Promise<LessonFullRow | null>;
  createLesson(chapterId: string, data: Record<string, unknown>): Promise<{ id: string; slug: string; title: string; order: number; status: string }>;
  updateLesson(id: string, data: Record<string, unknown>): Promise<{ id: string; slug: string; title: string; order: number; status: string }>;
  createPracticeSet(lessonId: string, data: { mode: string; payload?: unknown; order?: number }, questions?: Record<string, unknown>[]): Promise<PracticeSetRow>;
  updatePracticeSet(id: string, data: { mode?: string; payload?: unknown; order?: number }): Promise<PracticeSetRow>;
  createQuestion(data: Record<string, unknown>): Promise<QuestionRow>;
  updateQuestion(id: string, data: Record<string, unknown>): Promise<QuestionRow>;
  createManyQuestions(rows: Record<string, unknown>[]): Promise<number>;
  findFirstPublishedLessonAfter(chapterId: string, order: number): Promise<LessonBriefRow | null>;
  findFirstIncompleteLessonInChapter(chapterId: string, lessonIds: string[]): Promise<LessonBriefRow | null>;
  findFirstPublishedLesson(): Promise<
    (LessonBriefRow & { chapter: { title: string; subject: { slug: string; name: string } } }) | null
  >;
  findPracticeSetById(id: string): Promise<PracticeSetRow | null>;
  findQuestionById(id: string): Promise<QuestionRow | null>;
  findExamBankById(id: string): Promise<{ id: string; name: string } | null>;
  questionExists(id: string): Promise<boolean>;
}

const subjectSelect = {
  id: true,
  slug: true,
  name: true,
  icon: true,
  color: true,
  order: true,
  description: true,
} satisfies Prisma.SubjectSelect;

const questionSelect = {
  id: true,
  type: true,
  difficulty: true,
  stem: true,
  media: true,
  options: true,
  answer: true,
  explanation: true,
  thinkingHints: true,
  hintAnswerRef: true,
} satisfies Prisma.QuestionItemSelect;

const lessonBriefSelect = {
  id: true,
  slug: true,
  title: true,
  estimatedMinutes: true,
  order: true,
} satisfies Prisma.LessonSelect;

/** Select đầy đủ cho S4 / D10 by-slug (nội dung + practiceSets + questions). */
const lessonFullSelect = {
  id: true,
  chapterId: true,
  slug: true,
  title: true,
  content: true,
  media: true,
  estimatedMinutes: true,
  thinkingSection: true,
  order: true,
  status: true,
  chapter: {
    select: {
      id: true,
      title: true,
      order: true,
      subject: { select: { id: true, slug: true, name: true } },
    },
  },
  practiceSets: {
    select: {
      id: true,
      lessonId: true,
      mode: true,
      payload: true,
      order: true,
      questions: { select: questionSelect, orderBy: { id: "asc" } },
    },
    orderBy: { order: "asc" },
  },
} satisfies Prisma.LessonSelect;

export class ContentRepository implements IContentRepository {
  // ── Subject ──────────────────────────────────────────────────────────

  async findSubjectById(id: string): Promise<SubjectRow | null> {
    return db.subject.findUnique({ where: { id }, select: subjectSelect });
  }

  async listSubjectsWithChapterCount(): Promise<SubjectWithCountRow[]> {
    return db.subject.findMany({
      select: { ...subjectSelect, _count: { select: { chapters: true } } },
      orderBy: { order: "asc" },
    });
  }

  async findSubjectBySlug(slug: string) {
    return db.subject.findUnique({
      where: { slug },
      select: {
        ...subjectSelect,
        chapters: { select: { id: true, title: true, order: true }, orderBy: { order: "asc" } },
      },
    });
  }

  async createSubject(data: Partial<SubjectRow>): Promise<SubjectRow> {
    return db.subject.create({ data: data as Prisma.SubjectCreateInput, select: subjectSelect });
  }

  async updateSubject(id: string, data: Partial<SubjectRow>): Promise<SubjectRow> {
    return db.subject.update({ where: { id }, data: data as Prisma.SubjectUpdateInput, select: subjectSelect });
  }

  // ── Chapter ──────────────────────────────────────────────────────────

  async findChapterById(id: string) {
    return db.chapter.findUnique({
      where: { id },
      select: {
        id: true,
        subjectId: true,
        title: true,
        order: true,
        subject: { select: { slug: true, name: true } },
      },
    });
  }

  async createChapter(subjectId: string, data: { title: string; order?: number }): Promise<ChapterBriefRow> {
    return db.chapter.create({
      data: { subjectId, title: data.title, ...(data.order !== undefined ? { order: data.order } : {}) },
      select: { id: true, title: true, order: true },
    });
  }

  async updateChapter(id: string, data: { title?: string; order?: number }): Promise<ChapterBriefRow> {
    return db.chapter.update({
      where: { id },
      data,
      select: { id: true, title: true, order: true },
    });
  }

  // ── Lesson ───────────────────────────────────────────────────────────

  async listPublishedLessonsByChapter(chapterId: string): Promise<LessonBriefRow[]> {
    return db.lesson.findMany({
      where: { chapterId, status: "PUBLISHED" },
      select: lessonBriefSelect,
      orderBy: { order: "asc" },
    });
  }

  async findLessonById(id: string): Promise<LessonFullRow | null> {
    return db.lesson.findUnique({
      where: { id },
      select: lessonFullSelect,
    });
  }

  async findLessonBySlug(slug: string): Promise<LessonFullRow | null> {
    // slug chỉ unique theo (chapterId, slug) — by-slug toàn cục dùng findFirst (D10).
    return db.lesson.findFirst({
      where: { slug, status: "PUBLISHED" },
      select: lessonFullSelect,
      orderBy: { order: "asc" },
    });
  }

  async createLesson(chapterId: string, data: Record<string, unknown>) {
    return db.lesson.create({
      data: { ...(data as Prisma.LessonUncheckedCreateInput), chapterId },
      select: { id: true, slug: true, title: true, order: true, status: true },
    });
  }

  async updateLesson(id: string, data: Record<string, unknown>) {
    return db.lesson.update({
      where: { id },
      data: data as Prisma.LessonUncheckedUpdateInput,
      select: { id: true, slug: true, title: true, order: true, status: true },
    });
  }

  // ── PracticeSet / Question ───────────────────────────────────────────

  async createPracticeSet(
    lessonId: string,
    data: { mode: string; payload?: unknown; order?: number },
    questions: Record<string, unknown>[] = [],
  ): Promise<PracticeSetRow> {
    return db.practiceSet.create({
      data: {
        lessonId,
        mode: data.mode as never,
        ...(data.payload !== undefined ? { payload: data.payload as Prisma.InputJsonValue } : {}),
        ...(data.order !== undefined ? { order: data.order } : {}),
        questions: {
          create: questions.map((q) => this.toQuestionCreate(q)),
        },
      },
      select: {
        id: true,
        lessonId: true,
        mode: true,
        payload: true,
        order: true,
        questions: { select: questionSelect, orderBy: { id: "asc" } },
      },
    });
  }

  async updatePracticeSet(id: string, data: { mode?: string; payload?: unknown; order?: number }): Promise<PracticeSetRow> {
    const update: Prisma.PracticeSetUpdateInput = {};
    if (data.mode !== undefined) update.mode = data.mode as never;
    if (data.payload !== undefined) update.payload = data.payload as Prisma.InputJsonValue;
    if (data.order !== undefined) update.order = data.order;
    return db.practiceSet.update({
      where: { id },
      data: update,
      select: {
        id: true,
        lessonId: true,
        mode: true,
        payload: true,
        order: true,
        questions: { select: questionSelect, orderBy: { id: "asc" } },
      },
    });
  }

  /** Map validated question input → Prisma create data (Json fields cần cast). */
  private toQuestionCreate(q: Record<string, unknown>): Prisma.QuestionItemCreateInput {
    return {
      type: q.type as never,
      ...(q.difficulty !== undefined ? { difficulty: q.difficulty as never } : {}),
      stem: q.stem as string,
      ...(q.media !== undefined ? { media: q.media as Prisma.InputJsonValue } : {}),
      ...(q.options !== undefined ? { options: q.options as Prisma.InputJsonValue } : {}),
      answer: q.answer as Prisma.InputJsonValue,
      ...(q.explanation !== undefined ? { explanation: q.explanation as string } : {}),
      ...(q.thinkingHints !== undefined
        ? { thinkingHints: q.thinkingHints as Prisma.InputJsonValue }
        : {}),
      ...(q.hintAnswerRef !== undefined ? { hintAnswerRef: q.hintAnswerRef as string } : {}),
      ...(q.practiceSetId ? { practiceSet: { connect: { id: q.practiceSetId as string } } } : {}),
      ...(q.examBankId ? { examBank: { connect: { id: q.examBankId as string } } } : {}),
    };
  }

  async createQuestion(data: Record<string, unknown>): Promise<QuestionRow> {
    return db.questionItem.create({ data: this.toQuestionCreate(data), select: questionSelect });
  }

  async updateQuestion(id: string, data: Record<string, unknown>): Promise<QuestionRow> {
    const { practiceSetId: _p, examBankId: _e, ...rest } = data;
    void _p;
    void _e;
    const update: Prisma.QuestionItemUpdateInput = {};
    if (rest.type !== undefined) update.type = rest.type as never;
    if (rest.difficulty !== undefined) update.difficulty = rest.difficulty as never;
    if (rest.stem !== undefined) update.stem = rest.stem as string;
    if (rest.media !== undefined) update.media = rest.media as Prisma.InputJsonValue;
    if (rest.options !== undefined) update.options = rest.options as Prisma.InputJsonValue;
    if (rest.answer !== undefined) update.answer = rest.answer as Prisma.InputJsonValue;
    if (rest.explanation !== undefined) update.explanation = rest.explanation as string;
    if (rest.thinkingHints !== undefined)
      update.thinkingHints = rest.thinkingHints as Prisma.InputJsonValue;
    if (rest.hintAnswerRef !== undefined) update.hintAnswerRef = rest.hintAnswerRef as string;
    return db.questionItem.update({ where: { id }, data: update, select: questionSelect });
  }

  async createManyQuestions(rows: Record<string, unknown>[]): Promise<number> {
    const res = await db.questionItem.createMany({
      data: rows.map((q) => this.toQuestionCreate(q)),
    });
    return res.count;
  }

  async findPracticeSetById(id: string): Promise<PracticeSetRow | null> {
    return db.practiceSet.findUnique({
      where: { id },
      select: {
        id: true,
        lessonId: true,
        mode: true,
        payload: true,
        order: true,
        questions: { select: questionSelect, orderBy: { id: "asc" } },
      },
    });
  }

  async findQuestionById(id: string): Promise<QuestionRow | null> {
    return db.questionItem.findUnique({ where: { id }, select: questionSelect });
  }

  async findExamBankById(id: string): Promise<{ id: string; name: string } | null> {
    return db.examBank.findUnique({ where: { id }, select: { id: true, name: true } });
  }

  async questionExists(id: string): Promise<boolean> {
    const row = await db.questionItem.findUnique({ where: { id }, select: { id: true } });
    return row !== null;
  }

  // ── Up-next helpers (L2) ─────────────────────────────────────────────

  async findFirstPublishedLessonAfter(chapterId: string, order: number): Promise<LessonBriefRow | null> {
    return db.lesson.findFirst({
      where: { chapterId, status: "PUBLISHED", order: { gt: order } },
      select: lessonBriefSelect,
      orderBy: { order: "asc" },
    });
  }

  async findFirstIncompleteLessonInChapter(
    chapterId: string,
    excludeLessonIds: string[],
  ): Promise<LessonBriefRow | null> {
    return db.lesson.findFirst({
      where: {
        chapterId,
        status: "PUBLISHED",
        id: { notIn: excludeLessonIds },
      },
      select: lessonBriefSelect,
      orderBy: { order: "asc" },
    });
  }

  async findFirstPublishedLesson() {
    return db.lesson.findFirst({
      where: { status: "PUBLISHED" },
      select: {
        ...lessonBriefSelect,
        chapter: {
          select: { title: true, subject: { select: { slug: true, name: true } } },
        },
      },
      orderBy: [
        { chapter: { subject: { order: "asc" } } },
        { chapter: { order: "asc" } },
        { order: "asc" },
      ],
    });
  }
}
