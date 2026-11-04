# 📚 KẾ HOẠCH DỰ ÁN: Website Học Tập (E-Learning Platform)

> **Phiên bản:** 2.0 (đã cập nhật theo phản hồi)
> **Ngày cập nhật:** 05/11/2026
> **Đối tượng:** Học sinh (THPT/Sinh viên)

---

## 1. TỔNG QUAN

### 1.1 Mục tiêu
Nền tảng học trực tuyến cho học sinh, đa môn:
- **Toán**
- **Tiếng Anh** (đầy đủ NGHE – NÓI – ĐỌC – VIẾT)
- **Lập trình Python**
- **Môn đại cương** *(mới)*: Triết học, Toán cao cấp (Lý thuyết tập hợp – Giới hạn – Vi phân…), **Vật lý đại cương**, **Tiếng Anh giao tiếp** — có thể mở rộng thêm (Kinh tế vi mô, Lập trình C…) theo nhu cầu.

Điểm khác biệt: **dạy tư duy** trong quá trình học + **lộ trình nghề nghiệp** cá nhân hóa + bài thi thi thử chấm điểm + theo dõi tiến độ.

### 1.2 Định hướng sản phẩm
- **Chỉ dùng câu hỏi TRẮC NGHIỆM** (bao gồm: MCQ 1 đáp án, nhiều đáp án, điền đáp án, điền từ, ghép cặp, nghe–chọn đáp án, đọc đoạn văn–trả lời).
- Nội dung bài học: **text (Markdown/LaTeX) + hình ảnh**. Video & audio chỉ có ở **Tiếng Anh** (nghe) và **Nói** (micro).
- Deploy **Vercel (free tier)** — không cần VPS ở giai đoạn này.
- Thời gian xây dựng MVP: **1 tuần**.

---

## 2. CHỨC NĂNG CHI TIẾT

### 2.1 Xác thực & Phân quyền 👤
| Chức năng | Ghi chú |
|---|---|
| Đăng nhập qua **OAuth (Google, GitHub)** | Google chính, GitHub phục vụ lộ trình lập trình |
| Đăng ký bằng email/mật khẩu | bcrypt |
| JWT (Access + Refresh Token) | httpOnly cookie, refresh xoay vòng |
| Phân quyền theo vai trò | `STUDENT`, `TEACHER` (soạn nội dung), `ADMIN` |
| Trang cá nhân | avatar, thông tin, đổi mật khẩu |

> 💡 Dùng `better-auth` + `arctic` (OAuth) để không phải tự viết auth từ đầu — vừa nhanh vừa an toàn.

### 2.2 Nội dung học tập 📖
Cấu trúc: **Môn → Chương → Bài học**
- Trình bày: Markdown + **LaTeX (bắt buộc cho Toán & Toán cao cấp)**, hình ảnh (từ MinIO/S3 hoặc URL).
- **Thực hành:**
  - Toán/Toán cao cấp: bài tập trắc nghiệm có gợi ý và đáp án giải chi tiết.
  - Tiếng Anh:
    - **Nghe:** audio player + câu hỏi trắc nghiệm theo audio. **Điều chỉnh được tốc độ phát (0.5x → 2x)** — phục vụ luyện nghe của học sinh, phù hợp từng trình độ. Cả tốc độ gốc.
    - **Nói:** ghi âm qua micro → (MVP: tự so sánh với audio mẫu + tự đánh giá / Phase sau: chấm phát âm bằng Speech API).
    - **Đọc:** đoạn văn + trắc nghiệm reading comprehension.
    - **Viết:** điền từ, ghép cặp, sắp xếp câu (dạng trắc nghiệm hóa).
  - Python: code editor chạy trên trình duyệt (**Piston API**, free).
- Đánh dấu bài yêu thích, ghi chú cá nhân.

### 2.3 Bài thi & Thi thử 📝 (trắc nghiệm)
- Ngân hàng câu hỏi trắc nghiệm theo loại & độ khó (Dễ / Trung bình / Khó).
- Thi thử có **đồng hồ đếm thời gian**, state làm bài lưu **Redis** (không sợ reload mất bài).
- **Chấm tự động** hoàn toàn vì chỉ có trắc nghiệm → hiển thị đúng/sai + giải thích chi tiết.
- Lịch sử thi, thi lại nhiều lần, đề ngẫu nhiên.

### 2.4 Đánh giá tiến độ 📊
- Dashboard: % hoàn thành, điểm trung bình, biểu đồ tiến triển (theo môn/chủ đề).
- Nhận diện **điểm yếu** (chủ đề nào tỉ lệ sai cao) → gợi ý ôn tập.
- **Streak** (chuỗi ngày học liên tục) + huy hiệu (badges) tăng động lực.
- Admin/Teacher báo cáo: học sinh hoạt động thế nào, đề nào khó nhất.

