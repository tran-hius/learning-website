# TASK-005 (Ngày 5): Thi & thi thử — backend

- **Agent thực thi:** backend-developer
- **Phạm vi đường dẫn cho phép:** `apps/api/src/**`, `apps/api/prisma/**`, `packages/shared/src/**` (chỉ nếu cần thêm type exam — phải kê khai trong báo cáo), `apps/api/package.json`
- **Task gốc từ kế hoạch:** Ngày 5 — Thi & thi thử (E1–E6)
- **Trạng thái:** DONE — final-reviewer: APPROVED_WITH_CONDITIONS (điều kiện TASK-006: sửa hitRateLimit TTL OC-1; câu hỏi contract Y1/Y7 + backlog trình user) — commit `8cea0a1`

## Điều kiện bắt buộc từ final-reviewer TASK-004 (làm ĐẦU PHIÊN, blocker-level)
1. *(FR làm, không phải bạn)* — bỏ qua nếu không liên quan backend.
2. **BE-1** `utils/cache.ts` `hitRateLimit`: đổi sang thao tác nguyên tử (pipeline MULTI incr+expire, hoặc `SET key 1 EX 60 NX` + INCR) — không để key tồn tại không TTL nếu crash giữa 2 lệnh; hạ warn còn 1 lần (flag `disabled` như init path) thay vì warn mỗi request khi Redis chết giữa chừng.
3. **BE-2** MATCH_PAIRS: thống nhất shape với contract `{leftId, rightId}` — sửa scoring + validations + seed theo contract, hoặc (nếu khó) cập nhật contract docs. Chọn 1 và kê khai rõ trong báo cáo. Frontend hiện dùng `{left, right}` — nếu bạn đổi sang `{leftId, rightId}` thì GHI RÕ vào báo cáo để manager giao FR cập nhật cùng vòng.
4. **BE-3** stale docs: nếu có comment/docs ghi "backend chưa mount /practice" trong apps/api — xóa.

## Quyết định đã chốt áp dụng (KHÔNG hỏi lại)
- **D13:** demo mode là đường chính; TiDB/Cloudinary/OAuth/PISTON_URL user tự cấu hình sau — code không cần đổi khi điền env. Timer Redis: nếu Redis không kết nối được → fallback lưu deadline trong DB/quirk, KHÔNG BLOCKED.
- **D9/D8:** celebration ≥70% pháo hoa / <70% động viên — exam dùng lại payload accuracy để FE tái dùng `ResultCelebration`.

## Mô tả công việc (contract mục 5 — đọc kỹ docs/api-contract.md mục 5)
1. **E1 POST /exams/:examId/start** — STUDENT: tạo ExamAttempt (status IN_PROGRESS), trả câu hỏi (ẩn đáp án như serializer practice) + `deadlineAt` (timer theo config exam duration, dùng Redis lưu deadline + remaining nếu có Redis; Redis chết → fallback DB timestamp). Chống mở lại attempt đang IN_PROGRESS: trả attempt hiện tại hoặc 409 theo contract.
2. **E2 GET /exams/:examId/attempt/:attemptId** — lấy trạng thái attempt (câu hỏi + remaining time + answers đã lưu tạm nếu contract có autosave).
3. **E3 PATCH /exams/:examId/attempt/:attemptId/answers** — lưu đáp án tạm (autosave) nếu contract mục 5 có; nếu contract không có → ghi câu hỏi vào task file, đừng tự suy diễn.
4. **E4 POST /exams/:examId/attempt/:attemptId/submit** — chấm tự động toàn bộ (dùng lại `utils/scoring.ts`), tính accuracy + XP thưởng theo contract, cập nhật status SUBMITTED + `submittedAt`. Nộp sau deadline → theo contract (auto-submit/ từ chối — đọc contract, nếu không ghi rõ → câu hỏi).
5. **E5 GET /exams/:examId/attempts/me** — lịch sử làm của user.
6. **E6 GET /exams/:examId/leaderboard** — top điểm (🔓 hoặc STUDENT theo contract).
7. **Admin E7+ (nếu contract có)**: CRUD exam + exam questions (dùng lại pattern admin content, examBankId validate tồn tại).
8. Seed: 1 exam mẫu (ngân hàng câu hỏi examBank đã có từ TASK-003).
9. Mount routes + unit test scoring exam (điểm + XP) nếu khác practice.

## Definition of Done
- [ ] lint + test + build + prisma validate pass
- [ ] Timer hoạt động khi CÓ Redis; khi KHÔNG có Redis vẫn thi được (fallback DB) — test/unit chứng minh logic deadline không phụ thuộc Redis
- [ ] Câu hỏi exam KHÔNG leak đáp án (serializer reuse)
- [ ] Không submit 2 lần (idempotent/409)

## Commit & Push
- 1 commit: `TASK-005(api): exam attempts, timer, auto-scoring, leaderboard`
- push + hash → DONE_PRIVATE.

## Câu hỏi cho manager
(không BLOCKED — đã làm phần contract có định nghĩa, các điểm chưa rõ liệt kê dưới đây để manager trình user)

