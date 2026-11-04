# TASK-004 (Ngày 4): Thực hành + Python + Tiếng Anh đặc thù — backend

- **Agent thực thi:** backend-developer
- **Phạm vi đường dẫn cho phép:** `apps/api/src/**`, `apps/api/prisma/**`, `apps/api/package.json`
- **Task gốc từ kế hoạch:** Ngày 4 — Thực hành (P1–P3) + tiếng Anh nghe/nói (S_E1–S_E2)
- **Trạng thái:** DONE — final-reviewer: APPROVED_WITH_CONDITIONS (điều kiện chuyển TASK-005: FE dùng by-slug D10, touch target 44px, hitRateLimit atomic, banner honey demo) — commit `d682aa1441022392fad5a828ee35a9f1e72b029a` (pushed origin/main)

## Điều kiện bắt buộc từ final-reviewer TASK-003 (làm TRONG task này)
1. Thêm `GET /lessons/by-slug/:slug` (D10) — trả Lesson content + practiceSets như S4.
2. Error handler: map lỗi Prisma `P2003` (FK) → 400, `P2025` (not found) → 404 trong error-handler.
3. `admin.service` C9/C11: validate `examBankId` tồn tại trước insert (query 1 lần), lỗi → 400 NOT_FOUND style.
4. `createChapter` (C3) gọi `cacheDel("subjects:list:v1")`.
5. S3/S4/L1/L2 giữ `requireAuth` (D12) — thêm comment dẫn chiếu D12.

## Mô tả công việc (contract mục 4 + 8)
1. **P1 POST /practice/:setId/attempt** — STUDENT: nhận `answers: [{questionId, value}]`, chấm server-side theo type (MCQ_SINGLE/MCQ_MULTI/FILL/MATCH_PAIRS/LISTEN_MCQ), trả perQuestion `{questionId, isCorrect, correctAnswer, explanation, thinkingHints}` + `{xpEarned, accuracy}`; XP +2/câu đúng.
2. **P2 POST /practice/hints/:questionId** — trả hint theo level 1|2 (level 2 mới trả hints[1]); log "self-solved" (đặt chỗ cho spaced repetition phase 2).
3. **P3 POST /python/exec** — proxy Piston API (https://emkc.org/api/v2/piston/execute), body `{code, stdin?}` max 10.000 chars, rate limit 10 req/phút/user (dùng Redis INCR + TTL qua cache util; Redis chết → fallback cho qua nhưng log warn). Trả `{stdout, stderr, exitCode, timeMs}`. Timeout 10s, chỉ language `python` version 3.10.0.
4. **S_E1 POST /english/speaking/attempt** — STUDENT: nhận multipart audio ≤3MB ≤30s (validate magic bytes đơn giản), upload Cloudinary (dùng cloudinary SDK; env trống → trả lỗi rõ ràng 503 SERVICES_NOT_CONFIGURED), lưu record SpeakingAttempt; response theo contract: `{storedUrl, modelAudioUrl, similarityHint: "COMPARE_MANUALLY", selfScoreOptions: [1..5]}`.
5. **S_E2 GET /english/listening/:resourceId** — metadata audio + `playbackSpeedOptions: [0.5, 0.75, 1, 1.25, 1.5, 2]` + transcript chỉ trả khi đã chấm xong attempt liên quan (MVP: trả transcript luôn nhưng có field `lockedUntilSubmit` theo payload).
6. Model Prisma thêm: `SpeakingAttempt`. Seed thêm 1 practice set Python + 1 set listening tiếng Anh mẫu.
7. Mount P1–P3 + S_E1/S_E2 vào routes/index.ts (frontend đang chờ để bỏ fallback demo).

## Definition of Done
- [x] lint + test + build + prisma validate pass (tsc 0 lỗi; vitest 28/28 pass; tsup build OK; `prisma validate` OK. Lưu ý: `prisma migrate dev` chưa chạy được vì DB local không sẵn sàng (P1001) — chạy migrate khi DB lên)
- [x] Unit test: scoring logic cho 4 loại câu hỏi (MCQ_SINGLE, MCQ_MULTI, FILL, MATCH_PAIRS) — `tests/unit/scoring.test.ts` (13 case: đúng/sai/đa đáp án thiếu 1/thừa 1/thứ tự tự do)
- [x] Piston exec: request THẬT bị chặn — `https://emkc.org/api/v2/piston/execute` trả **401 Unauthorized** (public Piston API chỉ nhận project whitelisted từ 15/02/2026). Test bằng **mock fetch** (`tests/unit/piston.test.ts`, 4 case) — kê khai rõ. URL đổi được qua env `PISTON_URL`
- [x] by-slug endpoint + error mapping hoạt động (D10 + Prisma P2003→400 / P2025→404)

## Commit & Push
- 1 commit: `TASK-004(api): practice scoring, python piston, english speaking/listening, by-slug, error mapping`
- push + hash → DONE_PRIVATE.

## Câu hỏi cho manager
(không BLOCKED — 2 lưu ý: (1) Piston trả 401 từ 02/2026 → khi deploy cần `PISTON_URL` trỏ instance self-host/whitelist; (2) migration `add_speaking_attempt` cần chạy khi DB sẵn sàng)

## Ghi chú của reviewer
(điền sau review)
