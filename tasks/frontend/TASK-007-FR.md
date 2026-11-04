# TASK-007-FR (Ngày 7): Đồng bộ import shared + polish UI + chuẩn bị deploy

- **Agent thực thi:** frontend-developer
- **Phạm vi đường dẫn cho phép:** `apps/web/src/**`, `apps/web/package.json`
- **Task gốc từ kế hoạch:** Ngày 7 — polish + deploy prep
- **Trạng thái:** DONE — final-reviewer: APPROVED (hotfix `1ddab52` sửa F-R1; còn tồn F-R6 nhỏ) — commit `a233a78` + hotfix `1ddab52`
- **PHỤ THUỘC:** TASK-007 (backend) phải DONE_PRIVATE trước — shared types đã đồng bộ. Nếu chưa, làm mục 2–4 trước, mục 1 cuối.

## Điều kiện bắt buộc từ final-reviewer TASK-006
1. **F3:** PomodoroTimer — không tự tăng counter khi server trả 429/lỗi; chỉ tăng khi response có `xpEarned`; offline/demo hiển thị "≈".
2. **F6:** clear toast timer khi unmount; tách localStorage key pomodoro theo user id (`synapsebrain.pomodoro.{userId}` — không có user → key `guest`).

## Mô tả công việc
1. **Import shared types:** thay type cục bộ tay bằng import `@learning/shared` cho các nhóm backend vừa đồng bộ (PlacementResult, MilestoneStatus/roadmap progress, pomodoro, exam E2/E4, weak-topic, calendar/timeline). Nếu backend chưa xong → làm mục 2–4 trước.
2. **F5:** R5 placement — sau submit dùng chính `result.percent` của lần vừa nộp để tính/hiển thị gợi ý (không dùng gợi ý server từ lần cũ); nếu server E4/trả recommendedRoadmap mới thì ưu tiên.
3. **A11y pass nhẹ (backlog được duyệt từ TASK-005):** CountdownTimer aria-live chỉ announce khi chuyển mốc phút hoặc vào ngưỡng urgent (không đọc mỗi giây); confirm modal nộp bài + overlay proctoring thêm focus trap + Escape-close (trừ overlay proctoring — Escape không được phép đóng để bỏ cảnh báo).
4. **Polish deploy prep:** kiểm tra metadata (title/description SynapseBrain), favicon/logo, OG image nếu có sẵn; trang lỗi 404 thân thiện mascot nếu chưa có; KHÔNG deploy thật (chưa có env — chỉ chuẩn bị).
5. Demo fallback trung thực giữ nguyên; checklist AI look + touch target.

## Definition of Done
- [x] lint + build pass (eslint 0 lỗi/0 warning; next build OK, 12 route + /icon.svg)
- [x] Không còn type định nghĩa tay khớp shared — đã bỏ: RoadmapProgressReal, PlacementResultReal, ExamQuestionsResponse (bản cục bộ), SubmitExamInputWithViolations; giữ type demo/riêng tư (DemoQuestion, DemoExam, DemoSubjectDetail, SubjectMeta...) vì không nằm trong contract
- [x] Pomodoro quota trung thực (chỉ tăng khi server trả xpEarned, dùng sessionsToday server; 429/lỗi giữ nguyên; demo/ước lượng hiện "≈"), a11y pass nhẹ xong (CountdownTimer aria theo mốc phút/urgent; focus trap + Escape cho confirm/pause modal; overlay proctoring không Escape-close)

## Ghi chú thực hiện (FE)
- R4 giờ tra enrollment qua GET /roadmaps/me (getMyEnrollments); fallback localStorage `synapsebrain.enrollment.*` khi API lỗi — trung thực, có comment trong code.
- F3: PomodoroTimer chuyển phase ngay (đồng hồ không đứng) nhưng counter chỉ tăng khi response có `xpEarned` (ưu tiên `sessionsToday` từ server); demo đếm thiết bị hiển thị "≈".
- F6: toast timer clear khi unmount; storage key `synapsebrain.pomodoro.{userId|guest}` (resolve qua A7 getMe, lỗi → guest).
- F5: gợi ý placement tính từ `result.percent` của lần vừa nộp theo PLACEMENT_RECOMMENDATIONS (shared); E4 không trả recommendedRoadmap mới nên không có nguồn server mới hơn để ưu tiên.
- Deploy prep: thêm app/not-found.tsx (mascot Bút Chì), app/icon.svg (favicon mascot), metadata + OpenGraph/Twitter card trong layout. KHÔNG deploy thật.

## Commit & Push
- 1 commit: `TASK-007-FR(web): shared types import, pomodoro honesty fixes, a11y pass, deploy polish`
- push + hash → DONE_PRIVATE.

## Câu hỏi cho manager
(điền nếu BLOCKED)

## Ghi chú của reviewer
- F-R1 hotfix: `getMyEnrollments()` trả `{ items: EnrollmentListItem[] }` (khớp pattern `getRoadmaps`); `app/roadmaps/[slug]/page.tsx` dùng `list.items.find(...)`. Lint + build pass. Hotfix commit: `1ddab52` (đã push origin/main).
