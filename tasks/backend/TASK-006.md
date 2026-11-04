# TASK-006 (Ngày 6): Tiến độ + Lộ trình + Pomodoro + Proctoring thi — backend

- **Agent thực thi:** backend-developer
- **Phạm vi đường dẫn cho phép:** `apps/api/src/**`, `apps/api/prisma/**`, `packages/shared/src/**` (nếu cần thêm type — kê khai), `apps/api/package.json`
- **Task gốc từ kế hoạch:** Ngày 6 — Tiến độ & Streak (G1–G5) + Lộ trình (R1–R5) + quyết định mới D14/D15/D16
- **Trạng thái:** DONE — final-reviewer: APPROVED (hotfix `b6d92ac` sửa F1 + F4; nên làm TASK-007: đồng bộ packages/shared, F2/F3/F5/F6)

## Điều kiện bắt buộc từ final-reviewer TASK-005 (làm ĐẦU PHIÊN)
1. **OC-1 (blocker):** `utils/cache.ts` `hitRateLimit` — chỉ `EXPIRE` khi `count === 1` (kết quả INCR đầu tiên), hoặc `SET key 1 EX window NX` trước rồi INCR. Thêm/đổi unit test giả lập gọi cách quãng chứng minh fixed-window thật (gọi 10 lần cách 1s trong window 60s phải hết hạn đúng giờ, không khóa vĩnh viễn).
2. **D16-1:** E2 `GET /exams/:sessionId/questions` trả thêm `progress: [{questionId, value}]` từ DB answers (FE khôi phục grid sau reload).
3. **D16-2:** E4 submit — `answers` ghi đè (upsert) lên autosave thay vì `deleteMany` + chấm bộ gửi kèm; hợp nhất bộ đáp án (autosave ∪ submit, submit ưu tiên) trước khi chấm.
4. **D15-BE:** E4 nhận `violations?: number` (validate 0..99) — lưu vào session/attempt (`proctoringViolations`), trả lại trong E6; KHÔNG ảnh hưởng điểm MVP.

## Quyết định đã chốt áp dụng (KHÔNG hỏi lại)
- D14: Pomodoro 30/5, XP +5/chuỗi focus ≥25 phút, endpoint **G6 POST /progress/pomodoro** (validate minutes ∈ [25..60], max 8 chuỗi/ngày chống spam XP — model `PomodoroSession { userId, minutes, completedAt }`).
- D13: demo mode đường chính, DB user tự cấu hình — mọi thứ best-effort không BLOCKED vì thiếu DB.

## Mô tả công việc (contract mục 6 + 7)
1. **G1–G5 progress endpoints** (STUDENT, `requireAuth`): overview theo môn (percentCompleted, avgAccuracy, streak, XP, level = floor(xp/100)), weak-topics (accuracy < 0.7 + recommendedLesson), timeline `?days=30`, streak-calendar `?year` (dạng contributions), badges (earned/upcoming — badges định nghĩa tạm trong code/seed, không cần bảng riêng nếu chưa có trong schema; nếu schema có Badges thì dùng).
2. **R1–R5 roadmap endpoints:** R1/R2 🔓 (seed 2–3 lộ trình mẫu: Backend, Frontend, Data Scientist với milestones + lessons + examBankId), R3 enroll, R4 tiến độ (milestone mở theo dependencies), R5 placement-test = alias POST /exams kind PLACEMENT_TEST + trả recommendedRoadmap (MVP: gợi ý theo accuracy placement — logic đơn giản, ghi rõ giả định vào báo cáo).
3. **G6 pomodoro** như quyết định D14.
4. Model Prisma thêm nếu cần: `PomodoroSession`, kiểm tra `Roadmap/Milestone/RoadmapEnrollment` đã có sẵn trong schema chưa — đọc schema trước, thiếu gì thêm nấy.
5. Mount routes + unit test: XP pomodoro guard (≤8/ngày), streak logic (mốc ngày cháy liên tục), milestone unlock theo dependencies.

## Definition of Done
- [x] lint + test + build + prisma validate pass (tsc 0 lỗi; vitest 71/71 gồm 7 file test mới; tsup build OK; `prisma validate` OK + `prisma generate` OK)
- [x] G6 chống spam XP (test chứng minh: pomodoro.test.ts + guard count/ngày trong progress.service, RATE_LIMITED 429 khi ≥8)
- [x] E2/E4/D15-BE điều kiện reviewer hoàn tất (test chứng minh merge + progress: exam-merge.test.ts, exam-submit-schema.test.ts)
- [x] Seed roadmap mẫu chạy được (3 lộ trình Backend/Frontend/Data Scientist + milestones nối dependsOn + 5 badges — idempotent upsert)

## Commit & Push
- 1 commit: `TASK-006(api): progress+streak, roadmaps, pomodoro xp, exam progress/merge, proctoring violations`
- push + hash → DONE_PRIVATE.
- **Đã thực hiện: commit `db3f181`, pushed `main` (723ea00..db3f181), không force.**

## Câu hỏi cho manager
(không BLOCKED — xem giả định trong báo cáo dev bên dưới)

