# 📡 API CONTRACT — Website Học Tập

> **Phiên bản 1.0** — Bản hợp đồng bắt buộc cho `backend-developer` & `frontend-developer`.
> Cache-Control mặc định: `no-store` cho mọi endpoint có dữ liệu user.
> Tất cả response JSON: `{ "success": boolean, "data": T | null, "error": { "code": string, "message": string, "details"?: unknown } | null }`
> Mọi list response bọc phân trang: `{ "items": T[], "pagination": { "page": number, "limit": number, "total": number, "totalPages": number } }`

---

## 1. QUY ƯỚC CHUNG

### 1.1 Base URL & Prefix
- Base: `/api/v1`
- Content-Type: `application/json` (upload: `multipart/form-data`)

### 1.2 Mã lỗi chuẩn (error.code)
| code | HTTP | Ý nghĩa |
|---|---|---|
| `AUTH_REQUIRED` | 401 | Chưa đăng nhập/token hết hạn |
| `AUTH_INVALID` | 401 | Token sai |
| `FORBIDDEN` | 403 | Đúng user, sai quyền (RBAC) |
| `NOT_FOUND` | 404 | Resource không tồn tại |
| `VALIDATION_ERROR` | 422 | Body/query sai schema (kèm `details` của Zod) |
| `EXAM_STATE_CONFLICT` | 409 | Thi đang diễn ra nhưng gọi trái luồng |
| `RATE_LIMITED` | 429 | Chạm rate limit (headers: `X-RateLimit-Remaining`) |
| `INTERNAL` | 500 | Lỗi server (không lộ stack) |

### 1.3 Auth
- Access token trong cookie `httpOnly: at_v` (15 phút), refresh token `rt_v` (30 ngày, xoay vòng).
- Frontend KHÔNG đụng token trực tiếp — gọi API, backend tự đọc cookie.
- Header role: server resolve từ JWT. Vai trò: `STUDENT` | `TEACHER` | `ADMIN`.
- Endpoint có chữ 🔓 = public (không cần đăng nhập).

### 1.4 Phân trang
- Query: `?page=1&limit=20` (limit max 50). Mặc định limit 20.

---

## 2. AUTH & USER 🔐

| # | Method | Path | Vai trò | Mô tả |
|---|---|---|---|---|
| A1 | POST | `/auth/register` | 🔓 | Đăng ký email/mật khẩu |
| A2 | POST | `/auth/login` | 🔓 | Đăng nhập email/mật khẩu |
| A3 | GET | `/auth/oauth/:provider` | 🔓 | Redirect ra OAuth (`provider`: `google` \| `github`), query `callbackUrl` |
| A4 | GET | `/auth/callback/:provider` | 🔓 | Callback OAuth (component dùng, không gọi trực tiếp) |
| A5 | POST | `/auth/refresh` | 🔓 | Đổi access token bằng refresh cookie |
| A6 | POST | `/auth/logout` | any | Xoá cookie, thu hồi refresh |
| A7 | GET | `/auth/me` | any | Thông tin user hiện tại |

**A1 Request:** `{ "email": "a@b.com", "password": "at_least_8", "name": "Nguyen Van A" }`
**A1 Response:** `{ "user": { "id": "usr_xxx", "email", "name", "role": "STUDENT", "avatarUrl": null } }`
**A7 Response:** `{ "user": {...}, "stats": { "currentStreak": 5, "longestStreak": 12 } }`

| # | Method | Path | Vai trò | Mô tả |
|---|---|---|---|---|
| U1 | PATCH | `/users/me` | any | Cập nhật profile `{ name?, avatarUrl?, preferences? }` |
| U2 | PATCH | `/users/me/password` | any | `{ currentPassword, newPassword }` |
| U3 | GET | `/users` | ADMIN | List user (phân trang + filter `?role=&q=`) |
| U4 | PATCH | `/users/:id/role` | ADMIN | `{ role: "STUDENT"\|"TEACHER"\|"ADMIN" }` |
| U5 | PATCH | `/users/:id/status` | ADMIN | `{ status: "ACTIVE"\|"BANNED" }` |

**Quy tắc:** mật khẩu ≥ 8 ký tự, bcrypt cost 10. User BANNED → mọi endpoint trả `FORBIDDEN`.

