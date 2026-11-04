# 🎨 UI DESIGN GUIDE — "Thân thiện dễ thương, không nhìn như AI làm"

> Áp dụng bắt buộc cho mọi trang UI. Mục tiêu: giao diện có cá tính riêng, ấm áp, như "người bạn học cùng" — không như dashboard template AI-generated.

## 1. Chân dung thương hiệu
- **Cảm giác tổng:** "Người bạn học cùng" — ấm áp, động viên, nhẹ nhàng. KHÔNG lạnh lùng kiểu enterprise, KHÔNG neon tech hype.
- **Đối tượng:** học sinh cấp 3 + sinh viên năm nhất. UI phải khiến bạn "muốn vào học ngay" trong 3 giây.
- **Ngôn ngữ UI:** tiếng Việt tự nhiên, dễ mến, có động lực: "Bạn đã hoàn thành rồi nè 🎉", "Trượt chút xíu, thử lại nhé!" — không giáo điều, không kiểu robot.

## 2. Palette & cảm giác màu
- **Nền chính:** trắng kem nhạt `#FFF9F2` (không dùng trắng tinh).
- **Bảng màu chủ đạo:** hồng đào `#FF8A80`, cam ấm `#FFB74D`, xanh ngọc non `#4DB6AC`, xanh nhạt `#90CAF9`.
- **Màu trạng thái:** thành công xanh mint `#80CBC4`, lỗi đỏ san hô `#FF7043` (dịu, không chói), streak/badge vàng mật ong `#FFD54F`.
- **Màu riêng theo môn** (dùng cho icon, progress bar, chip):
  - Toán 🧡 cam ấm — Tiếng Anh 💙 xanh dương nhạt — Python 🐍 xanh ngọc — Triết học 🌸 hồng — Toán cao cấp 💜 tím dịu — Vật lý 🌊 xanh teal — Tiếng Anh giao tiếp 🗣️ vàng cam.
- **Gradient:** hạn chế tối đa; nếu dùng chỉ hero banner, 2 màu gần nhau, opacity thấp. CẤM: nền chuyển màu tím-xanh full-page, glow, glassmorphism lòe loẹt.
- **Dark mode:** Phase 2 (nếu làm phải cùng hệ màu ấm, nền `#1F1B18`).

## 3. Typography
- **Tiêu đề:** font "Be Vietnam Pro" (hỗ trợ tiếng Việt tốt, hơi tròn, thân thiện).
- **Body:** "Be Vietnam Pro" hoặc "Inter" — 15–16px, line-height 1.65.
- **Code (Python):** "JetBrains Mono" hoặc "Fira Code".
- **LaTeX:** KaTeX, cỡ 1.05em cho nổi trong khối công thức có nền `#FFF4E6`.
- KHÔNG font quá mảnh/trắng nhạt, không chữ màu gray-400 trên nền trắng (khó đọc).

## 4. Hình ảnh & minh hoạ
- **Illustration style:** flat-friendly, bo tròn, chủ đề học tập đơn giản, màu lấy từ palette trên — SVG tự vẽ đơn giản hoặc icon thư viện lucide + emoji trong text.
- **Mascot/sticker:** nên có 1 hình nhân vật riêng (vd: chú mèo đeo kính "Bút Chì" hoặc hình như ý bạn) xuất hiện ở phần tiến độ/feedback — để SVG inline trong repo.
- **Emoji cho phép** trong UI nhưng tối đa 1–2 emoji/câu, không emoji spam.
- **Ảnh minh hoạ bài học:** bo góc 12px, có "paper shadow" mềm (không đổ bóng gắt).

## 5. Shape, spacing, motion
- **Bo tròn là ngôn ngữ:** card/detail 16px, button 12px, input 10px, avatar tròn.
- **Bóng:** chỉ dùng shadow mềm nhẹ (rgba(0,0,0,0.06), blur lớn) — không hard shadow.
- **Whitespace thoải mái** (section padding 32–48px), khoảng cách các khối học cốt lõi 20–24px.
- **Motion:** chuyển cảnh 150–250ms ease-out; micro-interaction khi đánh dấu hoàn thành (dấu check bounce nhỏ), progress bar đầy dần từ trái sang phải, icon streak bật nhẹ `pop`. KHÔNG animation trang trí vô nghĩa.

