import type { SubjectListItem } from "@/lib/api/types";

/**
 * Demo data cho /subjects và /subjects/[slug] khi API/DB chưa chạy
 * (banner "chế độ demo" bắt buộc — không fake như dữ liệu thật).
 * Trạng thái bài: DONE ✅ / DOING 🔵 / LOCKED 🔒 — demo nằm ở client,
 * thật thì lấy từ S3 (GET /subjects/:slug/chapters/:chapterId cần đăng nhập).
 */
export interface DemoLessonNode {
  id: string;
  slug: string;
  title: string;
  estimatedMinutes: number;
  status: "DONE" | "DOING" | "LOCKED";
}

export interface DemoChapterNode {
  id: string;
  title: string;
  order: number;
  lessons: DemoLessonNode[];
}

export interface DemoSubjectDetail {
  subject: SubjectListItem;
  chapters: DemoChapterNode[];
}

export const DEMO_SUBJECTS: SubjectListItem[] = [
  {
    id: "demo-subj-toan",
    slug: "toan",
    name: "Toán",
    icon: "🧡",
    color: "#FFB74D",
    chapterCount: 2,
    description: "Đại số, hình học từ cơ bản đến thi thử",
  },
  {
    id: "demo-subj-python",
    slug: "python",
    name: "Python",
    icon: "🐍",
    color: "#26A69A",
    chapterCount: 1,
    description: "Lập trình từ số 0, chạy code ngay trên trang",
  },
];

export const DEMO_SUBJECT_DETAIL: DemoSubjectDetail = {
  subject: DEMO_SUBJECTS[0],
  chapters: [
    {
      id: "demo-ch-1",
      title: "Chương 1 · Hàm số và đạo hàm",
      order: 1,
      lessons: [
        {
          id: "demo-lesson-1",
          slug: "dao-ham-cua-ham-so",
          title: "Đạo hàm của hàm số — hiểu bản chất trước khi nhớ công thức",
          estimatedMinutes: 12,
          status: "DONE",
        },
        {
          id: "demo-lesson-2",
          slug: "quy-tac-tinh-dao-ham",
          title: "Quy tắc tính đạo hàm: tổng, tích, thương",
          estimatedMinutes: 15,
          status: "DOING",
        },
        {
          id: "demo-lesson-3",
          slug: "ung-dung-dao-ham",
          title: "Ứng dụng đạo hàm: tìm giá trị lớn nhất – nhỏ nhất",
          estimatedMinutes: 18,
          status: "LOCKED",
        },
      ],
    },
    {
      id: "demo-ch-2",
      title: "Chương 2 · Tích phân",
      order: 2,
      lessons: [
        {
          id: "demo-lesson-4",
          slug: "nguyen-ham-cua-ham-so",
          title: "Nguyên hàm — đạo hàm đi ngược lại",
          estimatedMinutes: 14,
          status: "LOCKED",
        },
        {
          id: "demo-lesson-5",
          slug: "tich-pham-xac-dinh",
          title: "Tích phân xác định và diện tích hình phẳng",
          estimatedMinutes: 20,
          status: "LOCKED",
        },
      ],
    },
  ],
};

export function findDemoSubject(slug: string): DemoSubjectDetail | null {
  return slug === DEMO_SUBJECT_DETAIL.subject.slug ? DEMO_SUBJECT_DETAIL : null;
}
