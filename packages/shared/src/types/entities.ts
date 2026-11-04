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
  perQuestion: ExamPerQuestion[];
  weakTopics: string[];
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
  accuracy: number;
  attempts: number;
  recommendedLesson: { id: string; title: string };
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
  startedAt: string;
}

export type MilestoneStatus = "LOCKED" | "AVAILABLE" | "DONE" | "SKIPPED";

export interface RoadmapProgress {
  percentCompleted: number;
  currentStep: number;
  milestones: Array<{ id: string; status: MilestoneStatus }>;
}

export interface PlacementResult {
  recommendedRoadmap: { id: string; slug: string; title: string };
  confidence: number;
}
