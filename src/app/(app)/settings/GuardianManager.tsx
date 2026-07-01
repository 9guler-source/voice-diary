"use client";

import { useState, useTransition } from "react";
import { addGuardian, deleteGuardian } from "./actions";
import EmailConfirmModal from "@/components/EmailConfirmModal";

type Guardian = { id: string; email: string; name: string; relation: string | null };
type ConfirmStep = "idle" | "first" | "second";

export default function GuardianManager({ initialGuardians }: { initialGuardians: Guardian[] }) {
  const [guardians, setGuardians] = useState(initialGuardians);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [confirmStep, setConfirmStep] = useState<ConfirmStep>("idle");
  const [isPending, startTransition] = useTransition();

  function handleAddClick(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setWarning(null);
    if (!email.trim()) { setError("보호자 이메일을 입력해주세요."); return; }
    if (!name.trim()) { setError("보호자 이름을 입력해주세요."); return; }
    setConfirmStep("first");
  }

  function handleFirstConfirm() {
    setConfirmStep("second");
  }

  function handleSecondConfirm() {
    setConfirmStep("idle");
    const fd = new FormData();
    fd.set("guardianEmail", email);
    fd.set("guardianName", name);
    fd.set("guardianRelation", relation);
    startTransition(async () => {
      const result = await addGuardian(fd);
      if (result?.error) { setError(result.error); return; }
      if ((result as any)?.warning) setWarning((result as any).warning);
      setGuardians((prev) => [{ id: crypto.randomUUID(), email, name, relation: relation || null }, ...prev]);
      setEmail(""); setName(""); setRelation("");
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteGuardian(id);
      if (!result?.error) setGuardians((prev) => prev.filter((g) => g.id !== id));
    });
  }

  return (
    <div className="space-y-3">
      {guardians.length === 0 ? (
        <p className="text-sm text-stone-400">등록된 보호자가 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {guardians.map((g) => (
            <li key={g.id} className="flex items-center justify-between bg-stone-50 rounded-xl px-3 py-2">
              <div>
                <p className="text-sm text-stone-700">{g.name}{g.relation && <span className="text-stone-400"> · {g.relation}</span>}</p>
                <p className="text-xs text-stone-400">{g.email}</p>
              </div>
              <button onClick={() => handleDelete(g.id)} className="text-xs text-red-500 ml-2 shrink-0">삭제</button>
            </li>
          ))}
        </ul>
      )}
      {warning && <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2"><p className="text-xs text-amber-700">{warning}</p></div>}
      <form onSubmit={handleAddClick} className="space-y-2 pt-2 border-t border-stone-100">
        <input type="text" required placeholder="보호자 이름" value={name} onChange={(e) => setName(e.target.value)} className="input-field !py-2 text-sm" />
        <input type="email" required placeholder="보호자 이메일" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field !py-2 text-sm" />
        <input type="text" placeholder="관계 (예: 딸, 아들) — 선택" value={relation} onChange={(e) => setRelation(e.target.value)} className="input-field !py-2 text-sm" />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button type="submit" disabled={isPending} className="btn-secondary !py-2 text-sm">
          {isPending ? "등록 중..." : "+ 보호자 추가"}
        </button>
      </form>

      {confirmStep === "first" && (
        <EmailConfirmModal
          email={email}
          title="보호자 이메일을 확인해주세요"
          message="아래 이메일 주소로 보호자를 등록합니다."
          confirmLabel="맞습니다"
          cancelLabel="수정하겠습니다"
          onConfirm={handleFirstConfirm}
          onCancel={() => setConfirmStep("idle")}
        />
      )}

      {confirmStep === "second" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-6">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-base font-bold text-stone-800 mb-2">정말로 등록하시겠습니까?</h2>
            <div className="rounded-xl bg-brand-50 border border-brand-200 px-4 py-3 mb-3">
              <p className="text-sm font-bold text-brand-700 break-all">{email}</p>
              <p className="text-xs text-brand-500 mt-1">{name}{relation ? ` · ${relation}` : ""}</p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 mb-4">
              <p className="text-xs text-amber-700">등록 즉시 보호자에게 <strong>로그인 안내 메일이 자동 발송</strong>됩니다.</p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setConfirmStep("idle")} className="flex-1 rounded-xl border border-stone-300 py-3 text-sm font-semibold text-stone-700">취소</button>
              <button type="button" onClick={handleSecondConfirm} className="flex-1 rounded-xl bg-brand-600 py-3 text-sm font-bold text-white">등록하겠습니다</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}