---

## 3. NỘI DUNG HỌC TẬP 📖

### 3.1 Entities khái niệm
```
Subject (môn) -Example: Toán, Tiếng Anh... { id, slug, name, icon, color, order, description }
Chapter (chương) [subject_id] { id, subjectId, title, order }
Lesson (bài học) [chapter_id] { id, chapterId, slug, title, content (Markdown+LaTeX), media: MediaAsset[], estimatedMinutes, thinkingSection (Markdown: mục "Cách tư duy"), order, status: DRAFT|PUBLISHED
PracticeSet (bộ câu hỏi gắn trong bài) [lesson_id] { id, lessonId, mode: LISTENING|SPEAKING|READING|WRITING|CODING|QUIZ, payload (JSON theo loại), order }
QuestionItem (câu hỏi trắc nghiệm) [practiceSet_id | examBank] {
  id, type: MCQ_SINGLE|MCQ_MULTI|FILL_ANSWER|MATCH_PAIRS|LISTEN_MCQ,
  difficulty: EASY|MEDIUM|HARD,
  stem (Markdown), media?: { imageUrls: string[], audioUrl?: string, audioScripts?: string[] }
  options: [{ id: "opt_x", content, extra }]   // matchPairs có left/right
  answer: { correctOptionIds?, correctText?, pairs?: [{left,right}] }  // chỉ dùng nội bộ khi chấm, không trả client khi làm bài
  explanation (Markdown), thinkingHints: [hint1, hint2] (gợi ý theo bậc 1→2), hintAnswerRef: string
}
```

### 3.2 Endpoints — đọc nội dung học
| # | Method | Path | Vai trò | Mô tả |
|---|---|---|---|---|
| S1 | GET | `/subjects` | 🔓 | List môn publish `{ items: [{id, slug, name, icon, color, chapterCount}] }` |
| S2 | GET | `/subjects/:slug` | 🔓 | Chi tiết môn + chapters (chỉ title/order) |
| S3 | GET | `/subjects/:slug/chapters/:chapterId` | STUDENT | Chi tiết chương + list lesson `{ items: [{id, slug, title, estimatedMinutes, completed: boolean}] }` |
| S4 | GET | `/lessons/:lessonId` | STUDENT | Nội dung bài học + practiceSets (câu hỏi ĐÃ ẩn đáp án) |
| L1 | POST | `/lessons/:lessonId/complete` | STUDENT | Đánh dấu hoàn thành `{}` → `{ completedAt }` |
| L2 | GET | `/lessons/up-next` | STUDENT | Gợi ý bài tiếp theo theo lộ trình `{ lesson?: LessonBrief, roadmap?: { id, title } }` |

**Quy tắc đáp án (BẮT BUỘC):** khi serialize QuestionItem cho client *khi làm bài*, field `answer` + `explanation` + `thinkingHints[1..]` phải bị **bỏ** (chỉ trả type, stem, options, media). Đáp án chỉ về sau khi submit hoặc trong `POST /exams/:id/submit` response.

### 3.3 CRUD nội dung (TEACHER/ADMIN)
| # | Method | Path | Mô tả |
|---|---|---|---|
| C1 | POST | `/admin/subjects` | Tạo môn |
| C2 | PATCH | `/admin/subjects/:id` | Sửa môn |
| C3 | POST | `/admin/subjects/:id/chapters` | Tạo chương |
| C4 | PATCH | `/admin/chapters/:id` | Sửa/chỉnh order chương |
| C5 | POST | `/admin/chapters/:id/lessons` | Tạo bài |
| C6 | PATCH | `/admin/lessons/:id` | Sửa bài (content, status DRAFT→PUBLISHED) |
| C7 | POST | `/admin/lessons/:id/practice-sets` | Tạo bộ thực hành (kèm câu hỏi) |
| C8 | PATCH | `/admin/practice-sets/:id` | Sửa bộ thực hành |
| C9 | POST | `/admin/questions` | Tạo câu hỏi (đáp án hợp lệ, trả `id`) |
| C10 | PATCH | `/admin/questions/:id` | Sửa câu hỏi |
| C11 | POST | `/admin/questions/bulk` | Import JSON mảng câu hỏi `{ items: QuestionItem[] }` → `{ created: number, errors: [{index, message}] }` |
| C12 | POST | `/admin/media` (multipart) | Upload hình/audio lên Cloudinary `{ "media": { "url", "type": "IMAGE"\|"AUDIO", "bytes": number, "durationSec"?: number } }` — giới hạn 20MB, IMAGE: jpg/png/webp; AUDIO: mp3/m4a/wav |