## 6. Checklist "chống nhìn như AI" — KẺM Ở REVIEW (reviewer UI kiểm)
Các trang chính KHÔNG được có đặc điểm dưới đây:
- ❌ Hero full-screen gradient tím-xanh với headline kiểu "Revolutionize your learning"
- ❌ Hàng 3 cột icon đều tăm tắp "Nhanh chóng - Linh hoạt - An toàn"
- ❌ Dashboard grid tile đều nhau, không có trạng thái thật
- ❌ Headline chung chung, không mang thông tin cụ thể
- ❌ Placeholder lorem ipsum kiểu template (nội dung phải là tiếng Việt thật)
- ❌ Số liệu "fake" không có nguồn/rem data thật (thiếu dữ liệu thì hiện trạng thái trống rõ ràng, không đắp rác)
- ❌ Mọi button đều cùng 1 màu primary (trạng thái hành động khác nhau phải có màu phụ khác nhau)

Thay vào đó: content tiếng Việt thật; card có số liệu/trạng thái + màu theo môn; có chi tiết "khó template copy" (sticker streak, chữ ký giáo viên, banner đề thi sắp tới dạng sticky note nghiêng nhẹ...).

## 7. Thiết kế theo vai trò — các trang chính
- **Trang chủ học sinh:** chào ấm "Chào <tên>!", streak, "Tiếp tục học" từ chỗ dừng (progress), banner lộ trình gần nhất, đề thi sắp tới. CTA primary dùng id 1 nút duy nhất ("Học tiếp nè").
- **Trang môn học:** chương hiển thị dạng hành trình dọc (roadmap), mỗi bài có sticker trạng thái (Đã hoàn thành / Đang học / Chưa mở khóa).
- **Trang bài học:** nội dung thoải mái (max-w-3xl), sidebar mục lục sticky, câu hỏi trắc nghiệm dạng card quiz có vòng tiến triển, feedback tức thì.
- **Thi thử:** mỗi câu 1 card, đồng hồ vòng tròn ở header, nhãn auto-save ("Đã lưu ✓").
- **Nói (Tiếng Anh giao tiếp):** nút mic tròn to dễ bấm, waveform khi ghi âm, speed selector rõ ràng.

## 8. 🧑‍💼 TRANG QUẢN TRỊ (Admin/Teacher) — yêu cầu riêng
Quản trị vẫn thân thiện nhưng **cấu trúc rõ, chuyên nghiệp hơn học sinh**:
- **Layout:** sidebar trái (dashboards, Môn học, Bài học/Câu hỏi, Đề thi, Lộ trình, Người dùng, Báo cáo) + khung content rộng, chế độ desktop-first.
- **Số liệu:** các stat card có biểu đồ mini (sparkline), tránh "số trống" — luôn có trend so với tuần trước ("+12% so với hôm qua").
- **Màu & hierarchy:** dùng cùng palette nhưng tĩnh hơn, phân cấp rõ, table zebra nhẹ.
- **Trang chính cần có:**
  1. **Dashboard** tổng quan (users active, đề nộp hôm nay, bài học mới).
  2. **Môn học & Chương:** tree view kéo thả đơn giản, badge trường status DRAFT/PUBLISHED.
  3. **Soạn bài học:** editor markdown hỗ trợ LaTeX + preview realtime + upload hình (Cloudinary).
  4. **Ngân hàng câu hỏi:** table filter theo môn/loại/độ khó; form tạo câu hỏi trắc nghiệm đơn giản (MCQ 1/nhiều, điền, ghép cặp, nghe); bulk import JSON.
  5. **Đề thi:** xây bank, chọn câu theo filter, cài thời gian/phân bố độ khó.
  6. **Lộ trình:** dạng cây theo milestone, gán bài học/bài thi vào từng mốc.
  7. **Người dùng:** bảng + search, gán vai trò, tạm khoá, xem tiến độ cá nhân.
  8. **Báo cáo:** biểu đồ tiến độ tổng quan + "câu hỏi người học sai nhiều nhất".
- **Quyền:** phân rõ TEACHER và ADMIN (ADMIN toàn quyền; TEACHER chỉ quản lý nội dung — không quản user).

## 9. Accessibility & chất lượng cứng
- Contrast ≥ 4.5:1 cho chữ; focus ring rõ (outline 2px).
- Touch target ≥ 44px (mobile học sinh dùng nhiều).
- Icon + text cùng xuất hiện cho trạng thái quan trọng (không chỉ dùng màu).
- Font-size tối thiểu 14px; responsive 360px → desktop; sidebar collapse mobile thành drawer.

---
*Yêu cầu review UI: final-reviewer dùng skill `web-design-guidelines` kết hợp checklist section 6 để "quét sạch" các dấu hiệu giao diện AI. Frontend-developer phải đọc file này trước khi tạo bất kỳ trang nào.*
