import { cn } from "@/lib/utils";

/**
 * Mascot "Bút Chì" — chú mèo đeo kính, SVG inline theo guide mục 4
 * (không dùng ảnh ngoài, tự vẽ, màu từ palette). Dùng cho feedback:
 * `cheer` (điểm cao), `encourage` (điểm thấp — buồn nhẹ, không đáng sợ).
 */
export type MascotMood = "cheer" | "encourage";

function Fur({ variant }: { variant: "coral" | "sky" }) {
  return (
    <>
      {/* tai */}
      <path d="M18 22 L26 6 L34 20 Z" fill={variant === "coral" ? "#FF8A80" : "#90CAF9"} />
      <path d="M62 22 L54 6 L46 20 Z" fill={variant === "coral" ? "#FF8A80" : "#90CAF9"} />
      {/* tai trong */}
      <path d="M20.5 20 L26 10 L31 19 Z" fill="#FFF4E6" />
      <path d="M59.5 20 L54 10 L49 19 Z" fill="#FFF4E6" />
      {/* mặt */}
      <circle cx="40" cy="38" r="26" fill={variant === "coral" ? "#FF9E95" : "#A5CDF5"} />
      {/* má hồng */}
      <circle cx="26" cy="44" r="4" fill="#FFC4BF" opacity="0.9" />
      <circle cx="54" cy="44" r="4" fill="#FFC4BF" opacity="0.9" />
      {/* kính (chữ "Bút Chì") */}
      <circle cx="31" cy="35" r="7.5" fill="#FFF9F2" stroke="#3D3730" strokeWidth="2" />
      <circle cx="49" cy="35" r="7.5" fill="#FFF9F2" stroke="#3D3730" strokeWidth="2" />
      <path d="M38.5 35 h3" stroke="#3D3730" strokeWidth="2" strokeLinecap="round" />
      {/* mắt */}
      <circle cx="31" cy="35" r="2.4" fill="#3D3730" />
      <circle cx="49" cy="35" r="2.4" fill="#3D3730" />
      {/* mũi + miệng */}
      <path d="M40 42 l-2.5 3 h5 Z" fill="#3D3730" />
    </>
  );
}

export function Mascot({
  mood,
  className,
}: {
  mood: MascotMood;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 80 76"
      role="img"
      aria-label={mood === "cheer" ? "Chú mèo Bút Chì đang mừng" : "Chú mèo Bút Chì động viên bạn"}
      className={cn("h-24 w-24", className)}
    >
      {mood === "cheer" ? (
        <g className="animate-bounce-soft" style={{ transformOrigin: "40px 70px" }}>
          {/* chân giơ lên mừng */}
          <path d="M12 52 q-6 -8 -2 -14" stroke="#FF9E95" strokeWidth="5" strokeLinecap="round" fill="none" />
          <Fur variant="coral" />
          {/* miệng cười toe */}
          <path d="M33 46 q7 6 14 0" stroke="#3D3730" strokeWidth="2" strokeLinecap="round" fill="none" />
          {/* ria */}
          <path d="M16 38 h7 M16 42 h6 M57 38 h7 M58 42 h6" stroke="#3D3730" strokeWidth="1.5" strokeLinecap="round" />
          {/* thân */}
          <ellipse cx="40" cy="66" rx="18" ry="10" fill="#FF9E95" />
        </g>
      ) : (
        <g>
          <Fur variant="sky" />
          {/* miệng bĩu nhẹ — buồn "nhẹ nhàng", vẫn dễ thương */}
          <path d="M35 48 q5 -3.5 10 0" stroke="#3D3730" strokeWidth="2" strokeLinecap="round" fill="none" />
          {/* ria */}
          <path d="M16 38 h7 M16 42 h6 M57 38 h7 M58 42 h6" stroke="#3D3730" strokeWidth="1.5" strokeLinecap="round" />
          {/* thân ôm quyển sách (kế hoạch ôn lại) */}
          <ellipse cx="40" cy="66" rx="18" ry="10" fill="#A5CDF5" />
          <rect x="31" y="60" width="18" height="12" rx="2" fill="#FFF9F2" stroke="#3D3730" strokeWidth="1.5" />
          <path d="M40 60 v12" stroke="#3D3730" strokeWidth="1.2" />
          {/* giọt mồ hôi nhỏ */}
          <path d="M64 30 q3 4 0 6 q-3 -2 0 -6" fill="#90CAF9" className="animate-soft-float" />
        </g>
      )}
    </svg>
  );
}
