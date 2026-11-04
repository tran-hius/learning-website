# TASK-002-FR (Ngày 2): Auth UI + rebrand SynapseBrain + shared types

- **Agent thực thi:** frontend-developer
- **Phạm vi đường dẫn cho phép:** `apps/web/src/**`, `apps/web/package.json`
- **Task gốc từ kế hoạch:** Ngày 2 — Auth & User (phía UI)
- **Trạng thái:** DONE_PRIVATE

## Quyết định kỹ thuật người dùng đã chốt (áp dụng, KHÔNG hỏi lại)
- **D5:** Brand name = **"SynapseBrain"** — đổi logo ở Header.tsx + metadata title/description ở layout.tsx.
- **D6:** contract types đã chuyển vào `packages/shared` (backend làm trước bạn) → xóa các types trùng lặp trong `apps/web/src/lib/api/types.ts`, import từ `@learning/shared` (giữ lại file re-export `export * from "@learning/shared"` để không phải sửa từng nơi gọi).

## Điều kiện từ final-reviewer (phải làm trong task này)
1. Touch target ≥ 44px: button size `sm` (hiện 36px — sửa hoặc bỏ comment "≥44px" sai), chip môn học Header/Sidebar trên mobile.
2. Sửa comment `button.tsx` cho khớp thực tế.
3. Self-link `/subjects` placeholder: thêm trạng thái "sắp ra mắt" rõ ràng (disabled style) thay vì link chết lặp lại.

## Mô tả công việc
1. **Rebrand "SynapseBrain"** toàn bộ UI (Header logo, layout metadata, trang chủ greeting nếu có nhắc brand).
2. **Trang Auth:** `/login`, `/register` form đẹp theo design guide (card kem, bo tròn, nút primary coral, lỗi thân thiện tiếng Việt); nút "Đăng nhập bằng Google/GitHub" trỏ `/api/v1/auth/oauth/:provider`. Gọi qua `src/lib/api/auth.ts` (đã có, cập nhật nếu contract field khác).
3. **Trạng thái đăng nhập:** header hiển thị avatar/tên khi đã login (dùng GET /auth/me qua server component), nút đăng xuất (POST logout). Ẩn/hiện theo trạng thái — chưa cần route guard đầy đủ.
4. **Trang cá nhân tối giản** `/me`: tên, email, XP, streak (từ /auth/me), nút đổi mật khẩu form đơn giản.
5. Không fetch trực tiếp trong components (dùng lib/api); Server Components mặc định; "use client" chỉ cho form.

## Definition of Done
- [ ] `pnpm --filter @learning/web lint` + `build` pass
- [ ] Không còn duplicate types (types.ts chỉ re-export shared)
- [ ] Brand SynapseBrain hiện đúng mọi chỗ
- [ ] UI khớp design guide (kiểm section 6 checklist)

## Commit & Push
- 1 commit: `TASK-002-FR(web): auth ui + rebrand SynapseBrain + shared types import`
- pull --rebase rồi push; ghi hash + DONE_PRIVATE vào task file.

## Câu hỏi cho manager
- **XP ở /me:** task ghi "XP, streak (từ /auth/me)" nhưng contract A7 chỉ trả `user` + `stats{currentStreak, longestStreak}` (không có XP), và backend hiện chưa có route `/progress/*` (G1). Theo quy tắc "không đắp số liệu fake", trang /me hiển thị streak thật + trạng thái trống rõ ràng cho XP ("sẽ hiển thị khi endpoint tiến độ G1 được bật"). Đề xuất: khi backend làm G1, FE ghép `getProgressOverview()` vào /me (đã có sẵn `lib/api/progress.ts`).

## Ghi chú của reviewer
(điền sau review)
- Dev thực thi xong — DONE_PRIVATE, ngày 05/11/2026:
  - Commit: `9d10d23` — `TASK-002-FR(web): auth ui + rebrand SynapseBrain + shared types import` (đã push lên main, fast-forward không conflict)
  - `pnpm --filter @learning/web lint` + `build` PASS (9 routes, /login /register /me dynamic)
  - File tạo mới: `app/login/{page,login-form}.tsx`, `app/register/{page,register-form}.tsx`, `app/me/{page,change-password-form}.tsx`, `components/layout/LogoutButton.tsx`, `lib/api/auth.server.ts`
  - File sửa: `layout.tsx` (metadata SynapseBrain), `Header.tsx` (rebrand + trạng thái đăng nhập thật từ A7 qua server component), `Sidebar.tsx`/`page.tsx` (chip ≥44px), `button.tsx` (sm → min-h-44px + sửa comment), `subjects/page.tsx` (bỏ self-link → card disabled "sắp ra mắt"), `lib/api/types.ts` (chỉ còn re-export `@learning/shared`, -410 dòng duplicate), `lib/api/client.ts` (thêm `apiFetchServer` + forward cookie cho Server Component)