1. **Leaderboard (work item 6 trong task) KHÔNG có trong contract mục 5** — contract E5 = `/exams/history`, E6 = `/exams/:sessionId` (chi tiết 1 lần thi đã nộp). Không tự suy diễn shape leaderboard → **CHƯA implement**. Cần user chốt: có cần `GET /exams/:examBankId/leaderboard` không, shape nào (top N, điểm + tên + thời gian?), quyền 🔓 hay STUDENT?
2. **Số câu mỗi đề:** contract không ghi tổng số câu. Đã dùng mặc định **20 câu** (hằng `EXAM_QUESTION_COUNT`), tỷ lệ 60/20/20 theo contract. Cần xác nhận số này.
3. **Pool câu cho PLACEMENT_TEST** (E1 không bắt buộc bank): đã chọn = câu hỏi `source: EXAM` toàn cục, lọc theo `subjectSlug` qua practiceSet→lesson→chapter→subject nếu có. Contract chỉ ghi "có thể nhiều đề chủ đề" — cần xác nhận.
4. **`subjectName` trong E5 history:** `ExamBank` không liên kết `Subject` trong schema → trả tên exam bank làm `subjectName` (null nếu placement). Cần thêm quan hệ ExamBank↔Subject nếu muốn đúng nghĩa "môn".
5. **`weakTopics` (E4):** schema không có field topic trên QuestionItem → dùng `hintAnswerRef` của câu SAI làm topic tag (trả `[]` nếu trống). Cần xác nhận hoặc thêm field topic.
6. **Nộp 2 lần:** contract không ghi rõ → chọn **idempotent** (nộp lại trả kết quả cũ) thay vì 409 — an toàn hơn cho retry mạng. Nộp SAU deadline → `EXAM_STATE_CONFLICT` 409 đúng contract ("mọi PATCH/POST" quá hạn trả conflict; không auto-submit vì contract không quy định).
7. **Contract mục 3.1 cần cập nhật:** ghi chú `answer.pairs: [{left, right}]` → thực tế đã thống nhất BE-2 thành `[{leftId, rightId}]` (khớp P1). Manager nên cập nhật contract v1.1 + giao FR cập nhật FE (FE đang dùng `{left, right}`).

### Lựa chọn BE-2 (kê khai theo yêu cầu reviewer)
**Đã đổi MATCH_PAIRS sang `{leftId, rightId}`** (id option) ở: `utils/scoring.ts`, `validations/practice.schema.ts` (dùng chung cho exam), seed, test. **→ Manager cần giao FR cập nhật FE cùng vòng** (FE hiện dùng `{left, right}`).

## Ghi chú của reviewer
(điền sau review)

## Báo cáo thực thi (dev, 05/11/2026)
- **File tạo mới:** `src/repositories/exam.repository.ts`, `src/services/exam.service.ts`, `src/controllers/exam.controller.ts`, `src/routes/exam.routes.ts`, `src/validations/exam.schema.ts`, `src/utils/exam-timer.ts`, `tests/unit/exam-timer.test.ts`.
- **File sửa:** `utils/cache.ts` (BE-1: pipeline atomic INCR+EXPIRE + warn-once), `utils/scoring.ts` + `validations/practice.schema.ts` + `tests/unit/scoring.test.ts` (BE-2 `{leftId, rightId}`), `routes/index.ts` (mount examRouter), `controllers|services|repositories|validations/index.ts` (exports), `prisma/schema.prisma` (+`ExamSession.questionIds` — lưu đề random, fallback khi không có Redis), `prisma/seed.ts` (exam bank `toan-co-ban` + 6 câu EXAM đủ 5 loại difficulty E/M/H).
- **BE-3:** grep toàn `apps/api/src` — không còn comment "chưa mount /practice" (routes/index.ts đã mount và comment router tiếp theo đã cập nhật). Không có gì phải xóa thêm.
- **Endpoints (theo contract mục 5, không theo paraphrase task):** E1 `POST /exams`, E2 `GET /exams/:sessionId/questions`, E3 `PATCH /exams/:sessionId/progress`, E4 `POST /exams/:sessionId/submit`, E5 `GET /exams/history`, E6 `GET /exams/:sessionId`. Admin E7+ không làm (contract không định nghĩa CRUD exam admin).
- **Kiểm tra:** `pnpm --filter @learning/api lint` (tsc) ✅ · `test` 37/37 pass (6 file, gồm 9 test timer pure không phụ thuộc Redis + 13 test scoring) ✅ · `build` (tsup) ✅ · `prisma:validate` ✅ · `prisma generate` ✅ (chưa chạy migrate — demo mode schema-push theo D13, DB local user tự cấu hình).
- **Chống submit 2 lần:** SUBMITTED → idempotent trả kết quả cũ; quá hạn → 409 `EXAM_STATE_CONFLICT` + mark EXPIRED.
- **XP exam:** +5/câu đúng (contract mục 6) — khác practice +2, đã khai báo `EXAM_XP_PER_CORRECT`.
