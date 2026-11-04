import { AppError } from "../utils/errors";
import { RoadmapRepository } from "../repositories/roadmap.repository";
import { ProgressRepository } from "../repositories/progress.repository";
import { ExamService } from "./exam.service";
import { computeMilestoneStatuses } from "../utils/roadmap-logic";
import type { StartExamInput } from "../validations";
import type { MilestoneRow } from "../repositories/roadmap.repository";

/**
 * Roadmap service — contract mục 7 (R1–R5), TASK-006.
 *
 * GIẢ ĐỊNH MVP (ghi rõ báo cáo):
 * - R4 DONE: milestone DONE khi (a) mọi lesson trong milestone đã hoàn thành
 *   (UserLessonProgress.completedAt) VÀ (b) nếu có examBankId thì user đã có ít
 *   nhất 1 session SUBMITTED cho bank đó. Milestone KHÔNG có lessons và không có
 *   examBank → coi như DONE ngay khi AVAILABLE (milestone "điểm hẹn").
 * - R5 placement: gợi lộ trình theo accuracy placement GẦN NHẤT đã nộp (percent):
 *   ≥80 → "data-scientist", ≥50 → "backend", <50 → "frontend". Chưa có kết quả
 *   placement nào → gợi ý lộ trình đầu tiên với confidence thấp. Thresholds là
 *   heuristic MVP, không có trong contract.
 */
const PLACEMENT_THRESHOLDS = [
  { minPercent: 80, slug: "data-scientist", confidence: 0.9 },
  { minPercent: 50, slug: "backend", confidence: 0.75 },
  { minPercent: 0, slug: "frontend", confidence: 0.6 },
];
const NO_RESULT_CONFIDENCE = 0.3;

export class RoadmapService {
  constructor(
    private readonly roadmaps: RoadmapRepository = new RoadmapRepository(),
    private readonly progress: ProgressRepository = new ProgressRepository(),
    private readonly exams: ExamService = new ExamService(),
  ) {}

  // ── R1: GET /roadmaps 🔓 ─────────────────────────────────────────────

  async listRoadmaps() {
    const items = await this.roadmaps.listRoadmaps();
    return { items };
  }

  // ── R2: GET /roadmaps/:slug 🔓 ───────────────────────────────────────

  async getRoadmapBySlug(slug: string) {
    const roadmap = await this.roadmaps.findRoadmapBySlug(slug);
    if (!roadmap) throw new AppError("NOT_FOUND", "Roadmap not found", 404);
    return {
      id: roadmap.id,
      slug: roadmap.slug,
      title: roadmap.title,
      description: roadmap.description,
      icon: roadmap.icon,
      milestones: roadmap.milestones.map((m) => ({
        id: m.id,
        title: m.title,
        order: m.order,
        dependsOn: m.dependsOn,
        lessons: m.lessons,
        ...(m.examBankId ? { examBankId: m.examBankId } : {}),
      })),
    };
  }

  // ── R3: POST /roadmaps/:id/enroll ────────────────────────────────────

  async enroll(userId: string, roadmapId: string) {
    const roadmap = await this.roadmaps.findRoadmapById(roadmapId);
    if (!roadmap) throw new AppError("NOT_FOUND", "Roadmap not found", 404);
    const enrollment = await this.roadmaps.upsertEnrollment(userId, roadmapId);
    return {
      enrollment: {
        id: enrollment.id,
        roadmapId: enrollment.roadmapId,
        startedAt: enrollment.startedAt.toISOString(),
      },
    };
  }

  // ── R4: GET /roadmaps/me/:enrollmentId ───────────────────────────────

