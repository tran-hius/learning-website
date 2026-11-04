import { Prisma } from "@prisma/client";
import { db } from "../utils/db";

/**
 * Roadmap repository — Roadmap / Milestone / RoadmapEnrollment (contract mục 7, TASK-006).
 * Service không đụng Prisma trực tiếp (giữ style TASK-002/004/005).
 */

export type MilestoneRow = {
  id: string;
  title: string;
  order: number;
  dependsOn: string[];
  lessons: Array<{ lessonId: string; title: string }>;
  examBankId: string | null;
};

export type RoadmapListItem = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  icon: string | null;
  milestoneCount: number;
};

export type EnrollmentRow = {
  id: string;
  userId: string;
  roadmapId: string;
  startedAt: Date;
  currentStep: string | null;
};

export interface IRoadmapRepository {
  listRoadmaps(): Promise<RoadmapListItem[]>;
  findRoadmapBySlug(slug: string): Promise<{ id: string; slug: string; title: string; description: string | null; icon: string | null; milestones: MilestoneRow[] } | null>;
  findRoadmapById(id: string): Promise<{ id: string; slug: string; title: string } | null>;
  findFirstRoadmap(): Promise<{ id: string; slug: string; title: string } | null>;
  /** R5: tìm roadmap theo slug, không có → fallback roadmap đầu tiên. */
  findRoadmapByIdOrFallback(slug: string): Promise<{ id: string; slug: string; title: string } | null>;
  upsertEnrollment(userId: string, roadmapId: string): Promise<EnrollmentRow>;
  findEnrollmentById(id: string): Promise<(EnrollmentRow & { roadmap: { id: string; slug: string; title: string; milestones: MilestoneRow[] } }) | null>;
  /** examBankId user đã SUBMITTED (đủ để xét milestone có exam — R4). */
  listSubmittedExamBankIds(userId: string, examBankIds: string[]): Promise<string[]>;
  /** R5: percent của lần PLACEMENT_TEST nộp gần nhất (null nếu chưa có). */
  latestPlacementPercent(userId: string): Promise<number | null>;
}

function toMilestoneRows(rows: Array<{
  id: string;
  title: string;
  order: number;
  dependsOn: unknown;
  lessons: unknown;
  examBankId: string | null;
}>): MilestoneRow[] {
  return rows.map((m) => ({
    id: m.id,
    title: m.title,
    order: m.order,
    dependsOn: Array.isArray(m.dependsOn) ? (m.dependsOn as string[]) : [],
    lessons: Array.isArray(m.lessons) ? (m.lessons as Array<{ lessonId: string; title: string }>) : [],
    examBankId: m.examBankId,
  }));
}

const milestoneSelect = {
  id: true,
  title: true,
  order: true,
  dependsOn: true,
  lessons: true,
  examBankId: true,
} satisfies Prisma.MilestoneSelect;

export class RoadmapRepository implements IRoadmapRepository {
  async listRoadmaps(): Promise<RoadmapListItem[]> {
    const rows = await db.roadmap.findMany({
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        icon: true,
        _count: { select: { milestones: true } },
      },
      orderBy: { title: "asc" },
    });
    return rows.map((r) => ({ ...r, milestoneCount: r._count.milestones }));
  }

  async findRoadmapBySlug(slug: string) {
    const row = await db.roadmap.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        icon: true,
        milestones: { select: milestoneSelect, orderBy: { order: "asc" } },
      },
    });
    if (!row) return null;
    return { ...row, milestones: toMilestoneRows(row.milestones) };
  }

  async findRoadmapById(id: string) {
    return db.roadmap.findUnique({ where: { id }, select: { id: true, slug: true, title: true } });
  }

  async findFirstRoadmap() {
    return db.roadmap.findFirst({ select: { id: true, slug: true, title: true }, orderBy: { title: "asc" } });
  }

  async findRoadmapByIdOrFallback(slug: string) {
    const bySlug = await db.roadmap.findUnique({
      where: { slug },
      select: { id: true, slug: true, title: true },
    });
    if (bySlug) return bySlug;
    return this.findFirstRoadmap();
  }

  async upsertEnrollment(userId: string, roadmapId: string): Promise<EnrollmentRow> {
    // @@unique(userId, roadmapId): enroll 2 lần → trả enrollment cũ (idempotent).
    return db.roadmapEnrollment.upsert({
      where: { userId_roadmapId: { userId, roadmapId } },
      update: {},
      create: { userId, roadmapId },
      select: { id: true, userId: true, roadmapId: true, startedAt: true, currentStep: true },
    });
  }

  async findEnrollmentById(id: string) {
    const row = await db.roadmapEnrollment.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        roadmapId: true,
        startedAt: true,
        currentStep: true,
        roadmap: {
          select: {
            id: true,
            slug: true,
            title: true,
            milestones: { select: milestoneSelect, orderBy: { order: "asc" } },
          },
        },
      },
    });
    if (!row) return null;
    const { roadmap, ...enrollment } = row;
    return {
      ...enrollment,
      roadmap: { ...roadmap, milestones: toMilestoneRows(roadmap.milestones) },
    };
  }

  async listSubmittedExamBankIds(userId: string, examBankIds: string[]) {
    if (examBankIds.length === 0) return [];
    const rows = await db.examSession.findMany({
      where: { userId, status: "SUBMITTED", examBankId: { in: examBankIds }, result: { isNot: null } },
      select: { examBankId: true },
      distinct: ["examBankId"],
    });
    return rows.map((r) => r.examBankId).filter((id): id is string => id !== null);
  }

  async latestPlacementPercent(userId: string) {
    const row = await db.examSession.findFirst({
      where: { userId, kind: "PLACEMENT_TEST", status: "SUBMITTED", result: { isNot: null } },
      select: { result: { select: { percent: true } } },
      orderBy: { submittedAt: "desc" },
    });
    return row?.result?.percent ?? null;
  }
}
