"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

export default function PasswordChangeForm() {
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (password.length < 8) {
      setMessage({ type: "error", text: "비밀번호는 8자 이상이어야 합니다." });
      return;
    }
    if (password !== password2) {
      setMessage({ type: "error", text: "비밀번호가 일치하지 않습니다." });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setMessage({ type: "error", text: "비밀번호 변경에 실패했습니다." });
      return;
    }
    setMessage({ type: "success", text: "비밀번호가 변경되었습니다." });
    setPassword("");
    setPassword2("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input
        type="password"
        placeholder="새 비밀번호 (8자 이상)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="input-field !py-2 text-sm"
      />
      <input
        type="password"
        placeholder="새 비밀번호 확인"
        value={password2}
        onChange={(e) => setPassword2(e.target.value)}
        className="input-field !py-2 text-sm"
      />
      {message && (
        <p className={`text-xs ${message.type === "error" ? "text-red-500" : "text-green-600"}`}>{message.text}</p>
      )}
      <button type="submit" disabled={loading} className="btn-secondary !py-2 text-sm">
        {loading ? "변경 중..." : "비밀번호 변경"}
      </button>
    </form>
  );
}
