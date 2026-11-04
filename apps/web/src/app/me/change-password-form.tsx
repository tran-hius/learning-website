"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { changePassword } from "@/lib/api/auth";
import { friendlyApiMessage } from "@/lib/api/client";

/** Form đổi mật khẩu (U2 — PATCH /users/me/password). */
export function ChangePasswordForm() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (newPassword.length < 8) {
      setError("Mật khẩu mới cần ít nhất 8 ký tự nha!");
      return;
    }
    setBusy(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setDone(true);
      setCurrent("");
      setNew("");
    } catch (err) {
      setError(friendlyApiMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "min-h-[44px] rounded-[10px] border border-ink-300/60 bg-paper px-3 text-[15px] text-ink-900 outline-none transition-shadow placeholder:text-ink-300 focus:border-teal-fresh-400 focus:outline-2 focus:outline-teal-fresh-400";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {error && (
        <p role="alert" className="rounded-[10px] bg-coral-100 px-3 py-2 text-sm text-coral-600">
          {error}
        </p>
      )}
      {done && (
        <p role="status" className="rounded-[10px] bg-mint-100 px-3 py-2 text-sm text-mint-600">
          Đổi mật khẩu thành công rồi nè 🎉
        </p>
      )}

      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-900">
        Mật khẩu hiện tại
        <input
          type="password"
          required
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrent(e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-900">
        Mật khẩu mới
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNew(e.target.value)}
          className={inputClass}
        />
      </label>

      <Button type="submit" variant="outline" disabled={busy} className="self-start">
        {busy ? "Đang lưu…" : "Lưu mật khẩu mới"}
      </Button>
    </form>
  );
}
