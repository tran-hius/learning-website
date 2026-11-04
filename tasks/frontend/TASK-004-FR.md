# TASK-004-FR (Ngày 4): Audio player + Python editor + bỏ gate

- **Agent thực thi:** frontend-developer
- **Phạm vi đường dẫn cho phép:** `apps/web/src/**`, `apps/web/package.json`
- **Task gốc từ kế hoạch:** Ngày 4 — giao diện thực hành đặc thù
- **Trạng thái:** DONE — final-reviewer: APPROVED_WITH_CONDITIONS (điều kiện chuyển TASK-005-FR: by-slug D10, touch target, AudioContext close, onError audio) (commit `539d693` — chờ reviewer)

## Điều kiện bắt buộc từ final-reviewer TASK-003 (làm TRONG task này)
1. **Bỏ gate percent≥70** cho nút "Hoàn thành bài" (D9) — nút luôn hiện; celebration vẫn phân biệt ≥70/<70.
2. Demo text "+10 XP" → trung tính: "Hoàn thành bài! XP sẽ được ghi khi kết nối máy chủ" (banner demo giữ nguyên).
3. Xoá `apps/web/public/animations/success-check.json` (asset chết) hoặc dùng nó thật — chọn xoá.

## Quyết định đã chốt áp dụng
- D8 Lottie (đã có), D10 by-slug endpoint (backend đang làm trong TASK-004 — khi có thì gọi endpoint mới qua `lib/api/content.ts`).

## Mô tả công việc
1. **Audio player luyện nghe** (component `components/audio/ListeningPlayer.tsx`): dùng S_E2 — phát audio với **speed selector 0.5x/0.75x/1x/1.25x/1.5x/2x** (audio.playbackRate), nút tua ±5s, loop câu; transcript hiển thị theo `lockedUntilSubmit`. Gắn vào trang bài học khi practice set mode LISTENING.
2. **Luyện nói** (component `components/speaking/SpeakingPractice.tsx`): nút mic tròn to (≥56px), MediaRecorder ghi âm, waveform đơn giản khi ghi, playback bản ghi vừa ghi so với audio mẫu; nộp S_E1 → hiển thị `COMPARE_MANUALLY` + self-score 1–5 + lưu local "đã luyện".
3. **Python code editor** (component `components/python/PythonEditor.tsx`): editor đơn giản (textarea mono + line numbers nhẹ — KHÔNG tự suy diễn thêm thư viện nặng; nếu muốn dùng CodeMirror thì BLOCKED hỏi), nút "Chạy ▶" gọi P3, hiển thị stdout/stderr/exitCode, state loading + lỗi thân thiện. Gắn vào bài mode CODING.
4. **Bỏ fallback chấm local** trong PracticeSection khi P1 đã mount (backend đang thêm trong TASK-004 — giữ fallback nhưng ưu tiên API khi 200).
5. Micro-interaction giữ 150–250ms; giữ checklist chống AI look.

## Definition of Done
- [ ] lint + build pass
- [ ] 3 component mới hoạt động (audio speed thật sự đổi playbackRate; recorder xin quyền mic có fallback lỗi thân thiện; editor chạy P3 hoặc demo fallback trung thực)
- [ ] Gate đã bỏ, demo text trung tính

## Commit & Push
- 1 commit: `TASK-004-FR(web): listening player, speaking recorder, python editor, ungated complete`
- push + hash → DONE_PRIVATE.

## Câu hỏi cho manager
(không có — task chạy trọn, không BLOCKED)

## Ghi chú của dev (TASK-004-FR)
- Commit hash: `539d693` — lint + build pass (`pnpm --filter @learning/web lint` / `build`).
- File mới: `components/audio/ListeningPlayer.tsx`, `components/speaking/SpeakingPractice.tsx`, `components/python/PythonEditor.tsx`, `lib/api/english.ts` (S_E1/S_E2 client, shape khớp english.service.ts).
- `lib/api/practice.ts` thêm `execPython` (P3). Lesson page render practice set theo mode (LISTENING/SPEAKING/CODING/QUIZ...).
- 3 điều kiện reviewer: bỏ gate percent≥70 (nút Hoàn thành luôn hiện sau khi nộp), demo text XP trung thực, xoá `public/animations/success-check.json`.
- PythonEditor dùng textarea mono + gutter số dòng, KHÔNG thêm CodeMirror.

## Ghi chú của reviewer
(điền sau review)
