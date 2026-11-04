/**
 * Entity & payload types — chuyển nguyên trạng từ apps/web/src/lib/api/types.ts
 * (quyết định D6: contract types đặt tại packages/shared, web + api cùng import).
 * Khớp docs/api-contract.md v1.0 — mọi thay đổi contract phải cập nhật tại đây.
 */

import type { Paginated } from "./api";

// ── Auth & User (mục 2) ───────────────────────────────────────────────

export type Role = "STUDENT" | "TEACHER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
}

export interface UserStatus {
  currentStreak: number;
  longestStreak: number;
}

export interface MeResponse {
  user: User;
  stats: UserStatus;
}

export interface AuthResponse {
  user: User;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UpdateProfileInput {
  name?: string;
  avatarUrl?: string;
  preferences?: Record<string, unknown>;
}

// ── Nội dung học tập (mục 3) ──────────────────────────────────────────

export interface SubjectListItem {
  id: string;
  slug: string;
  name: string;
  /** Emoji/icon key hiển thị, vd "🧡" hoặc "math" */
  icon: string;
  /** Mã màu theo môn, vd "#FFB74D" */
  color: string;
  chapterCount: number;
  description?: string;
  order?: number;
}

export interface ChapterBrief {
  id: string;
  subjectId: string;
  title: string;
  order: number;
}

export interface SubjectDetail {
  id: string;
  slug: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
  chapters: ChapterBrief[];
}

export interface LessonBrief {
  id: string;
  slug: string;
  title: string;
  estimatedMinutes: number;
  completed: boolean;
}

export interface ChapterWithLessons {
  id: string;
  title: string;
  order: number;
  lessons: Paginated<LessonBrief>;
}

export type PracticeMode =
  | "LISTENING"
  | "SPEAKING"
  | "READING"
  | "WRITING"
  | "CODING"
  | "QUIZ";

export type QuestionType =
  | "MCQ_SINGLE"
  | "MCQ_MULTI"
  | "FILL_ANSWER"
  | "MATCH_PAIRS"
  | "LISTEN_MCQ";

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export interface QuestionOption {
  id: string;
  content: string;
  extra?: unknown;
}

export interface QuestionMedia {
  imageUrls: string[];
  audioUrl?: string;
  audioScripts?: string[];
}

/** Câu hỏi phía client khi làm bài — KHÔNG có answer/explanation (quy tắc 3.2). */
export interface QuestionPublic {
  id: string;
  type: QuestionType;
  difficulty: Difficulty;
  stem: string;
  media?: QuestionMedia;
  options: QuestionOption[];
}

export interface PracticeSetPublic {
  id: string;
  lessonId: string;
  mode: PracticeMode;
  order: number;
  /** Payload theo loại bộ thực hành, cấu trúc chi tiết theo mode */
  payload: Record<string, unknown>;
  questions?: QuestionPublic[];
}

export interface LessonDetail {
  id: string;
  chapterId: string;
  slug: string;
  title: string;
  /** Markdown + LaTeX */
  content: string;
  media: Array<{ url: string; type: "IMAGE" | "AUDIO"; bytes?: number }>;
  estimatedMinutes: number;
  /** Markdown mục "Cách tư duy" */
  thinkingSection: string;
  order: number;
  practiceSets: PracticeSetPublic[];
}

export interface UpNextResponse {
  lesson?: LessonBrief;
  roadmap?: { id: string; title: string };
}

export interface CompleteLessonResponse {
  completedAt: string;
}

// ── Thực hành (mục 4) ────────────────────────────────────────────────

export type AnswerValue = string | string[] | Array<{ leftId: string; rightId: string }>;

export interface PracticeAttemptInput {
  answers: Array<{ questionId: string; value: AnswerValue }>;
}

export interface PracticeQuestionResult {
  questionId: string;
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
  thinkingHints: string[];
}

export interface PracticeAttemptResult {
  results: PracticeQuestionResult[];
  xpEarned: number;
  accuracy: number;
}

export interface HintResult {
  hint: string;
}

export interface PythonExecInput {
  code: string;
  stdin?: string;
}

export interface PythonExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timeMs: number;
}

// ── Thi thử (mục 5) ──────────────────────────────────────────────────

export type ExamKind = "PRACTICE_TEST" | "PLACEMENT_TEST";

export interface StartExamInput {
  examBankId?: string;
  kind: ExamKind;
  subjectSlug?: string;
}

export interface ExamSession {
  id: string;
  durationSec: number;
  totalQuestions: number;
  startedAt: string;
  expiresAt: string;
  /** v1.1 — số giây còn lại tính tại thời điểm response (E1). */
  remainingSec: number;
}

export interface ExamQuestionItem {
  questionId: string;
  index: number;
  type: QuestionType;
  stem: string;
  options: QuestionOption[];
  media?: QuestionMedia;
}

export interface SubmitExamInput {
  answers: Array<{ questionId: string; value: AnswerValue }>;
  /**
   * v1.1 (D15): số lần vi phạm proctoring — server lưu vào session để admin xem,
   * KHÔNG ảnh hưởng điểm ở MVP. Bỏ qua (undefined) = không đè giá trị đã lưu.
   */
  violations?: number;
}

export interface ExamPerQuestion {
  questionId: string;
  isCorrect: boolean;
  yourAnswer: AnswerValue;
  correctAnswer: string;
  explanation: string;
}