### 2.5 Dạy tư duy (Thinking Skills) 🧠
- Mỗi bài có mục "**Cách tư duy**": phân tích đề → chọn hướng giải → kiểm tra kết quả.
- **Gợi ý theo bậc** (scaffold): gợi ý 1 → gợi ý 2 → đáp án; điểm "tự làm được không cần gợi ý".
- **Spaced repetition** (như SM-2/Anki): tự nhắc ôn lại kiến thức theo mức ghi nhớ.
- Sau mỗi bài có câu hỏi meta-cognitive: "bạn giải theo hướng nào, vì sao sai?".

### 2.6 Lộ trình nghề nghiệp (Career Roadmap) 🛤️
- Các lộ trình dạng tree: `Backend Developer`, `Frontend Developer`, `Data Scientist`, *(có thể mở rộng: AI Engineer, Fullstack...)*.
- Milestone → liên kết bài học/bài thi tương ứng.
- **Placement test** (kiểm tra đầu vào) → gợi lộ trình phù hợp.
- % tiến độ lộ trình, gợi ý "bước tiếp theo bạn nên học gì".

### 2.7 Quản trị (Admin/Teacher) ⚙️
- CRUD Môn → Chương → Bài học, ngân hàng câu hỏi trắc nghiệm.
- Upload hình (image) và audio (cho Tiếng Anh nghe).
- Quản lý user, vai trò.
- Quản lý lộ trình nghề nghiệp.
- Báo cáo thống kê.

---

## 3. KIẾN TRÚC & CÔNG NGHỆ (điều chỉnh cho Vercel)

### 3.1 Stack công nghệ
| Thành phần | Công nghệ |
|---|---|
| Frontend + API | **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui** |
| Backend Logic | Kiến trúc phân tầng **đặt trong `src/server/` của Next.js** (Route Handlers gọi Service/Repository) |
| Database | **MySQL (serverless)**: TiDB Cloud Serverless (free tier, tương thích MySQL) hoặc Aiven MySQL free |
| Cache/Session/Thi thử state | **Upstash Redis (free tier - serverless, chuẩn cho Vercel)** |
| ORM | **Prisma** |
| Auth | better-auth + OAuth Google/GitHub |
| Code Python | **Piston API (free public)** |
| Storage | **Cloudinary** (hình + audio, có free tier, không cần VPS) |
| Deploy | **Vercel** |
| CI/CD | Vercel auto-deploy từ GitHub, GitHub Actions chạy lint+test+build |
| Monitoring | Vercel Analytics + pino logs |

> 💡 **Lý do gộp Next.js fullstack thay vì Node.js API tách riêng:** Vercel free chỉ phù hợp serverless; tách 1 backend Node.js riêng sẽ cần VPS/Railway (tốn phí). Kiến trúc phân tầng vẫn giữ nguyên, chỉ là nằm trong cùng 1 repo Next.js. Nếu sau này cần scale, có thể tách ra sau.

### 3.2 Kiến trúc Backend phân tầng (giữ nguyên theo yêu cầu)
```
src/server/
├── config/           # env validation (Zod)
├── controllers/      # Route Handlers, chỉ nhận/reply
├── services/         # business logic
├── repositories/     # truy vấn DB (Prisma), đóng gói SQL
├── interfaces/       # interface contracts (IRepository, IService...)
├── entities/         # entity/DTO mapping DB
├── types/            # type chung
├── middlewares/      # auth, error handler, rate limit, RBAC
├── validations/      # Zod schemas request
├── utils/            # helpers (date, crypto, logger...)
└── tests/            # unit + integration tests
```
**Nguyên tắc:** Controller → Service → Repository, Dependency Injection qua interface, Service không biết HTTP, Repository không biết business.

### 3.3 Kiến trúc tổng thể
```
[Next.js Fullstack (Vercel)]
   ├── /app (Frontend React)
   ├── /api (Route Handlers = Controllers)
   └── /src/server (Services → Repositories)
         ├── TiDB MySQL (dữ liệu)
         ├── Upstash Redis (cache/session/thi thử)
         ├── Cloudinary (hình + audio)
         └── Piston API (Python sandbox)
```

---

## 4. LỘ TRÌNH 1 TUẦN (⚡ đánh đổi: chỉ MVP lõi)

### 📅 Ngày 1 — Nền móng
- Init monorepo: `apps/web` (Next.js + TypeScript + Tailwind + shadcn)
- Setup cấu trúc phân tầng server, config, logger, error handler
- TiDB MySQL (serverless) + Prisma + **schema DB hoàn chỉnh** (môn/chương/bài/câu hỏi/kết quả/user/roadmap)
- Upstash Redis config
- GitHub repo + Vercel auto-deploy (deploy "hello world" ngay hôm nay để xác nhận pipeline hoạt động)

### 📅 Ngày 2 — Auth & User
- OAuth Google + GitHub (better-auth), email/password
- JWT session + RBAC middleware
- Trang đăng nhập/đăng ký + trang cá nhân

### 📅 Ngày 3 — Môn học & Bài học
- CRUD Môn → Chương → Bài học (API + trang admin đơn giản)
- Trang danh sách môn, chương, trang bài học (Markdown + LaTeX render)
- Upload hình qua Cloudinary

