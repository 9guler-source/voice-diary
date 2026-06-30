"use client";

import { useState, useTransition } from "react";
import { addGuardian, deleteGuardian } from "./actions";

type Guardian = { id: string; guardian_email: string; guardian_name: string | null };

export default function GuardianManager({ initialGuardians }: { initialGuardians: Guardian[] }) {
  const [guardians, setGuardians] = useState(initialGuardians);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("guardianEmail", email);
    fd.set("guardianName", name);

    startTransition(async () => {
      const result = await addGuardian(fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setGuardians((prev) => [{ id: crypto.randomUUID(), guardian_email: email, guardian_name: name || null }, ...prev]);
      setEmail("");
      setName("");
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteGuardian(id);
      if (!result?.error) {
        setGuardians((prev) => prev.filter((g) => g.id !== id));
      }
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
                <p className="text-sm text-stone-700">{g.guardian_email}</p>
                {g.guardian_name && <p className="text-xs text-stone-400">{g.guardian_name}</p>}
              </div>
              <button onClick={() => handleDelete(g.id)} className="text-xs text-red-500">
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="space-y-2 pt-2 border-t border-stone-100">
        <input
          type="email"
          required
          placeholder="보호자 이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field !py-2 text-sm"
        />
        <input
          type="text"
          placeholder="보호자 이름 (선택)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-field !py-2 text-sm"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button type="submit" disabled={isPending} className="btn-secondary !py-2 text-sm">
          {isPending ? "추가 중..." : "+ 보호자 추가"}
        </button>
      </form>
    </div>
  );
}
