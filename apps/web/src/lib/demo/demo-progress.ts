import type {
  BadgesResponse,
  ProgressOverview,
  StreakDay,
  TimelineItem,
  WeakTopicItem,
} from "@/lib/api/types";

/**
 * Demo data cho /progress khi API lỗi (D13 — fallback trung thực: banner demo
 * bắt buộc hiện, số liệu chỉ để xem thử giao diện, KHÔNG fake như thật).
 */

export const DEMO_OVERVIEW: ProgressOverview = {
  subjects: [
    {
      subjectId: "demo-subj-toan",
      name: "Toán",
      percentCompleted: 42.9,
      avgAccuracy: 0.72,
      chapters: [
        { chapterId: "demo-ch-1", title: "Đại số", percentCompleted: 66.7 },
        { chapterId: "demo-ch-2", title: "Hình học", percentCompleted: 20 },
      ],
    },
    {
      subjectId: "demo-subj-tieng-anh",
      name: "Tiếng Anh",
      percentCompleted: 12.5,
      avgAccuracy: 0.55,
      chapters: [{ chapterId: "demo-ch-3", title: "Ngữ pháp nền tảng", percentCompleted: 12.5 }],
    },
  ],
  currentStreak: 3,
  longestStreak: 9,
  totalXp: 245,
  level: 2,
};

export const DEMO_WEAK_TOPICS: { items: WeakTopicItem[] } = {
  items: [
    {
      topic: "Đạo hàm hàm hợp",
      accuracy: 0.42,
      attempts: 1,
      recommendedLesson: { id: "demo-lesson-1", title: "Quy tắc chuỗi (chain rule)" },
    },
    {
      topic: "Thì quá khứ đơn",
      accuracy: 0.58,
      attempts: 1,
      recommendedLesson: { id: "demo-lesson-2", title: "Past simple vs Present perfect" },
    },
  ],
};

export function demoTimeline(days: number): { items: TimelineItem[] } {
  const items: TimelineItem[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    const wave = Math.max(0, Math.round(3 * Math.sin(i / 3) + 2 - (i % 4 === 0 ? 2 : 0)));
    items.push({
      date: d,
      lessonsCompleted: i % 3 === 0 ? wave : Math.max(0, wave - 1),
      examsTaken: i % 7 === 2 ? 1 : 0,
      xpEarned: wave * 10,
    });
  }
  return { items };
}

export function demoStreakCalendar(): { days: StreakDay[] } {
  const days: StreakDay[] = [];
  for (let i = 0; i < 120; i++) {
    if (i % 5 === 0 || i % 7 === 3) {
      days.push({
        date: new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10),
        count: (i % 5) + 1,
      });
    }
  }
  return { days };
}

export const DEMO_BADGES: BadgesResponse = {
  earned: [
    { id: "first-lesson", name: "Bước đầu tiên", icon: "🌱", earnedAt: new Date().toISOString() },
    { id: "streak-3", name: "3 ngày liền", icon: "🔥", earnedAt: new Date().toISOString() },
  ],
  upcoming: [
    { id: "exam-pass", name: "Vượt bài thi đầu tiên", icon: "📝", condition: "Nộp 1 bài thi đạt ≥70%" },
    { id: "pomodoro-master", name: "Thợ tập trung", icon: "🍅", condition: "Hoàn thành 8 chuỗi Pomodoro trong 1 ngày" },
  ],
};
