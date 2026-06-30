"use client";

import { useRouter } from "next/navigation";

export default function GuardianLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/guardian/logout", { method: "POST" });
    router.push("/guardian-login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="text-xs text-white/80 underline"
    >
      로그아웃
    </button>
  );
}