---

## 4. THỰC HÀNH & PYTHON 🐍

| # | Method | Path | Vai trò | Body | Mô tả |
|---|---|---|---|---|---|
| P1 | POST | `/practice/:setId/attempt` | STUDENT | `{ answers: [{ questionId, value }] }` (value: string | string[] | pair[] `{leftId, rightId}`) | Nộp kết quả practice, server chấm → response từng câu `{ questionId, isCorrect, correctAnswer, explanation, thinkingHints }` + `{ xpEarned, accuracy }` |
| P2 | POST | `/practice/hints/:questionId` | STUDENT | `{ level: 1 \| 2 }` | Bỏ gợi ý theo bậc → `{ hint }` (log để tính "self-solved") |
| P3 | POST | `/python/exec` | STUDENT | `{ code: string, stdin?: string }` (max 10_000 chars) | Đệp Piston API → `{ stdout, stderr, exitCode, timeMs }` (rate limit: 10 req/phút/user) |

**Lưu ý P1:** practice attempt là *không giới hạn*: không tạo exam session, chấm xong trả đáp án ngay.

---

## 5. THI & THI THỬ 📝

| # | Method | Path | Vai trò | Mô tả |
|---|---|---|---|---|
| E1 | POST | `/exams` | STUDENT | Bắt đầu thi: `{ examBankId, kind: "PRACTICE_TEST"\|"PLACEMENT_TEST", subjectSlug? }` (placement để không bắt buộc bank) → `{ session: { id, durationSec, totalQuestions, startedAt, expiresAt } }` — state lưu Redis key `exam:session:{id}` TTL = duration+60s |
| E2 | GET | `/exams/:sessionId/questions` | STUDENT | Lấy đề (đã random, ẩn đáp án): `{ items: [...], progress: [{questionId, value}] }` — **v1.1:** trả kèm progress đã autosave để FE khôi phục grid sau reload |
| E3 | PATCH | `/exams/:sessionId/progress` | STUDENT | Lưu tạm câu trả lời `{ progress: [{questionId, value}] }` (autosave, kháng reload) |
| E4 | POST | `/exams/:sessionId/submit` | STUDENT | `{ answers: [{questionId, value}], violations?: number }` → chấm → `{ score, maxScore, percent, passed, timeSpentSec, xpEarned, perQuestion: [...], weakTopics: string[] }` — **v1.1:** answers ghi đè (merge) lên autosave thay vì xóa sạch; `violations` = số lần vi phạm proctoring (lưu vào session để admin xem, không ảnh hưởng điểm ở MVP) |
| E5 | GET | `/exams/history` | STUDENT | Lịch sử thi của user `{ items: [{sessionId, subjectName, kind, score, percent, passed, submittedAt, timeSpentSec}] }` |
| E6 | GET | `/exams/:sessionId` | STUDENT | Chi tiết 1 lần thi đã nộp (kèm perQuestion) |

**Quy tắc thi:**
- Session không dẫn chiếu examBank có thể nhiều đề chủ đề; mỗi questionId chỉ trả 1 lần theo index; `expiresAt` khi quá hạn tự đóng, mọi PATCH/POST trả `EXAM_STATE_CONFLICT`.
- Score: mỗi câu 1 điểm, MCQ_MULTI đúng hết mới +1; không có điểm trừ.
- Câu hỏi nạp theo độ khó sequence: 60% MEDIUM, 20% EASY, 20% HARD.

---

## 6. TIẾN ĐỘ & STREAK 📊

