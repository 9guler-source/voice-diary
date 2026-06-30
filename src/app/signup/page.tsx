"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { registerGuardianAfterSignup } from "./actions";

function getStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score, label: "약함", color: "bg-red-500" };
  if (score <= 3) return { score, label: "보통", color: "bg-amber-500" };
  return { score, label: "강함", color: "bg-green-600" };
}

export default function SignupPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmPopup, setConfirmPopup] = useState(false);

  const strength = useMemo(() => getStrength(password), [password]);
  const mismatch = password2.length > 0 && password !== password2;

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (password !== password2) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName || null } },
    });

    if (signUpError) {
      setLoading(false);
      setError(
        signUpError.message.includes("already registered")
          ? "이미 가입된 이메일입니다."
          : "회원가입에 실패했습니다. 잠시 후 다시 시도해주세요."
      );
      return;
    }

    // 이메일 인증이 켜져 있지 않은 개발 환경에서는 세션이 즉시 생성됨 → 보호자 정보 바로 저장
    if (data.session && guardianEmail) {
      await registerGuardianAfterSignup(guardianEmail, guardianName);
    }

    setLoading(false);

    if (!data.session) {
      setConfirmPopup(true);
    } else {
      window.location.href = "/home";
    }
  }

  if (confirmPopup) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="card">
          <h2 className="text-lg font-bold mb-2">이메일을 확인해주세요</h2>
          <p className="text-stone-600 text-sm mb-6">
            {email} 주소로 인증 메일을 보냈습니다. 메일 속 링크를 눌러 가입을 완료해주세요.
          </p>
          <Link href="/login" className="btn-primary inline-block text-center">
            로그인 화면으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-center px-6 py-10">
      <h1 className="text-xl font-bold text-stone-800 mb-6 text-center">회원가입</h1>

      <form onSubmit={handleSignup} className="space-y-4">
        <input
          type="text"
          placeholder="이름 (선택)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="input-field"
        />
        <input
          type="email"
          required
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field"
          autoComplete="email"
        />
        <div>
          <input
            type="password"
            required
            placeholder="비밀번호 (8자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            autoComplete="new-password"
          />
          {password.length > 0 && (
            <div className="mt-2">
              <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${strength.color} transition-all`}
                  style={{ width: `${(strength.score / 5) * 100}%` }}
                />
              </div>
              <p className="text-xs text-stone-500 mt-1">비밀번호 강도: {strength.label}</p>
            </div>
          )}
        </div>
        <div>
          <input
            type="password"
            required
            placeholder="비밀번호 확인"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            className="input-field"
            autoComplete="new-password"
          />
          {mismatch && <p className="text-red-600 text-xs mt-1">비밀번호가 일치하지 않습니다.</p>}
        </div>

        <div className="card !p-4 space-y-3">
          <p className="text-sm font-semibold text-stone-700">보호자 등록 (선택)</p>
          <p className="text-xs text-stone-500">
            등록하시면 가족이 회원님의 기록에 접근할 수 있습니다. 나중에 설정에서도 추가할 수 있어요.
          </p>
          <input
            type="email"
            placeholder="보호자 이메일"
            value={guardianEmail}
            onChange={(e) => setGuardianEmail(e.target.value)}
            className="input-field"
          />
          <input
            type="text"
            placeholder="보호자 이름 (선택)"
            value={guardianName}
            onChange={(e) => setGuardianName(e.target.value)}
            className="input-field"
          />
        </div>

        {error && <p className="text-red-600 text-sm text-center">{error}</p>}

        <button type="submit" disabled={loading || mismatch} className="btn-primary">
          {loading ? "가입 중..." : "회원가입"}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-stone-500">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="text-brand-600 font-semibold">
          로그인
        </Link>
      </div>
    </div>
  );
}
