# TASK-005-FR (Ngày 5): Trang thi + tái dùng ResultCelebration

- **Agent thực thi:** frontend-developer
- **Phạm vi đường dẫn cho phép:** `apps/web/src/**`, `apps/web/package.json`
- **Task gốc từ kế hoạch:** Ngày 5 — giao diện thi & thi thử
- **Trạng thái:** DONE — final-reviewer: APPROVED_WITH_CONDITIONS (a11y timer/modal vào backlog pass chung) — commit `075ea93`

## Điều kiện bắt buộc từ final-reviewer TASK-004 (làm ĐẦU PHIÊN, blocker-level)
1. **FE-1** `lib/api/content.server.ts`: `getLessonServer` chuyển gọi `/lessons/by-slug/:slug` (D10) — xóa comment stale "chưa có endpoint tra slug→id". Đây là lý do trang bài học thật đang rơi demo mode oan.
2. **FE-2** Touch target ≥44px: ListeningPlayer speed buttons `min-h-[36px]` → `min-h-[44px]`; nút submit listening bỏ `size="sm"`. Scan nhanh các nút bạn từng viết (SpeakingPractice, PracticeSection) sửa luôn chỗ nào <44px.
3. **FE-3** SpeakingPractice demo submit: đổi từ banner đỏ `role="alert"` coral → banner honey trung tính (theo pattern `usedFallback` của ListeningPlayer).
4. **FE-4** SpeakingPractice: giữ ref `audioCtxRef` + `audioCtx.close()` trong cleanup; ListeningPlayer `<audio>` thêm `onError` → thông báo thân thiện ("Không phát được audio, thử tải lại nhé").
5. **FE-5** Xóa stale comment `lib/api/practice.ts` đầu file ("backend chưa mount /practice"); tick DoD checkboxes task TASK-004-FR.md (cho phép sửa file tasks/frontend/TASK-004-FR.md riêng mục này).

## Quyết định đã chốt áp dụng
- **D13:** demo mode đường chính; backend exam sẽ mount trong TASK-005 — dùng API khi 200, fallback demo trung thực khi lỗi.
- **D8/D9:** tái dùng `ResultCelebration` cho kết quả THI (≥70% pháo hoa + mascot mừng; <70% mascot "chê vui" + Làm lại/Ôn lại).

## Mô tả công việc
1. **Trang thi `/exams/[id]`** nâng cấp thành màn thi thật: header đếm ngược theo `deadlineAt` (đổi màu vàng/đỏ khi <20%/hết giờ), progress "Câu x/y", điều hướng câu trước/sau + grid nhảy câu, trạng thái đã trả lời.
2. **Form câu hỏi thi**: tái dùng QuizCard hoặc bản nhẹ cho exam (MCQ single/multi/fill/match pairs — match pairs render cột kéo-chọn đơn giản, KHÔNG kéo-thả phức tạp nếu chưa xác định; nếu cần kéo-thả → dùng nút chọn từng cặp, đừng tự thêm thư viện dnd).
3. **Nộp bài**: confirm trước khi nộp ("Còn x câu chưa trả lời" nếu có), gọi submit → hiển thị `ResultCelebration` + điểm + perQuestion review (đúng/sai + giải thích) nếu API trả sau submit.
4. **Trang lịch sử thi**: list attempts (điểm, thời gian, trạng thái) tại `/exams/[id]/history` hoặc section trong trang exam — theo contract E5.
5. Leaderboard đơn giản nếu contract E6 có (top 10, highlight bản thân).
6. Demo fallback trung thực như các task trước (banner honey, không fake như thật).

## Definition of Done
- [x] lint + build pass (`pnpm --filter @learning/web lint` / `build` — 0 error, 0 warning)
- [x] Đếm ngược hoạt động thật (deadline từ API, không đếm sai khi refresh — dùng deadlineAt tuyệt đối, KHÔNG đếm từ client start)
- [x] ResultCelebration tái dùng thành công cho exam (percent ≥70 pháo hoa / <70 "Làm lại" + "Xem lại bài làm")
- [x] Checklist chống AI look + touch target pass (mọi nút ≥44px: grid câu 44×44, nút bỏ cặp 44×44, speed buttons 44px)

## Commit & Push
- 1 commit: `TASK-005-FR(web): exam ui, countdown timer, result celebration reuse`
- push + hash → DONE_PRIVATE.

## Câu hỏi cho manager
(không có — không BLOCKED; xem ghi chú dev)

## Ghi chú của dev (TASK-005-FR)
- Commit hash: `075ea93` (pushed lên main, sau `8cea0a1` của backend TASK-005).
- **5 điều kiện reviewer TASK-004:** FE-1 `content.server.ts` chuyển `/lessons/by-slug/:slug` (D10, xóa comment stale); FE-2 ListeningPlayer speed buttons `min-h-[44px]` + bỏ `size="sm"` nút submit; FE-3 SpeakingPractice demo banner honey trung tính (tách `demoNotice` khỏi lỗi thật, không role="alert"); FE-4 `audioCtxRef` + `close()` trong cleanup + `<audio onError>` ("Không phát được audio, thử tải lại nhé"); FE-5 xóa stale comment `practice.ts` + tick DoD TASK-004-FR.md.
- **File mới:** `components/exam/CountdownTimer.tsx` (đếm ngược TUYỆT ĐỐI theo `expiresAt` — tick từ Date.now, đổi teal→honey ≤20%→coral hết giờ); `components/exam/MatchPairsForm.tsx` (nút chọn từng cặp, KHÔNG dnd, value `{leftId, rightId}` theo BE-2/contract P1; phân cột theo seed `opt_l*`/`opt_r*`, fallback chia nửa); `components/exam/ExamQuestionCard.tsx` (bản nhẹ QuizCard cho exam — không hint, đủ 5 loại câu, media hình/audio); `components/exam/ExamRunner.tsx` (E1→E4: resume session, grid nhảy câu, autosave debounce 1.5s "Đã lưu ✓", confirm nộp báo câu trống, review perQuestion, demo fallback trung thực); `lib/demo/demo-exam.ts`; `lib/api/exam.server.ts` (E5 server + cookie).
- **File sửa:** `lib/api/exams.ts` (E5 trả `{ items }` khớp exam.repository — không Paginated); `app/exams/[id]/page.tsx` (trang thi thật); `app/exams/[id]/history/page.tsx` (lịch sử thi E5, trạng thái trống trung thực).
- Leaderboard (mục 5 task): contract E6 thực tế là "chi tiết 1 lần thi đã nộp", KHÔNG có endpoint leaderboard → không làm (đúng Rule 0).
- Hạn chế đã biết: E2 không trả progress đã lưu → reload giữa chừng mất grid "đã trả lời" client (đáp án vẫn còn trên server qua E3, submit vẫn tính). Demo demo đề 10 phút/5 câu.


## Ghi chú của reviewer
(điền sau review)