export interface ExamResult {
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
  timeSpentSec: number;
  /** v1.1 — XP exam (+5/câu đúng, mục 6). Demo chấm local có thể không có. */
  xpEarned?: number;
  perQuestion: ExamPerQuestion[];
  weakTopics: string[];
  /**
   * v1.1 (D15): số lần vi phạm proctoring đã ghi nhận. `undefined`/0 nghĩa là
   * không có (hoặc replay idempotent không đè) — KHÔNG dùng để trừ điểm.
   */
  proctoringViolations?: number;
}

/**
 * v1.1 (E2/D16): response GET /exams/:sessionId/questions — trả kèm `progress`
 * đã autosave (E3) để FE khôi phục grid sau reload + `session.remainingSec`.
 */
export interface ExamQuestionsResponse {
  session: { id: string; remainingSec: number };
  progress: Array<{ questionId: string; value: AnswerValue }>;
  items: ExamQuestionItem[];
}

export interface ExamHistoryItem {
  sessionId: string;
  subjectName: string;
  kind: ExamKind;
  score: number;
  percent: number;
  passed: boolean;
  submittedAt: string;
  timeSpentSec: number;
}

export interface ExamDetail extends ExamResult {
  sessionId: string;
  subjectName: string;
  kind: ExamKind;
  submittedAt: string;
}

// ── Tiến độ & streak (mục 6) ─────────────────────────────────────────

export interface ChapterProgress {
  chapterId: string;
  title: string;
  percentCompleted: number;
}

export interface SubjectProgress {
  subjectId: string;
  name: string;
  icon?: string;
  color?: string;
  percentCompleted: number;
  avgAccuracy: number;
  chapters: ChapterProgress[];
}

export interface ProgressOverview {
  subjects: SubjectProgress[];
  currentStreak: number;
  longestStreak: number;
  totalXp: number;
  level: number;
}

export interface WeakTopicItem {
  topic: string;
  /** 0..1 — accuracy của bài/topic (G2: yếu khi < 0.7). */
  accuracy: number;
  attempts: number;
  /** Có thể null nếu lesson đã bị xoá/mất tham chiếu. */
  recommendedLesson: { id: string; title: string } | null;
}

export interface TimelineItem {
  date: string;
  lessonsCompleted: number;
  examsTaken: number;
  xpEarned: number;
}

export interface StreakDay {
  date: string;
  count: number;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  /** earned: earnedAt; upcoming: condition */
  earnedAt?: string;
  condition?: string;
}

export interface BadgesResponse {
  earned: Badge[];
  upcoming: Badge[];
}

// ── Lộ trình nghề nghiệp (mục 7) ─────────────────────────────────────

export interface RoadmapListItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  milestoneCount: number;
}

export interface RoadmapMilestone {
  id: string;
  title: string;
  order: number;
  dependsOn: string[];
  lessons: Array<{ lessonId: string; title: string }>;
  examBankId?: string;
}

export interface RoadmapDetail {
  id: string;
  slug: string;
  title: string;
  milestones: RoadmapMilestone[];
}

export interface Enrollment {
  id: string;
  roadmapId: string;
  startedAt: string;
}

/** GET /roadmaps/me — 1 enrollment kèm roadmap tóm tắt (FE bỏ localStorage). */
export interface EnrollmentListItem {
  id: string;
  roadmapId: string;
  startedAt: string;
  roadmap: { id: string; slug: string; title: string; icon?: string | null };
}

export type MilestoneStatus = "LOCKED" | "AVAILABLE" | "DONE";

/** v1.1 — shape thật của R4 (roadmap.service.getMyProgress). */
export interface RoadmapProgress {
  enrollment: {
    id: string;
    roadmap: { id: string; slug: string; title: string };
    startedAt: string;
  };
  percentCompleted: number;
  /** ID milestone AVAILABLE hiện tại (string) — null nếu đã hoàn thành hết. */
  currentStep: string | null;
  milestones: Array<{ id: string; title: string; order: number; status: MilestoneStatus }>;
}

/**
 * v1.1 — shape thật của R5 (roadmap.service.startPlacementTest): session thi
 * + gợi ý lộ trình theo percent placement gần nhất.
 */
export interface PlacementResult {
  session: ExamSession;
  recommendedRoadmap: { id: string; slug: string; title: string } | null;
  confidence: number;
}

/**
 * Ngưỡng gợi lộ trình theo percent placement (heuristic MVP — không đổi mà
 * không cập nhật contract): ≥80 → data-scientist, ≥50 → backend, còn lại → frontend.
 */
export const PLACEMENT_HIGH_THRESHOLD = 80;
export const PLACEMENT_MID_THRESHOLD = 50;
export const PLACEMENT_RECOMMENDATIONS = [
  { minPercent: PLACEMENT_HIGH_THRESHOLD, slug: "data-scientist", confidence: 0.9 },
  { minPercent: PLACEMENT_MID_THRESHOLD, slug: "backend", confidence: 0.75 },
  { minPercent: 0, slug: "frontend", confidence: 0.6 },
] as const;

// ── Pomodoro (mục 6 / G6, D14) ────────────────────────────────────────

/** Chuỗi focus tối thiểu được tính XP (phút). */
export const POMODORO_MIN_MINUTES = 25;
/** Chuỗi focus tối đa server chấp nhận (phút). */
export const POMODORO_MAX_MINUTES = 60;
/** Tối đa chuỗi được cộng XP mỗi ngày (chống spam XP). */
export const POMODORO_MAX_SESSIONS_PER_DAY = 8;
/** XP mỗi chuỗi focus hợp lệ. */
export const POMODORO_XP_PER_SESSION = 5;

/** G6 — POST /progress/pomodoro response. */
export interface PomodoroResult {
  xpEarned: number;
  sessionsToday: number;
}