| # | Method | Path | Mô tả |
|---|---|---|---|
| G1 | GET | `/progress/overview` | `{ subjects: [{ subjectId, name, percentCompleted, avgAccuracy, chapters: [...] }], currentStreak, longestStreak, totalXp, level }` |
| G2 | GET | `/progress/weak-topics` | `{ items: [{ topic, accuracy, attempts, recommendedLesson: { id, title } }] }` (accuracy < 0.7) |
| G3 | GET | `/progress/timeline` | Biểu đồ theo ngày `?days=30`: `{ items: [{date, lessonsCompleted, examsTaken, xpEarned}] }` |
| G4 | GET | `/progress/streak-calendar` | Kanban dạng contributions GitHub `?year=2026`: `{ days: [{date, count}] }` |
| G5 | GET | `/progress/badges` | `{ earned: [{ id, name, icon, earnedAt }], upcoming: [{ id, name, condition }] }` |
| G6 | POST | `/progress/pomodoro` | STUDENT | Ghi 1 chuỗi focus Pomodoro hoàn thành `{ minutes: number, completedAt }` → `{ xpEarned }`. Chuẩn 30 phút học / 5 phút nghỉ (D14); +5 XP/chuỗi focus ≥25 phút; server validate minutes ∈ [25..60], tối đa 8 chuỗi/ngày (chống spam XP) |

**XP:** lesson hoàn thành +10, practice attempt đúng +2/câu,_exam,nộp đúng +5/câu, streak day +5 bonus. Cấp độ = `floor(xp / 100)`.

---

## 7. LỘ TRÌNH NGHỀ NGHIỆP 🛤️

| # | Method | Path | Vai trò | Mô tả |
|---|---|---|---|---|
| R1 | GET | `/roadmaps` | 🔓 | `{ items: [{ id, slug, title, description, icon, milestoneCount }] }` — Backend / Frontend / Data Scientist |
| R2 | GET | `/roadmaps/:slug` | 🔓 | Tree đầy đủ `{ milestones: [{ id, title, order, dependsOn: string[], lessons: [{lessonId, title}], examBankId? }] }` |
| R3 | POST | `/roadmaps/:id/enroll` | STUDENT | Bắt đầu lộ trình → `{ enrollment: { id, startedAt } }` |
| R4 | GET | `/roadmaps/me/:enrollmentId` | STUDENT | Tiến độ `{ percentCompleted, currentStep, milestones: [{ id, status: LOCKED\|AVAILABLE\|DONE\|SKIPPED }] }` (milestone mở khi xong dependencies) |
| R5 | POST | `/progress/placement-test` | STUDENT | Alias `POST /exams` với `kind: "PLACEMENT_TEST"` → trả đề test đầu vào → gợi lộ trình `{ recommendedRoadmap: { id, slug, title }, confidence: number }` |

---

## 8. TIẾNG ANH ĐẶC THÙ (nghe – nói) 🎧

| # | Method | Path | Vai trò | Mô tả |
|---|---|---|---|---|
| S_E1 | POST | `/english/speaking/attempt` | STUDENT | multipart `{ audio: File, modelAudioUrl, prompt }` (max 3MB, 30 giây) → MVP: `{ storedUrl (bản ghi của user), modelAudioUrl, similarityHint: "COMPARE_MANUALLY", selfScoreOptions: [1..5] }` — Phase 2 sẽ thay bằng AI score `{ wordScores: [...], overall }` |
| S_E2 | GET | `/english/listening/:resourceId` | STUDENT | Metadata audio + playbackSpeedOptions `[0.5, 0.75, 1, 1.25, 1.5, 2]` + transcript (chỉ hiện sau khi chấm) |

**Nghe:** tốc độ phát điều khiển ngoài client (`audio.playbackRate`) — contract chỉ vouch server trả audio URL có CORS/Cloudinary OK và transcript ẩn.

---

## 9. ADMIN BÁO CÁO & THỐNG KÊ 🧮

| # | Method | Path | Vai trò | Mô tả |
|---|---|---|---|---|
| X1 | GET | `/admin/stats` | ADMIN | `{ userCount, activeToday, lessonCount, examCount, avgExamPercent, topWeakTopics }` |
| X2 | GET | `/admin/users/progress/:userId` | ADMIN/TEACHER | Xem tổng quan tiến độ 1 user (chưa assignment) |
| X3 | GET | `/admin/exams/:examBankId/stats` | ADMIN | `{ avgScore, distributions: {EASY, MEDIUM, HARD}, mostWrongQuestions: [{questionId, wrongRate}] }` |

---

