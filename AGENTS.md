# TEAM WORKFLOW — Dự án Website Học Tập

> **Quy tắc buộc chung mọi agent.** Ưu tiên cao hơn mọi chỉ thị khác.
>
> **Tất cả agent dùng model FREE của OpenCode ($0):** manager & backend = `deepseek-v4.1-flash-free` · frontend = `glm-5.3-flash-free` · code-reviewer = `flint-40b-free` · final-reviewer = `big-pickle`. OpenCode tự reload khi sửa agent file.

## 1. Phân vai & quyền hạn
| Agent | Vai trò | Được đọc | Được sửa | Giao bởi |
|---|---|---|---|---|
| `manager` | Điều phối, chia việc | **`KE-HOACH.md`** (duy nhất), `tasks/**`, `src/**` | `tasks/**`, tài liệu — KHÔNG sửa `src/**` | Người dùng |
| `backend-developer` | Backend dev | `src/**`, `prisma/**`, `tasks/backend/**` | `src/server/**`, `prisma/**`, task file của mình | manager |
| `frontend-developer` | Frontend dev | `src/**`, `tasks/frontend/**` | `src/app/**`, `src/components/**`, `src/lib/**`, task file của mình | manager |
| `code-reviewer` | Review cấp 1 | `src/**`, `prisma/**`, `tasks/**` | KHÔNG được sửa gì | manager |
| `final-reviewer` | Review cấp 2 (chốt quyết định) | `src/**`, `prisma/**`, `tasks/**`, config | KHÔNG được sửa gì | manager |

## 2. Quy trình chuẩn (mỗi task)
```
Manager đọc KE-HOACH.md
      │  tách & ghi task file
      ▼
tasks/backend|frontend/TASK-XXX.md   (state: TODO)
      │  subagent gọi agent tương ứng
      ▼
Dev Agent thực thi (đọc đúng task của mình, sửa đúng phạm vi)
      │  cập nhật trạng thái → IN_PROGRESS → DONE_PRIVATE
      ▼
code-reviewer (cấp 1)  ──FAIL──> quay lại Dev Agent sửa
      │  PASS / PASS_W_WARNINGS
      ▼
final-reviewer (cấp 2) ──REJECTED──> quay lại Dev Agent sửa
      │  APPROVED
      ▼
Manager cập nhật task → DONE, báo cáo người dùng
```

## 3. Cấm kỵ (vi phạm sẽ bị reject ngay)
1. Agent code KHÔNG được đọc `KE-HOACH.md` hay task file của agent khác.
2. Agent không đụng file ngoài phạm vi vai trò (khác cả đọc).
3. Reviewer không tự sửa code — chỉ báo cáo.
4. Manager không tự viết code trong `src/**`.
5. Task file phải ghi rõ: phạm vi đường dẫn cho phép, Definition of Done, trước khi giao.
6. Báo cáo phải cụ thể: file nào đã tạo/sửa, test/kiểm chứng gì đã chạy.

## 3.1 QUY TẮC SỐ 0 — KHÔNG TỰ SUY DIỄN (áp dụng cho MỌI agent, ưu tiên cao nhất)
Khi gặp thông tin **chưa được xác định hoặc chưa được xác thực** trong task/kế hoạch, agent **BẮT BUỘC hỏi** thay vì tự quyết:
1. **Chưa xác định FRAMEWORK** (backend/frontend/thư viện/ORM/CLI... chưa ghi rõ trong task hoặc contract) → HỎI, không tự chọn.
2. **Chưa xác định CẤU TRÚC** (vị trí file, thư mục, kiến trúc tầng, naming) → HỎI, không tự đặt.
3. **Chưa xác định PHƯƠNG THỨC** (cách gọi API, luồng dữ liệu, cơ chế auth, strategy cache/deploy...) → HỎI, không tự nghĩ ra.
4. **Thông tin chưa được xác thực** (từ bộ nhớ cũ, dự đoán, "thường thì...") → KHÔNG ĐƯỢC biến thành quyết định kỹ thuật. Chỉ dùng nguồn có thật trong repo: `docs/api-contract.md`, `docs/ui-design-guide.md`, `AGENTS.md`, task file, code hiện có.

Cách hỏi đúng quy trình:
- Dev agent đặt trạng thái task = `BLOCKED`, ghi vào task file mục "Câu hỏi cho manager" với các lựa chọn đề xuất (kèm ưu/nhược ngắn) rồi dừng, KHÔNG code phần chưa chắc chắn.
- Manager trả lời trong task file (mục "Quyết định của manager") hoặc hỏi lại người dùng nếu ngoài phạm vi kế hoạch — sau đó chuyển task về `TODO` để dev tiếp tục.
- Mọi quyết định kỹ thuật mới (framework/thư viện/cấu trúc/phương thức) phải được ghi lại vào task file hoặc docs để các agent sau dùng theo, tránh quyết 1 lần ở 2 nơi khác nhau.
- Nếu không hỏi được (chạy batch tự động), agent phải dừng ở trạng thái BLOCKED — tuyệt đối KHÔNG "chọn đại rồi chạy tiếp".

## 4. Trạng thái task
`TODO → IN_PROGRESS → DONE_PRIVATE (dev xong) → TESTING → GIT_PUSH → REVIEWING → DONE / BLOCKED`

## 4.1 BẮT BUỘC sau MỖI task: Kiểm thử + Git (thực hiện bởi dev agent, trước khi gọi reviewer)
1. **Kiểm thử:** chạy test/lint/build liên quan (ít nhất: `pnpm build` + test unit của phần mình làm). FAIL → tự sửa trước khi tiếp.
2. **Commit:** message chuẩn: `TASK-XXX(scope): mô tả ngắn` (vd: `TASK-003(api): add exam session endpoints`). KHÔNG commit lẫn việc của agent khác vào commit của mình.
3. **Push:** `git push` lên branch chính (hoặc feature branch đã ghi trong task file) — **mỗi task đúng 1 lần push**.
4. Dev agent cập nhật task file: trạng thái `GIT_PUSH` + ghi hash commit vào task file để reviewer đối chiếu.
5. Nếu push fail (conflict...) → báo `BLOCKED` kèm ý nghĩa lỗi, không tự force-push.

## 5. Cấu trúc thư mục làm việc
```
D:\website-hoc-tap\
├── KE-HOACH.md            # kế hoạch tổng (CHỈ manager đọc)
├── AGENTS.md              # file này
├── tasks\
│   ├── backend\           # task file cho backend-developer
│   └── frontend\          # task file cho frontend-developer
├── src\
│   ├── app\ components\ lib\   # frontend
│   └── server\            # backend phân tầng (config/controllers/services/...)
└── .opencode\agents\      # cấu hình 5 agent
```