### 📅 Ngày 4 — Thực hành + Tiếng Anh đặc thù
- Audio player (nghe) + Micro ghi âm (nói) 
- Code editor Python (Piston API)
- Trắc nghiệm/điền từ/ghép cặp trong bài học

### 📅 Ngày 5 — Thi & thi thử
- Ngân hàng câu hỏi, đề thi, thi thử có timer
- State làm bài lưu Redis, chấm tự động, giải thích đáp án
- Lịch sử thi

### 📅 Ngày 6 — Tiến độ + Lộ trình
- Dashboard tiến độ (% hoàn thành, biểu đồ, điểm yếu)
- Streak + badge
- Lộ trình (Backend / Frontend / Data Scientist) dạng tree + % tiến độ + placement test

### 📅 Ngày 7 — Hoàn thiện & ship
- Honest caching (Redis), rate limit, security check
- Dockerfile (chuẩn bị cho tương lai), GitHub Actions CI
- Test E2E luồng chính, sửa bug, polish UI
- **Deploy Vercel production** 🚀

---

### 🚀 Phase 2 — Bắt đầu ngay sau khi Phase 1 xong (tuần kế tiếp)
Nội dung Phase 2 (ưu tiên theo thứ tự):
1. **Chấm phát âm bằng Speech AI** (Whisper hoặc Azure Speech) — chấm điểm từng từ cho Tiếng Anh giao tiếp
2. **Dạy tư duy đầy đủ** cho mọi bài học (mục "Cách tư duy" + gợi ý theo bậc + meta-cognitive)
3. **Spaced repetition SM-2** — nhắc ôn theo mức ghi nhớ
4. Notification real-time (SSE/WebSocket) + tìm kiếm + i18n
5. Dashboard admin nâng cao, load testing, streak/badge nâng cao
6. Tiến dần về Docker + VPS khi có ngân sách (chuẩn bị cho scale)

## 5. BỔ SUNG Ý KIẾN CỦA MÌNH 💡

1. **TiDB Cloud Serverless (MySQL) + Vercel free tier là combo chuẩn** — TiDB tương thích MySQL 100%, có free tier, hoạt động tốt với Prisma. Upstash + Cloudinary cũng có free tier hùng hậu. Đừng tự host Postgres/Redis trên Vercel (không hỗ trợ).
2. **Chỉ trắc nghiệm → đơn giản hóa DB & scoring đáng kể**, tiết kiệm được ~30% effort so với bản kế hoạch cũ. 👍
3. **Tiếng Anh NGHE–NÓI** cần audio hosting: dùng Cloudinary (API đơn giản, free 25GB bandwidth/tháng).
4. **Tiếng Anh NÓI có tính năng chấm phát âm thật** cần tích hợp Speech API (azure speech, whisper...) — nên để Phase 2 vì tốn setup. MVP = ghi âm + so audio mẫu.
5. **Đề xuất lộ trình nghề nghiệp nên có thêm `Frontend Developer`** vì học sinh dễ tiếp cận và liên hệ trực tiếp với 3 môn nền tảng (Toán + Tiếng Anh + Python).
6. **TiDB Serverless free tier có sleep sau idle** — lần truy cập phải chờ ~300ms–1s. OK cho MVP.
7. **Chuẩn bị Dockerfile ngay từ ngày 1 (quy trình cho tương lai)** mà chưa cần docker-compose chạy local (vì dùng cloud serverless). Khi mua VPS sau sẽ dễ nâng cấp.

---

## 6. TASKS CẦN DUYỆT ❓

1. [x] Chỉ trắc nghiệm → **đã cập nhật**
2. [x] Text + hình ảnh (audio/video chỉ cho tiếng Anh) → **đã cập nhật**
3. [x] Thêm môn **Triết học, Toán cao cấp** (đại cương) → **đã cập nhật**
4. [x] Deploy **Vercel** → **đã cập nhật (Next.js fullstack + TiDB MySQL + Upstash + Cloudinary)**
5. [x] Rút xuống **1 tuần** → **đã cập nhật, và mình đã cắt Phase 2 cho phù hợp** (xem mục 4)
6. [x] Môn đại cương ban đầu: **Triết học + Toán cao cấp + Vật lý đại cương + Tiếng Anh giao tiếp** → **đã cập nhật**
7. [x] Thêm lộ trình **Frontend Developer** → **đã cập nhật** (mặc định hoàn chỉnh: Backend + Frontend + Data Scientist)
8. [x] Chấm phát âm (Nói) — **làm tại Phase 2** (nếu Phase 1 tuần này xong sớm thì bắt Phase 2 ngay):
   - Phase 1 (MVP tuần này): ghi âm + so sánh audio mẫu + tự đánh giá
   - Phase 2: chấm phát âm bằng Speech AI (Whisper/Azure Speech) — chấm điểm từng từ

---

**⏳ Chờ bạn duyệt:** Phản hồi OK để bắt đầu **Ngày 1** (init monorepo + schema DB + CI/CD Vercel), hoặc chỉnh sửa mục nào đó.
