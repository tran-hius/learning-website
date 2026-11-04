# TASK-007 (Ngày 7): Đồng bộ shared types + polish backend + chuẩn bị deploy

- **Agent thực thi:** backend-developer
- **Phạm vi đường dẫn cho phép:** `packages/shared/src/**`, `apps/api/src/**`, `apps/api/prisma/**`, root config liên quan deploy (`README.md`, `.env.example`, `apps/api/package.json`)
- **Task gốc từ kế hoạch:** Ngày 7 — polish + chuẩn bị deploy; điều kiện final-reviewer TASK-006
- **Trạng thái:** DONE_PRIVATE (commit `43534c2` — đã push origin/main)

## Điều kiện bắt buộc từ final-reviewer TASK-006
1. **SHARED (chính):** đồng bộ packages/shared theo 6 nhóm FE đang định nghĩa tay (risk drift):
   - `PlacementResult` + roadmap suggestion (slug, confidence, thresholds 80/50 — document constants)
   - `MilestoneStatus` (LOCKED|AVAILABLE|DONE) + roadmap progress response shape
   - Pomodoro result (`xpEarned`, `sessionsToday`) + constants (MAX_PER_DAY=8, MIN=25, MAX=60, XP=5)
   - E2 exam response (`progress`, `session.remainingSec`) + `proctoringViolations` semantics (undefined = không đè)
   - Weak-topic item shape
   - Streak calendar/timeline item shape
   Export đủ qua index.ts; API import từ shared thay type cục bộ trùng lặp (nơi nào còn dùng type local trùng → chuyển import; type nội bộ thật sự private thì giữ, kê khai).
2. **F2:** pomodoro count-then-create → create-then-count hoặc transaction (khi có DB mới chạy được — vẫn sửa code + test pure nếu được).
3. **BE polish deploy:** xem lại env example đủ biến (DATABASE_URL, REDIS_URL, AUTH_SECRET, CLOUDINARY_*, OAUTH_*, PISTON_URL), README đoạn "deploy Vercel + TiDB + Upstash + Cloudinary + Piston self-host" ngắn gọn; bảo đảm `build` không cần DB.

## Mô tả công việc
1. Đồng bộ shared như trên; tăng version contract docs lên v1.1 (mục 12 ghi chú "types đồng bộ").
2. F2 + polish nhỏ còn tồn từ review (nếu nhanh): pomodoro race, list enrollment endpoint `GET /roadmaps/me` (FE đang lưu enrollmentId localStorage — thêm endpoint đơn giản trả enrollments của user, FE sẽ dùng ở task FR).
3. Đảm bảo shared build standalone (`pnpm --filter @learning/shared build` hoặc typecheck) + api typecheck qua workspace dep.

## Definition of Done
- [x] lint + test + build + prisma validate pass (api), shared typecheck pass (qua tsc api + path mapping)
- [x] FE không còn phải định nghĩa tay các type trên (FE sẽ chuyển ở TASK-007-FR — bạn chỉ export đúng)
- [x] README deploy guide ngắn gọn

## Commit & Push
- 1 commit: `TASK-007(shared,api): sync contract types v1.1, pomodoro race fix, enrollments list, deploy guide`
- push + hash → DONE_PRIVATE.
- **Hash: `43534c224f77ddc9a1d7414302749c48b1fb3c63`** (đã push origin/main lần 1)

## Đã thực hiện (báo cáo dev)
- **Shared sync (packages/shared/src/types/entities.ts):** ExamSession +`remainingSec`; mới `ExamQuestionsResponse` (E2: progress + session.remainingSec, D16); SubmitExamInput +`violations?` (D15, undefined = không đè); ExamResult +`xpEarned?`/`proctoringViolations?`; WeakTopicItem.recommendedLesson nullable; Enrollment +`roadmapId`, mới `EnrollmentListItem` (GET /roadmaps/me); RoadmapProgress shape thật (enrollment, currentStep: string|null, milestones kèm title/order/status); PlacementResult shape thật (session + recommendedRoadmap|null + confidence); constants `PLACEMENT_HIGH_THRESHOLD=80`/`PLACEMENT_MID_THRESHOLD=50` + `PLACEMENT_RECOMMENDATIONS`; Pomodoro constants (25/60/8/5) + `PomodoroResult { xpEarned, sessionsToday }`. MilestoneStatus giữ nguyên (LOCKED|AVAILABLE|DONE|SKIPPED — SKIPPED là shape thật của code). StreakDay/TimelineItem khớp sẵn, không đổi.
- **API chuyển import shared:** `apps/api/src/types/api.ts` → re-export từ `@learning/shared`; `utils/pomodoro.ts` re-export constants từ shared; `roadmap.service` dùng `PLACEMENT_RECOMMENDATIONS` từ shared (bỏ bảng cục bộ). Type nội bộ giữ nguyên (kê khai): `SessionEnvelope`/buildResultPayload trong exam.service, `UserEntity` (Prisma entity, không phải contract), repository row types.
- **F2 pomodoro race:** create-then-count trong 1 transaction — `ProgressRepository.recordPomodoroTransaction` (tạo session → count bao gồm session vừa tạo → cộng XP; vượt quota throw → rollback toàn bộ; thay countPomodorosBetween+createPomodoro). Helper pure `isPomodoroQuotaExceeded` + test mới (pomodoro.test.ts, 4 tests).
- **GET /roadmaps/me** (requireAuth): repo `listEnrollmentsByUser` → service `listMyEnrollments` → controller/route (đăng ký trước `/roadmaps/:slug`). Trả `{ items: EnrollmentListItem[] }` — FE bỏ localStorage.
- **Deploy polish:** tạo `.env.example` (root) + `README.md` (guide Vercel + TiDB + Upstash + Cloudinary + Piston self-host Docker; build không cần DB). Build api = tsup, không đụng DB.
- **Contract docs:** KHÔNG sửa docs/** theo phạm vi. Đề xuất manager cập nhật api-contract.md: mục 7 thêm `GET /roadmaps/me`, mục 12 ghi chú "types đồng bộ v1.1 → packages/shared" (D6).
- **Kiểm tra:** `pnpm --filter @learning/api lint` (tsc --noEmit, typecheck luôn shared qua path mapping) ✅ · `test` 13 files / 77 tests ✅ · `build` ✅ · `prisma:validate` ✅.

## Câu hỏi cho manager
(điền nếu BLOCKED) — không BLOCKED.

## Ghi chú của reviewer
(review cấp 1 — hotfix commit `TASK-007(shared,api): drop SKIPPED from MilestoneStatus, pomodoro quota via helper, honest race comment (review F-R2/F-R4)`, hash: _điền sau push_)

- **F-R2 (shared):** bỏ `"SKIPPED"` khỏi `MilestoneStatus` — BE (`roadmap-logic.ts`) chỉ emit LOCKED|AVAILABLE|DONE. FE (`roadmaps/[slug]/page.tsx`) vẫn giữ key SKIPPED trong `STATUS_META` cục bộ (type widening an toàn, không đụng apps/web).
- **F-R4 (api):** repository `recordPomodoroTransaction` giờ gọi helper pure `isPomodoroQuotaExceeded` thay vì inline `countToday > maxPerDay` → test unit cover đúng đường code thật.
- **F-R3 (api):** hạ wording comment `recordPomodoroTransaction`: transaction chỉ thu hẹp race window + rollback XP nguyên khối; race đa request vẫn còn trên MySQL REPEATABLE READ; giải pháp cứng (FOR UPDATE / unique constraint) → backlog.
