"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/api/auth";
import { friendlyApiMessage } from "@/lib/api/client";

/**
 * Nút đăng xuất (client — cần gọi POST /auth/logout rồi refresh server state).
 * Touch target ≥ 44px theo guide mục 9.
 */
export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    try {
      await logout();
      router.push("/");
      router.refresh();
    } catch (err) {
      alert(friendlyApiMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      disabled={busy}
      aria-label="Đăng xuất"
      title="Đăng xuất"
    >
      <LogOut aria-hidden />
      <span className="hidden sm:inline">{busy ? "Đang thoát…" : "Đăng xuất"}</span>
    </Button>
  );
}
