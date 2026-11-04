"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { register } from "@/lib/api/auth";
import { friendlyApiMessage } from "@/lib/api/client";

/** Form đăng ký (A1) — mật khẩu ≥ 8 ký tự theo contract. */
export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Mật khẩu cần ít nhất 8 ký tự nha!");
      return;
    }
    setBusy(true);
    try {
      await register({ name, email, password });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(friendlyApiMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {error && (
        <p
          role="alert"
          className="rounded-[10px] bg-coral-100 px-3 py-2 text-sm text-coral-600"
        >
          {error}
        </p>
      )}

      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-900">
        Tên của bạn
        <input
          type="text"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="vd: Minh Anh"
          className="min-h-[44px] rounded-[10px] border border-ink-300/60 bg-paper px-3 text-[15px] text-ink-900 outline-none transition-shadow placeholder:text-ink-300 focus:border-teal-fresh-400 focus:outline-2 focus:outline-teal-fresh-400"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-900">
        Email
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ban@vidu.com"
          className="min-h-[44px] rounded-[10px] border border-ink-300/60 bg-paper px-3 text-[15px] text-ink-900 outline-none transition-shadow placeholder:text-ink-300 focus:border-teal-fresh-400 focus:outline-2 focus:outline-teal-fresh-400"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-900">
        Mật khẩu
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Tối thiểu 8 ký tự"
          className="min-h-[44px] rounded-[10px] border border-ink-300/60 bg-paper px-3 text-[15px] text-ink-900 outline-none transition-shadow placeholder:text-ink-300 focus:border-teal-fresh-400 focus:outline-2 focus:outline-teal-fresh-400"
        />
      </label>

      <Button type="submit" variant="coral" disabled={busy}>
        {busy ? "Đang tạo tài khoản…" : "Tạo tài khoản nè"}
      </Button>
    </form>
  );
}
