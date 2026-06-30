"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { guardianLogin } from "./actions";

export default function GuardianLoginPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await guardianLogin(userEmail, guardianEmail, password);
    setLoading(false);

    if (!result.ok) {
      setError(result.error ?? "로그인에 실패했습니다.");
      return;
    }

    router.push("/guardian/records");
    router.refresh();
  }

  return (
    <div className="flex-1 flex flex-col justify-center px-6 py-10">
      <div className="text-center mb-8">
        <p className="text-xs font-semibold text-brand-600 tracking-widest mb-2">GUARDIAN ACCESS</p>
        <h1 className="text-xl font-bold text-stone-800">보호자 로그인</h1>
        <p className="text-sm text-stone-400 mt-2">
          등록 시 받으신 안내 메일의 정보를 입력해주세요
        </p>
      </div>

      {/* 입력 안내 박스 */}
      <div className="card !bg-stone-50 !border-stone-200 mb-5 !p-4">
        <p className="text-xs text-stone-500 leading-relaxed">
          보호자로 등록되셨다면 안내 메일에서 아래 세 가지 정보를 확인하실 수 있습니다.
        </p>
        <ul className="text-xs text-stone-600 mt-2 space-y-1 list-disc list-inside">
          <li>사용자(회원님)의 이메일</li>
          <li>보호자 본인 이메일</li>
          <li>메일로 발송된 임시 비밀번호</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-stone-500 mb-1 block">
            사용자 이메일 (열람하려는 분의 이메일)
          </label>
          <input
            type="email"
            required
            placeholder="예: parent@email.com"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            className="input-field"
            autoComplete="off"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-stone-500 mb-1 block">
            보호자 이메일 (본인 이메일)
          </label>
          <input
            type="email"
            required
            placeholder="예: guardian@email.com"
            value={guardianEmail}
            onChange={(e) => setGuardianEmail(e.target.value)}
            className="input-field"
            autoComplete="email"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-stone-500 mb-1 block">
            임시 비밀번호 (메일로 받으신 비밀번호)
          </label>
          <input
            type="password"
            required
            placeholder="예: smartMoon1234"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "확인 중..." : "보호자로 로그인"}
        </button>
      </form>

      <div className="mt-8 text-center">
        <Link href="/login" className="text-sm text-stone-400 underline">
          일반 사용자 로그인으로
        </Link>
      </div>
    </div>
  );
}