## Báo cáo dev (TASK-006)
**4 điều kiện reviewer TASK-005 — HOÀN TẤT:**
1. OC-1: `utils/cache.ts` — `hitRateLimit` giờ là fixed-window thật: `SET key 1 EX window NX` trước; NX thất bại (key còn hạn) → chỉ INCR, KHÔNG EXPIRE lại. Logic lõi tách `rateLimitWith(clientLike,...)` pure để test. Test `rate-limit.test.ts` giả lập Redis + clock điều khiển được: gọi 10 lần cách 1s trong window 60s → TTL đúng 60s không bị kéo dài, hết hạn đúng giờ (không khóa vĩnh viễn), vượt limit bị chặn, qua cửa sổ mở lại.
2. D16-1: E2 (`exam.service.ts#getSessionQuestions`) trả thêm `progress: [{questionId, value}]` từ ExamAnswer (autosave E3).
3. D16-2: E4 merge autosave ∪ submit (submit ưu tiên) qua pure util `utils/exam-merge.ts`; repo `submitSession` upsert từng đáp án thay vì deleteMany+createMany.
4. D15-BE: E4 nhận `violations?: number` (zod int 0..99) → lưu `ExamSession.proctoringViolations`, trả lại trong E6 (+ E4 idempotent); không ảnh hưởng điểm.

**File chính:**
- Sửa: `utils/cache.ts`, `utils/index.ts`, `validations/exam.schema.ts`, `validations/index.ts`, `services/exam.service.ts`, `repositories/exam.repository.ts`, `repositories/content.repository.ts`, `repositories/progress.repository.ts`, `routes/index.ts`, `services/index.ts`, `repositories/index.ts`, `controllers/index.ts`, `prisma/schema.prisma`, `prisma/seed.ts`
- Mới: `utils/{exam-merge,streak,pomodoro,roadmap-logic,badges}.ts`, `validations/progress.schema.ts`, `repositories/roadmap.repository.ts`, `services/{progress,roadmap}.service.ts`, `controllers/{progress,roadmap}.controller.ts`, `routes/{progress,roadmap}.routes.ts`, 7 test file trong `tests/unit/`
- Schema: thêm `PomodoroSession` + `ExamSession.proctoringViolations Int?`. **KHÔNG có migration SQL** (repo chưa có thư mục migrations; DB demo không chạy được trong session) — khi có DB cần `prisma migrate dev` trước khi deploy.

**Giả định MVP (đã ghi trong code header, chờ manager/user duyệt nếu cần điều chỉnh):**
- Streak "ngày có hoạt động" derive từ 3 nguồn schema có sẵn: UserLessonProgress.completedAt, ExamSession.submittedAt, PomodoroSession.completedAt. Practice attempt (P1) không có bảng lưu → không tính. Ngày = UTC YYYY-MM-DD.
- G3 timeline `xpEarned` per-day = lessons×10 + pomodoro×5; XP exam (+5/câu) không có XP ledger nên không suy ngược per-day.
- G2 weak-topics: topic = lesson có accuracy < 0.7 (UserLessonProgress); `attempts` = 1 (schema không lưu lịch sử attempt).
- G5 badges: schema ĐÃ có Badge/UserBadge → seed 5 badge + lazy-award khi GET /progress/badges; điều kiện evaluate bằng code (`utils/badges.ts`).
- R4 milestone DONE = mọi lesson hoàn thành VÀ (nếu có examBank) đã có session SUBMITTED cho bank; milestone rỗng nội dung → DONE khi AVAILABLE. Status tính on-the-fly, không persist vào `enrollment.status`.
- R5 placement: gợi lộ trình theo percent lần PLACEMENT_TEST nộp gần nhất: ≥80 → data-scientist (confidence 0.9), ≥50 → backend (0.75), <50 → frontend (0.6); chưa có kết quả → roadmap đầu tiên với confidence 0.3.
- G6: ngày đếm theo UTC; `completedAt` client gửi chỉ nhận trong 24h quay lại (ngoài khoảng → clamp về now, chống spam khai mốc ngày cũ).

## Ghi chú của reviewer
(điền sau review)

- HOTFIX F1 (review commit db3f181): `b6d92ac` — `TASK-006(api): fix milestone-done deps fixpoint + seed milestone lessons (review F1)`
  - `roadmap-logic.ts`: thêm `resolveMilestoneDoneIds` (fixpoint) — milestone RỖNG chỉ DONE khi AVAILABLE (deps DONE), không tự DONE.
  - `roadmap.service.ts`: tách `hasMilestoneContent` + `isMilestoneDone` chỉ xét milestone có nội dung; dùng fixpoint cho milestone rỗng.
  - `prisma/seed.ts`: seed gán lessons/examBankId tham chiếu dữ liệu có sẵn (4 lesson + bank `toan-co-ban`) — không còn milestone rỗng.
  - F4 (bonus): `exam.service.ts`/`exam.repository.ts` — submit replay không đè `proctoringViolations` về 0 (`input.violations ?? undefined`).
  - Unit test thêm 4 case fixpoint; lint/test/build/prisma:validate PASS.
