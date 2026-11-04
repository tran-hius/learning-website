import type { LucideIcon } from "lucide-react";
import {
  Calculator,
  Sigma,
  Atom,
  Flower2,
  Languages,
  MessagesSquare,
  Code2,
} from "lucide-react";

/**
 * Dữ liệu 7 môn học của app — màu + icon theo docs/ui-design-guide.md mục 2
 * (màu riêng theo môn, dùng cho icon, progress bar, chip).
 * Phase 1 hiển thị tĩnh; khi backend /subjects (S1) chạy sẽ map theo slug.
 */
export interface SubjectMeta {
  slug: string;
  name: string;
  emoji: string;
  icon: LucideIcon;
  /** Mã màu hex theo guide — dùng cho nền icon/chip */
  color: string;
  /** Lớp Tailwind cho nền chip (đã có sẵn, không sinh runtime) */
  chipClass: string;
  description: string;
}

export const SUBJECTS: SubjectMeta[] = [
  {
    slug: "toan",
    name: "Toán",
    emoji: "🧡",
    icon: Calculator,
    color: "#FFB74D",
    chipClass: "bg-honey-100 text-honey-500",
    description: "Đại số, hình học từ cơ bản đến thi thử",
  },
  {
    slug: "toan-cao-cap",
    name: "Toán cao cấp",
    emoji: "💜",
    icon: Sigma,
    color: "#C39AE0",
    chipClass: "bg-lilac-soft-100 text-[#8a5cb8]",
    description: "Giải tích, đại số tuyến tính cho sinh viên năm nhất",
  },
  {
    slug: "vat-ly-dai-cuong",
    name: "Vật lý đại cương",
    emoji: "🌊",
    icon: Atom,
    color: "#4DB6AC",
    chipClass: "bg-teal-fresh-100 text-teal-fresh-600",
    description: "Cơ học, điện học với công thức kèm giải thích dễ hiểu",
  },
  {
    slug: "triet-hoc",
    name: "Triết học",
    emoji: "🌸",
    icon: Flower2,
    color: "#FF8A80",
    chipClass: "bg-coral-100 text-coral-600",
    description: "Chủ nghĩa duy vật biện chứng, tóm tắt cốt lõi để ôn thi",
  },
  {
    slug: "tieng-anh",
    name: "Tiếng Anh",
    emoji: "💙",
    icon: Languages,
    color: "#90CAF9",
    chipClass: "bg-sky-soft-100 text-sky-soft-600",
    description: "Ngữ pháp, từ vựng, luyện đề theo lộ trình",
  },
  {
    slug: "tieng-anh-giao-tiep",
    name: "Tiếng Anh giao tiếp",
    emoji: "🗣️",
    icon: MessagesSquare,
    color: "#FFD54F",
    chipClass: "bg-honey-100 text-honey-500",
    description: "Luyện nghe – nói, ghi âm và nhận nhận xét",
  },
  {
    slug: "python",
    name: "Python",
    emoji: "🐍",
    icon: Code2,
    color: "#26A69A",
    chipClass: "bg-mint-100 text-mint-600",
    description: "Lập trình từ số 0, chạy code ngay trên trang",
  },
];

/** 3 lộ trình nghề nghiệp theo contract mục 7 (R1: Backend / Frontend / Data Scientist). */
export const ROADMAPS = [
  {
    slug: "backend",
    title: "Lộ trình Backend",
    emoji: "🛠️",
    description: "Node.js, API, cơ sở dữ liệu — xây phần \"bên dưới\" của web app.",
    chipClass: "bg-teal-fresh-100 text-teal-fresh-600",
  },
  {
    slug: "frontend",
    title: "Lộ trình Frontend",
    emoji: "🎨",
    description: "HTML, CSS, React — biến ý tưởng thành giao diện mọi người dùng được.",
    chipClass: "bg-coral-100 text-coral-600",
  },
  {
    slug: "data-scientist",
    title: "Lộ trình Data Scientist",
    emoji: "📊",
    description: "Python, thống kê, máy học — đọc dữ liệu và kể câu chuyện từ con số.",
    chipClass: "bg-sky-soft-100 text-sky-soft-600",
  },
];