## 10. ENDPOINT CHUẨN BỊ CHO PHASE 2 (CHƯA LÀM) ⏭️
Các endpoint sau đây sẽ có nhưng CHƯA thuộc Phase 1 — frontend không build UI cho chúng:
- Spaced repetition: `POST /review/queue`, `GET /review/today`
- Tìm kiếm: `GET /search?q=`
- Notification: `GET /notifications`, WebSocket `/ws`
- Chấm phát âm AI: `POST /english/speaking/score`

---

## 11. PHÂN ĐỀ FILE (tách rạch ròi BE/FE)

```
src/server/...            ← backend-developer (API trên)
src/lib/api/*.ts          ← frontend-developer (typed client gọi API trên)
src/app/api/...           ← QUYỀN 70%(TF) — Route Handlers thin controllers BE; FE không đụng
```

**FE quy ước gọi API:** luôn qua `src/lib/api/<domain>.ts`, mỗi hàm khai kiểu response đúng như contract. KHÔNG hack cookie/token nằm trong FE logic. Auto-refresh qua `auth/refresh` client-side interceptor.

---
*✅ Bản v1.0 này là chân lý về API đa cấp. Mọi thay đổi phải qua manager cập nhật version.*

## 12. QUYẾT ĐỊNH KỸ THUẬT ĐÃ ĐƯỢC NGƯỜI DÙNG CHỐT
| # | Quyết định | Ngày | Ghi chú |
|---|---|---|---|
| D1 | FE = Next.js (apps/web), BE = Node.js + Express (apps/api), monorepo pnpm | 05/11/2026 | tách từ Next.js fullstack |
| D2 | DB = MySQL (TiDB Cloud Serverless) | 05/11/2026 | |
| D3 | Deploy = Vercel (web), API chạy riêng | 05/11/2026 | |
| D4 | Chỉ trắc nghiệm; text + hình ảnh; audio chỉ tiếng Anh | 05/11/2026 | |
| D5 | **Brand name = "SynapseBrain"** | 05/11/2026 | thay "HọcNè" tạm |
| D6 | **Contract types đặt tại `packages/shared`, web + api cùng import** | 05/11/2026 | 1 nguồn sự thật |
| D7 | **A6 logout = luôn hoạt động (🔓 best-effort)**; OAuth linking = link-by-email cho MVP (email verified), roadmap bảng `Account` sau | 05/11/2026 | final-reviewer khuyến nghị, user duyệt |
| D8 | **Animation = lottie-react + file JSON từ LottieFiles (free)**, lưu `apps/web/public/animations/` | 05/11/2026 | pháo hoa/mascot mừng điểm cao, động viên khi điểm thấp |
| D9 | Nút "Hoàn thành bài" bỏ gate điểm ≥70% (luôn hoạt động); celebration vẫn phân biệt ≥70/<70 | 05/11/2026 | |
| D10 | Thêm `GET /lessons/by-slug/:slug` (S4 giữ nguyên) | 05/11/2026 | |
| D11 | Subject publish flag: chấp nhận MVP trả tất cả môn; thêm status + migrate trước khi mở public | 05/11/2026 | |
| D12 | S3/S4/L1/L2 giữ `requireAuth` (TEACHER/ADMIN xem được bài) | 05/11/2026 | |
| D13 | MVP chạy demo mode làm đường chính; user tự cấu hình sau: TiDB (DATABASE_URL), Cloudinary, OAuth Google/GitHub, PISTON_URL (self-host Piston khi deploy). Code không cần đổi khi điền env | 05/11/2026 | |
| D14 | **Pomodoro 30 phút học / 5 phút nghỉ**, XP +5/chuỗi focus ≥25 phút, endpoint G6 | 05/11/2026 | |
| D15 | **Proctoring thi tiếng Anh:** vào fullscreen khi bắt đầu đề, chặn contextmenu + menu dịch; thoát fullscreen/chuyển tab → overlay cảnh báo + đếm vi phạm; đủ 3 lần → tự nộp bài. Vi phạm ghi vào submit (E4 `violations`), không trừ điểm MVP | 05/11/2026 | |
| D16 | E2 trả `progress` khôi phục grid sau reload; E4 submit merge (ghi đè) autosave thay vì xóa sạch | 05/11/2026 | |
