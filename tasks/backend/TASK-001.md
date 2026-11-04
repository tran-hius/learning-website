# TASK-001 (Ngày 1): Khởi tạo nền móng dự án Backend

- **Agent thực thi:** backend-developer
- **Phạm vi đường dẫn cho phép:** `src/server/**`, `prisma/**`, root config (`package.json`, `tsconfig.json`, `.env.example`, `next.config.ts`, `eslint.config.mjs`, `vitest.config.ts`, `src/lib/db.ts`)
- **Task gốc từ kế hoạch:** Ngày 1 — Nền móng (config, schema DB, logger, error handler)
- **Trạng thái:** DONE (APPROVED by final-reviewer, commit d5d96c6 trở đi; điều kiện bắt buộc chuyển vào TASK-002)

## Mô tả công việc
Khoi tao Next.js + TypeScript project trong repo này (nếu chưa có) với Tailwind + ESLint, va cau hinh cac thanhphan backend sau.

## Yêu cầu đầu ra
1. **Project base:** Next.js (App Router) + TypeScript + Tailwind + shadcn/ui init, package manager **pnpm**.
2. **Prisma + MySQL:** `prisma/schema.prisma` với các model: `User`, `Subject`, `Chapter`, `Lesson`, `PracticeSet`, `QuestionItem`, `ExamBank`, `ExamSession`, `ExamAnswer`, `Roadmap`, `Milestone`, `RoadmapEnrollment`, `Badge`, `UserBadge`, `UserLessonProgress`, `ExamResult`. Dùng MySQL provider. .env.example chứa `DATABASE_URL`, `REDIS_URL`, `CLOUDINARY_*`, `AUTH_SECRET`, `VITE...` (đếm đủ biến dùng).
3. **Cấu trúc phân tầng** `src/server/{config,controllers,services,repositories,interfaces,entities,types,middlewares,validations,utils}` — mỗi thư mục có file `index.ts` and placeholder + repo interface mẫu `IUserRepository`.
4. **Config:** `config/app.ts` đọc env bằng Zod (validate sớm, fail nhanh nếu thiếu biến).
5. **Logger:** `utils/logger.ts` dùng pino; **Error handler** middleware chuẩn `{ success, data, error: { code, message } }` đúng docs/api-contract.md.
6. **Response helper:** `utils/response.ts` với `ok(data)` / `fail(code, message, status)`.
7. **Health check endpoint:** `src/app/api/health/route.ts` trả `{ success: true, data: { status: "ok" } }`.

## Definition of Done
- [ ] `pnpm build` pass (không lỗi TS)
- [ ] `pnpm lint` pass và postgres gateway muộn
- [ ] Prisma schema validate được (`npx prisma validate` không cần connection)
- [ ] `/api/health` GET trả đúng khung response

## Commit & Push
- 1 commit: `TASK-001(backend): project scaffold, prisma schema, server layering, health check`
- Sau commit → `git push origin main` → ghi hash vào task file này.

## Ghi chú của reviewer
Commit hash: `3e3852be9b6ace9d4ec45cb4b8355998b2fa39cc` (pushed origin/main)

Kiểm chứng đã chạy: `pnpm prisma validate` ✅ · `pnpm prisma generate` ✅ · `pnpm lint` ✅ (0 error/warning) · `pnpm build` ✅ (route /api/health có mặt) · `pnpm test` ✅ (4 tests passed — response helper).
Ghi chú: Prisma CLI chỉ đọc `.env`, nên ở máy dev cần copy `.env.local` → `.env` (không commit). `pnpm approve-builds` đã allow @prisma/esbuild build scripts.