  async getMyProgress(userId: string, enrollmentId: string) {
    const enrollment = await this.roadmaps.findEnrollmentById(enrollmentId);
    if (!enrollment || enrollment.userId !== userId) {
      throw new AppError("NOT_FOUND", "Enrollment not found", 404);
    }
    const milestones = enrollment.roadmap.milestones;

    // DONE set theo giả định MVP (xem header).
    const allLessonIds = milestones.flatMap((m) => m.lessons.map((l) => l.lessonId));
    const [completedIds, submittedBankIds] = await Promise.all([
      this.progress.listCompletedLessonIds(userId, allLessonIds),
      this.roadmaps.listSubmittedExamBankIds(
        userId,
        milestones.map((m) => m.examBankId).filter((id): id is string => id !== null),
      ),
    ]);
    const completedSet = new Set(completedIds);
    const bankSet = new Set(submittedBankIds);

    const doneIds = new Set(
      milestones
        .filter((m) => isMilestoneDone(m, completedSet, bankSet))
        .map((m) => m.id),
    );

    const statuses = computeMilestoneStatuses(
      milestones.map((m) => ({ id: m.id, dependsOn: m.dependsOn })),
      doneIds,
    );

    const milestoneOut = milestones.map((m) => ({
      id: m.id,
      title: m.title,
      order: m.order,
      status: statuses.get(m.id) ?? "LOCKED",
    }));
    const doneCount = milestoneOut.filter((m) => m.status === "DONE").length;
    const current =
      milestoneOut.find((m) => m.status === "AVAILABLE") ?? milestoneOut[milestoneOut.length - 1] ?? null;

    return {
      enrollment: {
        id: enrollment.id,
        roadmap: {
          id: enrollment.roadmap.id,
          slug: enrollment.roadmap.slug,
          title: enrollment.roadmap.title,
        },
        startedAt: enrollment.startedAt.toISOString(),
      },
      percentCompleted:
        milestones.length === 0 ? 0 : Math.round((doneCount / milestones.length) * 1000) / 10,
      currentStep: current ? current.id : null,
      milestones: milestoneOut,
    };
  }

  // ── R5: POST /progress/placement-test ────────────────────────────────

  async startPlacementTest(
    userId: string,
    input: { examBankId?: string; subjectSlug?: string },
  ) {
    // Alias POST /exams với kind: "PLACEMENT_TEST" (contract R5).
    const examInput: StartExamInput = {
      kind: "PLACEMENT_TEST",
      ...(input.examBankId ? { examBankId: input.examBankId } : {}),
      ...(input.subjectSlug ? { subjectSlug: input.subjectSlug } : {}),
    };
    const sessionEnvelope = await this.exams.startExam(userId, examInput);

    // Gợi lộ trình MVP theo accuracy placement gần nhất (giả định — xem header).
    const percent = await this.roadmaps.latestPlacementPercent(userId);
    let recommended: { id: string; slug: string; title: string } | null;
    let confidence: number;
    if (percent === null) {
      recommended = await this.roadmaps.findFirstRoadmap();
      confidence = NO_RESULT_CONFIDENCE;
    } else {
      const rule =
        PLACEMENT_THRESHOLDS.find((r) => percent >= r.minPercent) ??
        PLACEMENT_THRESHOLDS[PLACEMENT_THRESHOLDS.length - 1]!;
      recommended = await this.roadmaps.findRoadmapByIdOrFallback(rule.slug);
      confidence = rule.confidence;
    }

    return {
      ...sessionEnvelope,
      recommendedRoadmap: recommended
        ? { id: recommended.id, slug: recommended.slug, title: recommended.title }
        : null,
      confidence,
    };
  }
}

/** R4 helper: điều kiện DONE của 1 milestone (giả định — xem header class). */
function isMilestoneDone(
  milestone: MilestoneRow,
  completedLessons: ReadonlySet<string>,
  submittedBanks: ReadonlySet<string>,
): boolean {
  const lessonsDone =
    milestone.lessons.length === 0 || milestone.lessons.every((l) => completedLessons.has(l.lessonId));
  const examDone = !milestone.examBankId || submittedBanks.has(milestone.examBankId);
  // Milestone không có lessons và không có exam → DONE khi được duyệt qua (AVAILABLE).
  return lessonsDone && examDone;
}
