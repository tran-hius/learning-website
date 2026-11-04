import { AppError } from "../utils/errors";
import { ContentRepository } from "../repositories";
import type {
  SubjectRow,
  ChapterBriefRow,
  QuestionRow,
  PracticeSetRow,
} from "../repositories";
import { cacheDel } from "../utils/cache";
import type {
  CreateSubjectInput,
  UpdateSubjectInput,
  CreateChapterInput,
  UpdateChapterInput,
  CreateLessonInput,
  UpdateLessonInput,
  CreatePracticeSetInput,
  UpdatePracticeSetInput,
  CreateQuestionInput,
  UpdateQuestionInput,
} from "../validations";

/**
 * Admin content CRUD — contract mục 3.3 (C1–C11, trừ C12 upload để sau).
 * Guard requireRole(["TEACHER","ADMIN"]) nằm ở route layer.
 */

export class AdminService {
  constructor(private readonly content: ContentRepository = new ContentRepository()) {}

  /** C1: POST /admin/subjects — invalidate cache S1. */
  async createSubject(input: CreateSubjectInput): Promise<{ subject: SubjectRow }> {
    const existing = await this.content.findSubjectBySlug(input.slug);
    if (existing) {
      throw new AppError("VALIDATION_ERROR", "Subject slug already exists", 409);
    }
    const subject = await this.content.createSubject(input);
    await cacheDel("subjects:list:v1");
    return { subject };
  }

  /** C2: PATCH /admin/subjects/:id. */
  async updateSubject(id: string, input: UpdateSubjectInput): Promise<{ subject: SubjectRow }> {
    await this.assertSubjectExists(id);
    if (input.slug) {
      const dup = await this.content.findSubjectBySlug(input.slug);
      if (dup && dup.id !== id) {
        throw new AppError("VALIDATION_ERROR", "Subject slug already exists", 409);
      }
    }
    const subject = await this.content.updateSubject(id, input);
    await cacheDel("subjects:list:v1");
    return { subject };
  }

  /** C3: POST /admin/subjects/:id/chapters — invalidate cache S1 (điều kiện reviewer TASK-003). */
  async createChapter(subjectId: string, input: CreateChapterInput): Promise<{ chapter: ChapterBriefRow }> {
    await this.assertSubjectExists(subjectId);
    const chapter = await this.content.createChapter(subjectId, input);
    await cacheDel("subjects:list:v1");
    return { chapter };
  }

  /** C4: PATCH /admin/chapters/:id — sửa title/order. */
  async updateChapter(id: string, input: UpdateChapterInput): Promise<{ chapter: ChapterBriefRow }> {
    await this.assertChapterExists(id);
    const chapter = await this.content.updateChapter(id, input);
    return { chapter };
  }

  /** C5: POST /admin/chapters/:id/lessons. */
  async createLesson(chapterId: string, input: CreateLessonInput) {
    await this.assertChapterExists(chapterId);
    const lesson = await this.content.createLesson(chapterId, input);
    return { lesson };
  }

  /** C6: PATCH /admin/lessons/:id — sửa content/status (DRAFT→PUBLISHED). */
  async updateLesson(id: string, input: UpdateLessonInput) {
    await this.assertLessonExists(id);
    const lesson = await this.content.updateLesson(id, input);
    return { lesson };
  }

  /** C7: POST /admin/lessons/:id/practice-sets (kèm questions optional). */
  async createPracticeSet(lessonId: string, input: CreatePracticeSetInput) {
    await this.assertLessonExists(lessonId);
    const { questions, ...setData } = input;
    const set = await this.content.createPracticeSet(
      lessonId,
      setData as { mode: string; payload?: unknown; order?: number },
      (questions ?? []) as unknown as Record<string, unknown>[],
    );
    return { practiceSet: set };
  }

  /** C8: PATCH /admin/practice-sets/:id. */
  async updatePracticeSet(id: string, input: UpdatePracticeSetInput) {
    await this.assertPracticeSetExists(id);
    const set = await this.content.updatePracticeSet(
      id,
      input as { mode?: string; payload?: unknown; order?: number },
    );
    return { practiceSet: set };
  }

  /** C9: POST /admin/questions — trả `id` theo contract. */
  async createQuestion(input: CreateQuestionInput) {
    await this.assertQuestionTarget(input);
    const question = await this.content.createQuestion(input as unknown as Record<string, unknown>);
    return { id: question.id, question };
  }

  /** C10: PATCH /admin/questions/:id. */
  async updateQuestion(id: string, input: UpdateQuestionInput) {
    await this.assertQuestionExists(id);
    const question = await this.content.updateQuestion(id, input as unknown as Record<string, unknown>);
    return { question };
  }

  /**
   * C11: POST /admin/questions/bulk — import mảng câu hỏi.
   * Validate từng item: item hợp lệ → insert (createMany), item lỗi → ghi vào
   * `errors` kèm index, KHÔNG dừng cả mảng. Trả `{ created, errors }`.
   */
  async bulkCreateQuestions(
    input: { items: CreateQuestionInput[] },
  ): Promise<{ created: number; errors: Array<{ index: number; message: string }> }> {
    const valid: Record<string, unknown>[] = [];
    const errors: Array<{ index: number; message: string }> = [];

    for (let i = 0; i < input.items.length; i++) {
      const item = input.items[i];
      if (!item) continue;
      try {
        await this.assertQuestionTarget(item);
        valid.push(item as unknown as Record<string, unknown>);
      } catch (err) {
        errors.push({
          index: i,
          message: err instanceof Error ? err.message : "Invalid question",
        });
      }
    }

    let created = 0;
    if (valid.length > 0) {
      created = await this.content.createManyQuestions(valid);
    }
    return { created, errors };
  }

  // ── assert helpers ───────────────────────────────────────────────────

  private async assertSubjectExists(id: string): Promise<void> {
    const subject = await this.content.findSubjectById(id);
    if (!subject) throw new AppError("NOT_FOUND", "Subject not found", 404);
  }

  private async assertChapterExists(id: string): Promise<void> {
    const chapter = await this.content.findChapterById(id);
    if (!chapter) throw new AppError("NOT_FOUND", "Chapter not found", 404);
  }

  private async assertLessonExists(id: string): Promise<void> {
    const lesson = await this.content.findLessonById(id);
    if (!lesson) throw new AppError("NOT_FOUND", "Lesson not found", 404);
  }

  private async assertPracticeSetExists(id: string): Promise<PracticeSetRow> {
    const set = await this.content.findPracticeSetById(id);
    if (!set) throw new AppError("NOT_FOUND", "Practice set not found", 404);
    return set;
  }

  private async assertQuestionExists(id: string): Promise<void> {
    if (!(await this.content.questionExists(id))) {
      throw new AppError("NOT_FOUND", "Question not found", 404);
    }
  }

  private async assertQuestionTarget(input: { practiceSetId?: string; examBankId?: string }): Promise<void> {
    if (input.practiceSetId) {
      await this.assertPracticeSetExists(input.practiceSetId);
    }
    // Điều kiện final-reviewer TASK-003 (C9/C11): validate examBankId tồn tại
    // TRƯỚC insert (query 1 lần) — lỗi → 400, code NOT_FOUND style.
    if (input.examBankId) {
      const bank = await this.content.findExamBankById(input.examBankId);
      if (!bank) {
        throw new AppError("NOT_FOUND", "Exam bank not found", 400);
      }
    }
  }
}
