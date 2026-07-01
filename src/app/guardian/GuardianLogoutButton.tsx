"use client";

import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function GuardianLogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/guardian-login");
    router.refresh();
  }

  return (
    <button onClick={handleLogout} className="text-xs text-white/80 underline">
      로그아웃
    </button>
  );
}
