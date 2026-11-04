# TASK-006-FR (Ngày 6): Trang tiến độ + Lộ trình + Pomodoro + Proctoring — frontend

- **Agent thực thi:** frontend-developer
- **Phạm vi đường dẫn cho phép:** `apps/web/src/**`, `apps/web/package.json`
- **Task gốc từ kế hoạch:** Ngày 6 — dashboard tiến độ, lộ trình, Pomodoro, chống gian lận thi
- **Trạng thái:** DONE_PRIVATE (chờ reviewer — commit `2131aceb9d7d964e16a39ab336f8811e5e7c7b77`)

## Điều kiện bắt buộc từ final-reviewer TASK-005 (làm ĐẦU PHIÊN — KHÔNG có 🟠 code mới từ backend, FE không có điều kiện OC; nhưng hưởng D16)
1. **D16-FE:** ExamRunner — khi GET questions trả `progress` → khôi phục grid + câu đã trả lời sau reload; submit giờ merge phía server, FE cứ gửi full state như cũ.

## Quyết định đã chốt áp dụng
- **D14:** Pomodoro 30 phút học / 5 phút nghỉ, XP +5/chuỗi focus; endpoint G6 POST /progress/pomodoro (backend làm cùng vòng — gọi khi 200, demo fallback trung thực).
- **D15:** Proctoring thi tiếng Anh (chi tiết dưới).
- **D8/D9:** Lottie chỉ cho feedback quan trọng.

## Mô tả công việc
1. **Trang `/progress`:** overview G1 (XP, level, streak hiện tại/dài nhất, percentCompleted theo môn — progress bar + sticker), timeline G3 biểu đồ cột đơn giản (CSS/SVG thuần, KHÔNG tự thêm thư viện chart — nếu muốn lib → BLOCKED), streak-calendar G4 dạng lưới contributions GitHub (ô đậm nhạt theo count), weak-topics G2 (list accuracy <70% + link bài ôn), badges G5 (earned vs upcoming xám).
2. **Trang `/roadmaps` + `/roadmaps/[slug]`:** list lộ trình R1, tree milestones R2 (mốc khoá 🔒 / mở 🔵 / xong ✅ theo R4), nút "Bắt đầu lộ trình" (R3), trang tiến độ lộ trình R4 (milestone hiện tại highlight); R5 placement-test: nếu user chưa làm placement → CTA gọi POST /progress/placement-test → vào ngay màn thi placement (tái dùng ExamRunner kind PLACEMENT_TEST) → kết quả gợi lộ trình.
3. **Pomodoro (D14):** component `components/focus/PomodoroTimer.tsx` — đặt ở trang bài học (sidebar/collapse) + trang tiến độ; cycle 30 phút học / 5 phút nghỉ (đếm tuyệt đối theo timestamp, không drift), auto-chuyển phase + thông báo thân thiện (Không dùng alert), hoàn thành chuỗi học → gọi G6 (+5 XP, toast "Chuỗi tập trung hoàn thành! +5 XP 🍅"); tối đa 8 chuỗi/ngày (hiển thị counter, hết quota báo nhẹ); demo fallback trung thực.
4. **Proctoring thi tiếng Anh (D15):** trong ExamRunner khi đề là tiếng Anh (theo examBank/subject — đọc shape thật; nếu không xác định được exam nào là TA → áp dụng cho MỌI exam có cờ `proctored` backend trả, nếu không có cờ → áp dụng cho kind PLACEMENT_TEST + exam bank tiếng Anh — ghi giả định vào báo cáo):
   - Vào đề → `requestFullscreen` trên container thi + nút "Bắt đầu làm bài" trước đó (fullscreen cần user gesture).
   - Chặn `contextmenu` (chuột phải), chặn phím tắt copy/cut trên đề (không chặn paste vào ô điền), ẩn selection text đề nếu dễ (CSS select-none trừ input).
   - Detect `fullscreenchange` (thoát FS) + `visibilitychange` (chuyển tab) → overlay cảnh báo toàn màn hình đếm ngược 5s yêu cầu quay lại, đếm `violations++` (đồng thời autosave).
   - Đủ **3 lần** → tự nộp bài (submit với violations) → ResultCelebration hiển thị kết quả + dòng chú thích "Bài được nộp tự động sau 3 lần rời màn hình".
   - Nút thoát chủ động: "Tạm dừng thi" → confirm → tự nộp với violations hiện có (không mất bài).
   - Tranh chấp trình duyệt không hỗ trợ fullscreen (iOS Safari) → degrade: chỉ dùng visibilitychange, thông báo rõ.
5. Checklist chống AI look + touch target 44px + demo banner honey trung thực như các task trước.

## Definition of Done
- [ ] lint + build pass
- [ ] Pomodoro hoạt động đúng 30/5, XP guard hiển thị khi hết quota
- [ ] Proctoring: cảnh báo hiện đúng khi thoát FS/chuyển tab, tự nộp sau 3 lần (test bằng tay + demo mode được)
- [ ] Countdown/Chu kỳ Pomodoro tuyệt đối (refresh không sai)

## Commit & Push
- 1 commit: `TASK-006-FR(web): progress dashboard, roadmaps, pomodoro, exam proctoring`
- push + hash → DONE_PRIVATE.

## Câu hỏi cho manager
(Không BLOCKED — đã chạy đủ 5 mục công việc theo giả định task file cho phép. Các lưu ý cho reviewer/manager:)
1. **Giả định D15 (đúng thứ tự task file):** backend KHÔNG có cờ `proctored`, seed chỉ có bank "toan-co-ban" → không xác định được exam tiếng Anh cụ thể ⇒ proctoring áp dụng cho **kind PLACEMENT_TEST** + **bank id/slug khớp `/tieng-anh|english|anh-van/i`** (khi sau này thêm bank tiếng Anh sẽ tự động bị giám sát).
2. **packages/shared chưa khớp shape backend v1.1** (không thuộc phạm vi FE sửa): `SubmitExamInput` thiếu `violations`, `PlacementResult` thiếu `session`, `RoadmapProgress.currentStep` là number trong khi backend trả milestone id + `milestones` kèm title/order, G2 `recommendedLesson` có thể `null`, E2 trả `progress` + `session.remainingSec`. FE đã dùng type cục bộ (`lib/api/exams.ts`, `lib/api/roadmaps.ts`) — đề nghị manager cho BE/reviewer đồng bộ `packages/shared` ở task sau.
3. **R4 cần enrollmentId** nhưng chưa có endpoint liệt kê enrollment của user → FE lưu enrollmentId vào localStorage sau R3 (idempotent enroll). Nếu user đổi máy sẽ mất liên kết — cần BE thêm `GET /roadmaps/me` (đề xuất).
4. **G2 không trả lesson slug** (chỉ `{id, title}`) → link "Ôn lại" dùng `/lessons/{id}` và trang `/lessons/[slug]` giờ fallback S4 theo id (đã thêm `getLessonServerById`).

## Ghi chú của reviewer
(điền sau review)
