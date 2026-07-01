"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { updateProfileBirthDate, registerGuardianAfterSignup } from "./actions";
import InfoConfirmModal, { type InfoItem } from "@/components/InfoConfirmModal";
import { parseBirthDate, formatBirthDateKo, isValidPin } from "@/lib/birthDate";

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

  // 사용자 정보
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState(""); // YYYYMMDD 형식
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  // 보호자 정보 (선택)
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianBirthDate, setGuardianBirthDate] = useState(""); // YYYYMMDD 형식
  const [guardianPin, setGuardianPin] = useState(""); // 4자리 숫자

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmPopup, setConfirmPopup] = useState(false); // 이메일 인증 팝업

  const strength = useMemo(() => getStrength(password), [password]);
  const mismatch = password2.length > 0 && password !== password2;

  function validate(): string | null {
    if (!email.trim()) return "이메일을 입력해주세요.";
    if (!birthDate.trim()) return "생년월일을 입력해주세요. (예: 19510208)";
    if (!parseBirthDate(birthDate)) return "생년월일 형식이 올바르지 않습니다. (예: 19510208)";
    if (password.length < 8) return "비밀번호는 8자 이상이어야 합니다.";
    if (password !== password2) return "비밀번호가 일치하지 않습니다.";

    // 보호자 정보 — 하나라도 입력했으면 전체 필수
    const hasGuardian = guardianEmail || guardianBirthDate || guardianPin;
    if (hasGuardian) {
      if (!guardianEmail.trim()) return "보호자 이메일을 입력해주세요.";
      if (!guardianBirthDate.trim()) return "보호자 생년월일을 입력해주세요. (예: 19910812)";
      if (!parseBirthDate(guardianBirthDate)) return "보호자 생년월일 형식이 올바르지 않습니다. (예: 19910812)";
      if (!isValidPin(guardianPin)) return "비밀번호는 숫자 4자리이어야 합니다.";
    }
    return null;
  }

  // 폼 제출 → 확인 팝업 표시
  function handleSubmitClick(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setShowConfirm(true);
  }

  // 확인 팝업에서 "맞습니다" → 실제 가입 진행
  async function handleConfirmed() {
    setShowConfirm(false);
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

    if (data.session) {
      const parsedBirth = parseBirthDate(birthDate)!;

      // 생년월일 프로필 저장
      await updateProfileBirthDate(parsedBirth);

      // 보호자 정보 있으면 함께 저장
      const hasGuardian = guardianEmail && guardianBirthDate && guardianPin;
      if (hasGuardian) {
        await registerGuardianAfterSignup(
          guardianEmail,
          guardianName || "보호자",
          parseBirthDate(guardianBirthDate)!,
          guardianPin,
          email,
          parsedBirth
        );
      }

      setLoading(false);
      window.location.href = "/home";
    } else {
      setLoading(false);
      setConfirmPopup(true); // 이메일 인증 필요
    }
  }

  // 확인 팝업에 표시할 항목 구성
  const confirmItems = useMemo((): InfoItem[] => {
    const items: InfoItem[] = [
      { label: "이메일", value: email },
      { label: "생년월일", value: formatBirthDateKo(birthDate) || birthDate },
    ];
    if (guardianEmail) {
      items.push({ label: "보호자 이메일", value: guardianEmail });
      if (guardianBirthDate)
        items.push({ label: "보호자 생년월일", value: formatBirthDateKo(guardianBirthDate) || guardianBirthDate });
      if (guardianPin)
        items.push({ label: "비밀번호(4자리)", value: guardianPin, sensitive: true });
    }
    return items;
  }, [email, birthDate, guardianEmail, guardianBirthDate, guardianPin]);

  if (confirmPopup) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="card">
          <h2 className="text-lg font-bold mb-2">이메일을 확인해주세요</h2>
          <p className="text-stone-600 text-sm mb-6">
            {email} 주소로 인증 메일을 보냈습니다. 메일 속 링크를 눌러 가입을 완료해주세요.
          </p>
          <Link href="/login" className="btn-primary inline-block text-center">로그인 화면으로</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-center px-6 py-10">
      <h1 className="text-xl font-bold text-stone-800 mb-6 text-center">회원가입</h1>

      <form onSubmit={handleSubmitClick} className="space-y-4">
        <input type="text" placeholder="이름 (선택)" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input-field" />

        <input type="email" required placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" autoComplete="email" />

        <div>
          <input
            type="text"
            required
            placeholder="생년월일 (예: 19510208)"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value.replace(/\D/g, "").slice(0, 8))}
            className="input-field"
            inputMode="numeric"
            maxLength={8}
          />
          {birthDate.length > 0 && !parseBirthDate(birthDate) && (
            <p className="text-xs text-amber-600 mt-1">8자리 숫자로 입력해주세요. 예: 19510208</p>
          )}
        </div>

        <div>
          <input type="password" required placeholder="비밀번호 (8자 이상)" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" autoComplete="new-password" />
          {password.length > 0 && (
            <div className="mt-2">
              <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
                <div className={`h-full ${strength.color} transition-all`} style={{ width: `${(strength.score / 5) * 100}%` }} />
              </div>
              <p className="text-xs text-stone-500 mt-1">비밀번호 강도: {strength.label}</p>
            </div>
          )}
        </div>

        <div>
          <input type="password" required placeholder="비밀번호 확인" value={password2} onChange={(e) => setPassword2(e.target.value)} className="input-field" autoComplete="new-password" />
          {mismatch && <p className="text-red-600 text-xs mt-1">비밀번호가 일치하지 않습니다.</p>}
        </div>

        {/* 보호자 정보 */}
        <div className="card !p-4 space-y-3">
          <p className="text-sm font-semibold text-stone-700">보호자 등록 (선택)</p>
          <p className="text-xs text-stone-400">나중에 설정에서도 추가할 수 있어요.</p>

          <input type="text" placeholder="보호자 이름 (선택)" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} className="input-field" />
          <input type="email" placeholder="보호자 이메일" value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} className="input-field" />
          <div>
            <input
              type="text"
              placeholder="보호자 생년월일 (예: 19910812)"
              value={guardianBirthDate}
              onChange={(e) => setGuardianBirthDate(e.target.value.replace(/\D/g, "").slice(0, 8))}
              className="input-field"
              inputMode="numeric"
              maxLength={8}
            />
            {guardianBirthDate.length > 0 && !parseBirthDate(guardianBirthDate) && (
              <p className="text-xs text-amber-600 mt-1">예: 19910812</p>
            )}
          </div>
          <div>
            <input
              type="password"
              placeholder="보호자 로그인 비밀번호 (숫자 4자리)"
              value={guardianPin}
              onChange={(e) => setGuardianPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="input-field"
              inputMode="numeric"
              maxLength={4}
            />
            {guardianPin.length > 0 && !isValidPin(guardianPin) && (
              <p className="text-xs text-amber-600 mt-1">숫자 4자리를 입력해주세요.</p>
            )}
          </div>
        </div>

        {error && <p className="text-red-600 text-sm text-center">{error}</p>}

        <button type="submit" disabled={loading || mismatch} className="btn-primary">
          {loading ? "가입 중..." : "회원가입"}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-stone-500">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="text-brand-600 font-semibold">로그인</Link>
      </div>

      {/* 입력 정보 전체 확인 팝업 */}
      {showConfirm && (
        <InfoConfirmModal
          title="입력하신 정보를 확인해주세요"
          message="아래 내용이 모두 정확한지 확인 후 가입을 진행해주세요."
          items={confirmItems}
          confirmLabel="모두 맞습니다, 가입하기"
          cancelLabel="수정하겠습니다"
          onConfirm={handleConfirmed}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
