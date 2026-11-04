# TASK-003 (Ngày 3): Nội dung học tập — backend

- **Agent thực thi:** backend-developer
- **Phạm vi đường dẫn cho phép:** `apps/api/src/**`, `apps/api/prisma/**`, `apps/api/package.json`
- **Task gốc từ kế hoạch:** Ngày 3 — Môn học & Bài học (S1–S4, L1–L2, C1–C12 trừ C12 upload để sau)
- **Trạng thái:** DONE — final-reviewer: APPROVED_WITH_CONDITIONS (điều kiện + câu hỏi chuyển TASK-004: by-slug endpoint, map lỗi P2003, cacheDel C3, publish flag trước public)

## Điều kiện bắt buộc từ final-reviewer TASK-002 (làm TRONG task này)
1. `POST /auth/logout`: bỏ `requireAuth` (A6 🔓, quyết định D7) — best-effort: đọc `rt_v` nếu có → thu hồi, luôn clear `at_v`/`rt_v`. ✅ (auth.routes.ts + auth.controller.ts, try/catch best-effort)
2. `oauthCallback`: thêm `clearCookie(oauth_state)` trên nhánh thiếu `code`. ✅
3. OAuth linking: giữ link-by-email (D7) — comment tài liệu hoá ở `AuthService.upsertOAuthUser`. ✅

## Mô tả công việc
Endpoints theo contract mục 3 (đọc `docs/api-contract.md`):
1. **S1 GET /subjects** 🔓 — list môn publish + chapterCount (cache Redis 5 phút nếu tiện, không có Redis local thì skip cache được).
2. **S2 GET /subjects/:slug** 🔓 — chi tiết môn + chapters.
3. **S3 GET /subjects/:slug/chapters/:chapterId** — STUDENT, list lesson kèm `completed` theo user.
4. **S4 GET /lessons/:lessonId** — STUDENT: content Markdown + media + practiceSets (câu hỏi ẨN đáp án — dùng serialize không trả `answer`/`explanation`/`thinkingHints[1..]`).
5. **L1 POST /lessons/:lessonId/complete** — ghi UserLessonProgress + XP +10.
6. **L2 GET /lessons/up-next** — gợi ý bài tiếp theo theo lộ trình enrollment (đơn giản: bài chưa hoàn thành kế tiếp trong chương đang học).
7. **CRUD admin C1–C11** (TEACHER/ADMIN): subjects, chapters, lessons (DRAFT→PUBLISHED), practice-sets, questions, bulk import JSON. Phân quyền: requireRole(['TEACHER','ADMIN']).
8. Kiến trúc: controller → service → repository + interface, Zod validations, error envelope chuẩn. Seed script nhỏ (`prisma/seed.ts`): 2 môn mẫu (Toán, Tiếng Anh) mỗi môn 1 chương 2 bài + vài câu hỏi MCQ để test FE.

## Definition of Done
- [x] lint + test + build + prisma validate pass (11/11 test pass)
- [x] Câu hỏi trong bài KHÔNG leak đáp án (tests/unit/question-serializer.test.ts — 5 test)
- [x] Seed chạy được bằng lệnh riêng: `pnpm --filter @learning/api seed` (script `prisma/seed.ts`, idempotent; xem ghi chú môi trường bên dưới)
- [x] Route đăng ký trong routes/index.ts (contentRouter + adminRouter)

## Câu hỏi cho manager
1. **[Môi trường — không chặn code]** MySQL local (localhost:3306) và Docker daemon đều KHÔNG chạy trên máy dev → chưa chạy được `seed` thật. Script đã typecheck pass và idempotent; cần DB (TiDB/local) để chạy lần đầu. Đề xuất: manager chạy `pnpm --filter @learning/api seed` khi DB online.
2. **[Ghi chú contract]** Contract ghi S1 "list môn publish" nhưng `Subject` trong schema.prisma KHÔNG có trường publish/status → S1 đang trả TẤT CẢ môn (schema là nguồn chân lý). Nếu cần filter publish thì phải thêm field + migrate — chờ quyết định.
3. **[Ghi chú]** S3/S4/L1/L2 contract ghi role STUDENT → đang dùng `requireAuth` (mọi user đăng nhập, gồm TEACHER/ADMIN học được). Nếu reviewer muốn strict STUDENT-only thì đổi thành `requireRole(["STUDENT"])`.
4. **[Ghi chú phạm vi]** Đã sửa thêm `apps/api/tsconfig.json` (include `prisma/**/*.ts` để lint phủ seed) và `pnpm-lock.yaml` (thêm dep `ioredis` cho cache S1) — cùng nằm trong apps/api/lockfile của task, không đụng web/shared.

## Ghi chú của reviewer
(điền sau review)
