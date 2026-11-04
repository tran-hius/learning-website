# TASK-003-FR (Ngày 3): Trang bài học + quiz + Lottie feedback

- **Agent thực thi:** frontend-developer
- **Phạm vi đường dẫn cho phép:** `apps/web/src/**`, `apps/web/public/animations/**`, `apps/web/package.json`
- **Task gốc từ kế hoạch:** Ngày 3 — trang bài học thực thụ + hiệu ứng ăn điểm
- **Trạng thái:** DONE — final-reviewer: APPROVED_WITH_CONDITIONS (điều kiện chuyển TASK-004-FR: demo XP text trung tính, gate percent≥70 chờ user chốt)

## Quyết định đã chốt áp dụng
- **D8:** animation = `lottie-react` + file JSON free từ LottieFiles, lưu `apps/web/public/animations/` (mỗi file ≤150KB, lazy-load). Đọc mục 5 `docs/ui-design-guide.md` vừa cập nhật.
- Câu hỏi cho manager nếu: không tải được file JSON phù hợp từ LottieFiles (cần mạng) → tự vẽ SVG animation đơn giản thay thế là PHƯƠNG ÁN DỰ PHÒNG được chấp thuận sẵn (không cần BLOCKED).

## Mô tả công việc
1. **Trang bài học thực thụ** `/lessons/[slug]`: render content Markdown (+KaTeX nếu có công thức), sidebar mục lục, nút "Hoàn thành bài" gọi L1. Nếu API chưa chạy được (chưa có DB) → graceful fallback dữ liệu seed/mock local với banner "chế độ demo", KHÔNG fake data như thật.
2. **Card quiz trắc nghiệm** (component tái dùng): MCQ 1 đáp án/nhiều đáp án/điền đáp án; chọn → nộp qua P1 → hiển thị đúng/sai + giải thích + gợi ý theo bậc (hint level 1→2 qua P2).
3. **Khoảnh khắc ăn điểm (ĐIỂM NHẤN của trang web):**
   - Nộp practice/thi xong: điểm cao (≥70%) → **overlay pháo hoa/konfetti Lottie + mascot mừng** + thông điệp động viên kèm điểm ("Tuyệt vời! 9/10 🎉").
   - Điểm thấp (<70%) → KHÔNG pháo hoa: mascot buồn nhẹ + thông điệp "chê vui" ("Trượt chút xíu, thử lại nhé! 💪") + nút "Làm lại" / "Ôn lại".
   - Component `components/feedback/ResultCelebration.tsx` tái dùng cho cả practice lẫn thi (TASK-005).
4. **Trang /subjects** nâng cấp: fetch S1/S2 thật qua lib/api (fallback demo như trên), chương dạng hành trình dọc, sticker trạng thái bài (✅/🔵/🔒).
5. UX micro: transition 150–250ms, check bounce, progress chạy mượt — nhưng Lottie chỉ cho khoảnh khắc feedback.

## Definition of Done
- [x] lint + build pass (`pnpm --filter @learning/web lint` + `build` — 0 error)
- [x] Overlay celebration/retry hoạt động (demo được với mock: nộp bài demo → ≥70% mascot mừng + trophy Lottie; <70% mascot buồn nhẹ + "Làm lại"/"Ôn lại")
- [x] Không vi phạm checklist chống AI look (section 6) — banner demo rõ ràng, sticker trạng thái, màu theo môn, không gradient lòe loẹt
- [x] File animation ≤150KB, lazy-load (trophy 112KB + success-check 25KB, fetch JSON chỉ khi overlay mở; lottie-react dynamic ssr:false)

## Ghi chú thực thi (frontend-developer)
- File chính: `app/lessons/[slug]/page.tsx`, `app/subjects/page.tsx`, `app/subjects/[slug]/page.tsx`, `components/quiz/QuizCard.tsx`, `components/lesson/PracticeSection.tsx`, `components/feedback/ResultCelebration.tsx` + `Mascot.tsx`, `lib/demo/*`, `lib/api/content.server.ts`, `lib/api/practice.ts`, `lib/markdown.tsx`.
- Deps thêm vào apps/web: `lottie-react` (D8), `react-markdown`, `remark-gfm`, `remark-math`, `rehype-katex`, `katex` (Markdown + KaTeX theo task mục 1).
- Lottie tải từ LottieFiles CDN được (2 file vector, ≤150KB) → KHÔNG cần phương án dự phòng SVG animation cho Lottie; mascot mừng/buồn là SVG inline tự vẽ (guide mục 4).
- Quiz: MCQ single/multi/fill; hint bậc 1 từ payload (serializer giữ hints[0]), bậc 2 gọi P2 — P1/P2 backend CHƯA mount (routes/index.ts) → khi online sẽ fallback chấm local demo, demo mode là đường chính như task ghi.
- Đã push; docs/api-contract.md + docs/ui-design-guide.md + tasks/backend/TASK-003.md là thay đổi của agent khác, KHÔNG đụng.

## Câu hỏi cho manager
1. **S4 tra slug→id:** `/lessons/[slug]` trên web dùng slug, nhưng contract S4 `GET /lessons/:lessonId` chỉ nhận lessonId (hiện truyền slug thẳng → 404 khi backend chạy). Đề xuất backend thêm `GET /lessons/by-slug/:slug` hoặc chấp nhận cả slug ở S4. Tạm thời bài thật qua slug sẽ rơi demo mode — không chặn task này.

## Ghi chú của reviewer
(điền sau review)
