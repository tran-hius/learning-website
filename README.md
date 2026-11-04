# SynapseBrain 🧠

Nền tảng học tập: bài giảng, thực hành (quiz/listen/speak/code), thi thử + proctoring,
lộ trình nghề nghiệp, streak/XP/Pomodoro.

Monorepo pnpm:

| Thư mục | Nội dung |
|---|---|
| `apps/web` | Frontend Next.js (deploy Vercel) |
| `apps/api` | Backend Express + TypeScript + Prisma/MySQL |
| `packages/shared` | Contract types dùng chung (`@learning/shared` — quyết định D6) |

## Chạy local

```bash
pnpm install
cp .env.example .env          # demo mode: có thể để mặc định, không cần DB thật
pnpm prisma:generate
pnpm dev                      # web :3000 + api :4000
```

- Không có DB/Redis? API vẫn chạy ở **demo mode** (D13) — cache/session mirror bị bỏ qua best-effort.
- Seed dữ liệu mẫu: `pnpm --filter @learning/api seed`.
- Kiểm tra: `pnpm lint` · `pnpm test` · `pnpm build` · `pnpm prisma:validate`.

> `build` (tsup/next) **không cần DB** — chỉ cần `prisma generate` (schema, không connect).

## Deploy (rút gọn)

Kiến trúc: **web trên Vercel · API tự host (VPS/Docker) · TiDB Cloud (MySQL) · Upstash Redis · Cloudinary · Piston self-host.**

1. **Database — TiDB Cloud Serverless (MySQL)**
   - Tạo cluster → lấy connection string → điền `DATABASE_URL`.
   - Chạy migrate: `pnpm --filter @learning/api prisma migrate deploy` (+ `seed` nếu cần).
2. **Redis — Upstash**
   - Tạo Redis database → `REDIS_URL=rediss://...`.
   - Dùng cho: rate limit, cache, mirror đề thi `exam:session:{id}`.
3. **API — host riêng (VPS/Render/Fly)**
   - Đặt env theo `.env.example` (production: `DATABASE_URL`, `REDIS_URL`, `AUTH_SECRET` bắt buộc).
   - `pnpm --filter @learning/api build` → `node apps/api/dist/server.js` (set `NODE_ENV=production`, `CORS_ORIGIN` = domain web, `API_BASE_URL` = domain API).
4. **Web — Vercel**
   - Import repo, root directory `apps/web`, env `API_PROXY_TARGET=https://<api-domain>` (hoặc URL API công khai của bạn).
5. **Media — Cloudinary**
   - Điền `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` (upload avatar/media).
6. **OAuth (tuỳ chọn)** — `GOOGLE_*` / `GITHUB_*`; redirect URI = `<API_BASE_URL>/api/v1/auth/oauth/<provider>/callback`.
7. **Piston — self-host bằng Docker** (khuyến nghị khi production, public API có giới hạn)
   ```bash
   docker run -d --name piston-api --restart always \
     -p 2000:2000 ghcr.io/engineer-man/piston
   # rồi trỏ: PISTON_URL=http://<host-api>:2000/api/v2/execute
   ```

Sau deploy: health check `GET /api/v1/health`, smoke test đăng nhập + 1 lesson + 1 exam.

## Contract & workflow

- **API contract:** `docs/api-contract.md` (v1.1) — nguồn chân lý kiểu dữ liệu là `packages/shared/src` (D6). FE và BE cùng import `@learning/shared`, không định nghĩa type trùng.
- **Quy trình team:** xem `AGENTS.md`; task files tại `tasks/**`.
