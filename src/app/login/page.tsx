"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(
        error.message.includes("Invalid login")
          ? "이메일 또는 비밀번호가 올바르지 않습니다."
          : "로그인에 실패했습니다. 잠시 후 다시 시도해주세요."
      );
      return;
    }
    router.push("/home");
    router.refresh();
  }

  async function handleResetPassword() {
    if (!email) {
      setError("비밀번호를 찾으려면 먼저 이메일을 입력해주세요.");
      return;
    }
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      setError("비밀번호 재설정 메일 발송에 실패했습니다.");
      return;
    }
    setResetSent(true);
  }

  return (
    <div className="flex-1 flex flex-col justify-center px-6 py-10">
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold text-stone-800">기억을 꼭 붙잡아!!</h1>
        <p className="text-stone-500 mt-2">찬란했던 나의 이야기</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="email"
          required
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field"
          autoComplete="email"
        />
        <input
          type="password"
          required
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-field"
          autoComplete="current-password"
        />

        {error && <p className="text-red-600 text-sm text-center">{error}</p>}
        {resetSent && (
          <p className="text-brand-600 text-sm text-center">
            비밀번호 재설정 메일을 보냈습니다. 메일함을 확인해주세요.
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <button onClick={handleResetPassword} className="text-stone-500 text-sm mt-4 text-center underline">
        비밀번호를 잊으셨나요?
      </button>

      <div className="mt-10 text-center text-sm text-stone-500">
        아직 계정이 없으신가요?{" "}
        <Link href="/signup" className="text-brand-600 font-semibold">
          회원가입
        </Link>
      </div>
    </div>
  );
}
