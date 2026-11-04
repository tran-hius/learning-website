# TASK-001-FR (Ngày 1): Khởi tạo nền móng UI + Typed API client

- **Agent thực thi:** frontend-developer
- **Phạm vi đường dẫn cho phép:** `src/app/**`, `src/components/**`, `src/lib/**`, `src/styles/**`
- **Task gốc từ kế hoạch:** Ngày 1 — Nền móng (UI shell + API client)
- **Trạng thái:** GIT_PUSH

## Câu hỏi cho manager
(không có blocker — mọi quyết định đều theo docs/ui-design-guide.md + api-contract.md; duy nhất 1 lựa chọn nội dung nhỏ: tên thương hiệu tạm trên logo là "HọcNè", manager/user có thể đổi nếu muốn.)

## Ghi chú của reviewer
- Kiến trúc thực tế là **monorepo pnpm**: frontend nằm ở `apps/web` (Next.js 15 App Router, TS, Tailwind v4), backend ở `apps/api`, types chung ở `packages/shared`. Đường dẫn trong task (`src/**`) hiểu là `apps/web/src/**` — khớp phạm vi cho phép.
- shadcn/ui: **không chạy CLI** (`npx shadcn init`) vì sẽ ghi đè globals.css/token Tailwind v4 @theme đã chuẩn hoá theo design guide; thay vào đó tự tạo 4 component tối giản theo cùng API (button/card/badge/progress, dùng `cn()` có sẵn + cva-style variants) trong `src/components/ui/`.
- Commit: `8ee1ca1` — `TASK-001-FR(frontend): ui shell + typed api client theo contract` (14 files, chỉ apps/web/src/**).
- Kiểm chứng: `pnpm --filter @learning/web lint` PASS, `pnpm --filter @learning/web build` PASS (6 routes prerender OK).

## Mô tả công việc
Xây UI shell ứng dụng và tầng typed API client dựa trên `docs/api-contract.md` (file kỹ thuật bạn được đọc).

## Yêu cầu đầu ra
1. **API client:** `src/lib/api/client.ts` (fetch wrapper: tự thêm Content-Type, error khung `{ success, data, error }`, interceptor auto-refresh) + `src/lib/api/auth.ts`, `subjects.ts`, `exams.ts`, `progress.ts`, `roadmaps.ts` — mỗi hàm khai type khớp contract.
2. **UI shell:** layout chính (sidebar môn học, header avatar, container) dùng shadcn/ui; trang `/` landing đơn giản; route `/subjects`, `/lessons/[slug]`, `/exams/[id]` (placeholder page).
3. **Design tokens:** màu chủ đạo + font, tối giản, tiếng Việt, responsive.
4. **Không gọi fetch trực tiếp trong components** — chỉ qua `src/lib/api/*`.

## Definition of Done
- [ ] `pnpm build` pass, `pnpm lint` pass
- [ ] Mọi response type khớp docs/api-contract.md (không any)
- [ ] Landing shell render được (screenshot bằng tay nếu có thể)

## Commit & Push
- 1 commit: `TASK-001-FR(frontend): ui shell + typed api client theo contract`
- Sau commit → push `origin main` (merge theo thứ tự, tránh conflict — nếu conflict với TASK-001 backend thì pull --rebase trước).

## Ghi chú của reviewer
(điền sau review)
