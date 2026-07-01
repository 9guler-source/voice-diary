"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { guardianLogin } from "./actions";

export default function GuardianLoginPage() {
  const router = useRouter();
  const [userEmail, setUserEmail]             = useState("");
  const [userBirth, setUserBirth]             = useState(""); // YYYYMMDD
  const [guardianEmail, setGuardianEmail]     = useState("");
  const [guardianBirth, setGuardianBirth]     = useState(""); // YYYYMMDD
  const [pin, setPin]                         = useState(""); // 4자리
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await guardianLogin(
      userEmail, userBirth,
      guardianEmail, guardianBirth,
      pin
    );
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
          사용자로부터 받은 정보를 아래에 입력해주세요
        </p>
      </div>

      {/* 안내 박스 */}
      <div className="card !bg-stone-50 !border-stone-200 mb-5 !p-4">
        <p className="text-xs font-semibold text-stone-600 mb-2">입력 순서</p>
        <ul className="text-xs text-stone-500 space-y-1 list-disc list-inside">
          <li>① 사용자(등록하신 분)의 이메일</li>
          <li>② 사용자 생년월일 (예: 19510208)</li>
          <li>③ 보호자 본인 이메일</li>
          <li>④ 보호자 본인 생년월일 (예: 19910812)</li>
          <li>⑤ 등록 시 설정한 비밀번호 (숫자 4자리)</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 사용자 정보 */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">사용자 정보</p>
          <input
            type="email"
            required
            placeholder="사용자 이메일"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            className="input-field"
            autoComplete="off"
          />
          <input
            type="text"
            required
            placeholder="사용자 생년월일 (예: 19510208)"
            value={userBirth}
            onChange={(e) => setUserBirth(e.target.value.replace(/\D/g, "").slice(0, 8))}
            className="input-field"
            inputMode="numeric"
            maxLength={8}
          />
        </div>

        {/* 보호자 정보 */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">보호자 정보</p>
          <input
            type="email"
            required
            placeholder="보호자 이메일 (본인)"
            value={guardianEmail}
            onChange={(e) => setGuardianEmail(e.target.value)}
            className="input-field"
            autoComplete="email"
          />
          <input
            type="text"
            required
            placeholder="보호자 생년월일 (예: 19910812)"
            value={guardianBirth}
            onChange={(e) => setGuardianBirth(e.target.value.replace(/\D/g, "").slice(0, 8))}
            className="input-field"
            inputMode="numeric"
            maxLength={8}
          />
        </div>

        {/* 비밀번호 */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">비밀번호</p>
          <input
            type="password"
            required
            placeholder="숫자 4자리 비밀번호"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="input-field"
            inputMode="numeric"
            maxLength={4}
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
