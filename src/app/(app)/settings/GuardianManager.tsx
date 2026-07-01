"use client";

import { useState, useTransition } from "react";
import { addGuardian, deleteGuardian } from "./actions";
import InfoConfirmModal, { type InfoItem } from "@/components/InfoConfirmModal";
import { parseBirthDate, formatBirthDateKo, isValidPin } from "@/lib/birthDate";

type Guardian = { id: string; email: string; name: string; relation: string | null };

export default function GuardianManager({ initialGuardians }: { initialGuardians: Guardian[] }) {
  const [guardians, setGuardians] = useState(initialGuardians);
  const [email, setEmail]             = useState("");
  const [name, setName]               = useState("");
  const [relation, setRelation]       = useState("");
  const [birthDate, setBirthDate]     = useState(""); // YYYYMMDD
  const [pin, setPin]                 = useState(""); // 4자리
  const [error, setError]             = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition]  = useTransition();

  function handleAddClick(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim())    { setError("보호자 이메일을 입력해주세요."); return; }
    if (!name.trim())     { setError("보호자 이름을 입력해주세요."); return; }
    if (!parseBirthDate(birthDate)) { setError("보호자 생년월일을 올바르게 입력해주세요. (예: 19910812)"); return; }
    if (!isValidPin(pin)) { setError("비밀번호는 숫자 4자리이어야 합니다."); return; }
    setShowConfirm(true); // 확인 팝업 열기
  }

  function handleConfirmed() {
    setShowConfirm(false);
    const fd = new FormData();
    fd.set("guardianEmail", email);
    fd.set("guardianName", name);
    fd.set("guardianRelation", relation);
    fd.set("guardianBirthDate", parseBirthDate(birthDate)!);
    fd.set("guardianPin", pin);

    startTransition(async () => {
      const result = await addGuardian(fd);
      if (result?.error) { setError(result.error); return; }
      setGuardians((prev) => [
        { id: crypto.randomUUID(), email, name, relation: relation || null },
        ...prev,
      ]);
      setEmail(""); setName(""); setRelation(""); setBirthDate(""); setPin("");
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteGuardian(id);
      if (!result?.error) setGuardians((prev) => prev.filter((g) => g.id !== id));
    });
  }

  // 확인 팝업에 표시할 정보 (PIN 평문 + highlight)
  const confirmItems: InfoItem[] = [
    { label: "보호자 이메일", value: email },
    { label: "보호자 생년월일", value: formatBirthDateKo(birthDate) || birthDate },
    { label: "비밀번호(4자리)", value: pin, highlight: true },
  ];

  return (
    <div className="space-y-3">
      {/* 등록된 보호자 목록 */}
      {guardians.length === 0 ? (
        <p className="text-sm text-stone-400">등록된 보호자가 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {guardians.map((g) => (
            <li key={g.id} className="flex items-center justify-between bg-stone-50 rounded-xl px-3 py-2">
              <div>
                <p className="text-sm text-stone-700">
                  {g.name}{g.relation && <span className="text-stone-400"> · {g.relation}</span>}
                </p>
                <p className="text-xs text-stone-400">{g.email}</p>
              </div>
              <button onClick={() => handleDelete(g.id)} className="text-xs text-red-500 ml-2 shrink-0">삭제</button>
            </li>
          ))}
        </ul>
      )}

      {/* 보호자 추가 폼 */}
      <form onSubmit={handleAddClick} className="space-y-2 pt-2 border-t border-stone-100">
        <input type="text" required placeholder="보호자 이름" value={name} onChange={(e) => setName(e.target.value)} className="input-field !py-2 text-sm" />
        <input type="email" required placeholder="보호자 이메일" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field !py-2 text-sm" />
        <input type="text" placeholder="관계 (예: 딸, 아들) — 선택" value={relation} onChange={(e) => setRelation(e.target.value)} className="input-field !py-2 text-sm" />

        <div>
          <input
            type="text"
            required
            placeholder="보호자 생년월일 (예: 19910812)"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value.replace(/\D/g, "").slice(0, 8))}
            className="input-field !py-2 text-sm"
            inputMode="numeric"
            maxLength={8}
          />
          {birthDate.length > 0 && !parseBirthDate(birthDate) && (
            <p className="text-xs text-amber-600 mt-1">8자리 숫자로 입력해주세요. 예: 19910812</p>
          )}
        </div>

        <div>
          <input
            type="password"
            required
            placeholder="로그인 비밀번호 (숫자 4자리)"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="input-field !py-2 text-sm"
            inputMode="numeric"
            maxLength={4}
          />
          {pin.length > 0 && !isValidPin(pin) && (
            <p className="text-xs text-amber-600 mt-1">숫자 4자리를 입력해주세요.</p>
          )}
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button type="submit" disabled={isPending} className="btn-secondary !py-2 text-sm">
          {isPending ? "등록 중..." : "+ 보호자 추가"}
        </button>
      </form>

      {/* 한 번에 확인하는 팝업 */}
      {showConfirm && (
        <InfoConfirmModal
          title="보호자 정보를 확인해주세요"
          message="아래 정보로 보호자를 등록합니다. 모두 정확한지 확인해주세요."
          items={confirmItems}
          warning="비밀번호(4자리)를 꼭 기억하시거나 별도 비밀 유지되는 곳에 메모하세요! 비밀번호를 잊어버리는 경우에 절대 재설정 안되니 유의하시기 바랍니다."
          confirmLabel="맞습니다, 등록하겠습니다"
          cancelLabel="수정하겠습니다"
          onConfirm={handleConfirmed}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
