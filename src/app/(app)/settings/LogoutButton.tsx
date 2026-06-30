"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button onClick={handleLogout} className="btn-secondary !text-red-600 !border-red-200">
      로그아웃
    </button>
  );
}
