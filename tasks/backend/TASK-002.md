# TASK-002 (Ngày 2): Auth & User — backend + shared types

- **Agent thực thi:** backend-developer
- **Phạm vi đường dẫn cho phép:** `apps/api/src/**`, `apps/api/prisma/**`, `packages/shared/src/**`, `apps/api/package.json`
- **Task gốc từ kế hoạch:** Ngày 2 — Auth & User
- **Trạng thái:** DONE (final-reviewer: APPROVED_WITH_CONDITIONS — 2 điều kiện bắt buộc đưa vào TASK-003: logout bỏ requireAuth + clearCookie oauth_state; backlog: rate limit, guard ADMIN self-ban, reuse detection, enum register)

## Điều kiện bắt buộc từ final-reviewer (phải làm trong task này)
1. `apps/api/src/config/app.ts`: bỏ `.default()` cho `AUTH_SECRET`, `DATABASE_URL`, `REDIS_URL`; chỉ cho phép default khi `NODE_ENV !== "production"`; production thiếu biến hoặc AUTH_SECRET còn giá trị dev → throw ngay lúc startup.
2. Kỷ luật commit: chỉ commit file phạm vi của mình, message khớp diff, format `TASK-002(api): ...`.

## Quyết định kỹ thuật người dùng đã chốt (áp dụng, KHÔNG hỏi lại)
- **D6:** contract types chuyển vào `packages/shared/src` — web và api cùng import từ đó. Bạn là người thực hiện chuyển (API là nguồn của contract).

## Mô tả công việc
1. **Shared types (D6):** chuyển toàn bộ contract types từ `apps/web/src/lib/api/types.ts` vào `packages/shared/src` (tổ chức: `index.ts` re-export từ `types/api.ts`, `types/entities.ts`...). Export đầy đủ: ApiResponse, Pagination, Paginated, Role, User, Subject, Chapter, LessonBrief, QuestionPayload..., cập nhật `packages/shared/package.json` exports. KHÔNG sửa `apps/web/**` (frontend sẽ tự đổi import trong task riêng).
2. **Auth theo contract mục 2:** register (email+password bcrypt ≥8 ký tự, name), login (kiểm tra + phát JWT), refresh (cookie httpOnly xoay vòng `rt_v` → access `at_v` 15 phút), logout (thu hồi refresh), GET /auth/me (user + streak stats). Google/GitHub OAuth: cài khung route `/auth/oauth/:provider` + `/auth/callback/:provider` (thư viện: dùng **arctic** + cookie state CSRF; nếu thấy rủi ro/khả năng không hoàn thành thì BLOCKED + hỏi, đừng tự đổi sang thư viện khác).
3. **User endpoints theo contract:** PATCH /users/me, PATCH /users/me/password, GET /users (ADMIN, phân trang + filter), PATCH /users/:id/role, PATCH /users/:id/status. User BANNED → mọi endpoint auth-guard trả FORBIDDEN.
4. **Kiến trúc phân tầng đúng luật:** controllers (Express) → services (business logic + hash/JWT) → repositories (Prisma) + interfaces. JWT sign/verify đặt `utils/jwt.ts`; hash `utils/password.ts`. Middleware `auth.ts` gắn `req.auth` từ access token; RBAC dùng lại `requireRole`.
5. **Validations:** Zod schemas register/login/refresh/change-password/update-role cập nhật `validations/`.
6. Prisma migrate nếu cần (DB chưa có thật → chỉ cần `prisma validate` + `generate` pass).

## Definition of Done
- [ ] `pnpm --filter @learning/api lint` + `test` + `build` pass; `prisma validate` pass
- [ ] Shared types build được khi import từ api (typecheck)
- [ ] Guard production env hoạt động (viết 1 unit test cho config nếu làm được không cần mạng)
- [ ] Các route auth/user đăng ký trong `routes/index.ts`, error envelope đúng contract

## Commit & Push
- 1 commit: `TASK-002(api): auth+user endpoints, jwt/bcrypt, shared contract types, env guard`
- push origin main (pull --rebase trước nếu cần); ghi hash + trạng thái DONE_PRIVATE vào task file.

## Câu hỏi cho manager
(không BLOCKED — mọi quyết định kỹ thuật dùng theo task file + contract mục 12: D6 shared types, arctic, bcryptjs, jsonwebtoken)

## Ghi chú của reviewer
(điền sau review)
- Commit: `1c2ae17` — TASK-002(api): auth+user endpoints, jwt/bcrypt, shared contract types, env guard

## Ghi chú thực thi của dev
- Files chính: `packages/shared/src/types/{api,entities}.ts` + `index.ts`; `apps/api/src/{config/app.ts, utils/{jwt,password,async-handler}.ts, middlewares/auth.ts, services/{auth,user}.service.ts, repositories/{user,refresh-token}.repository.ts, controllers/{auth,user}.controller.ts, routes/{auth,user}.routes.ts, validations/*}`; `apps/api/prisma/schema.prisma` (+ model RefreshToken); `apps/api/tests/unit/config.test.ts`.
- OAuth: arctic v3 — Google dùng PKCE bắt buộc (codeVerifier lưu trong cookie state tạm); env trống → trả lỗi rõ ràng (503, `INTERNAL`).
- Refresh token: opaque random, lưu SHA-256 hash DB (model RefreshToken), xoay vòng khi /auth/refresh, thu hồi khi logout/đổi mật khẩu.
- Cookies: `at_v` 15 phút, `rt_v` 30 ngày, httpOnly/sameSite=lax/secure=production.
