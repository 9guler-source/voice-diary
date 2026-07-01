import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { isGuardianEmail } from "@/lib/guardian-email";
import GuardianLogoutButton from "./GuardianLogoutButton";

export default async function GuardianLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isGuardianEmail(user.email ?? "")) {
    redirect("/guardian-login");
  }

  // 보호자 본인 guardian 행 조회 (RLS: guardian_auth_id = auth.uid())
  const { data: guardian } = await supabase
    .from("guardians")
    .select("user_id")
    .eq("guardian_auth_id", user.id)
    .maybeSingle();

  if (!guardian) {
    await supabase.auth.signOut();
    redirect("/guardian-login");
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <div className="bg-brand-600 text-white px-5 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">👁</span>
          <p className="text-sm font-semibold">사용자의 기록 열람 중</p>
        </div>
        <GuardianLogoutButton />
      </div>
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
