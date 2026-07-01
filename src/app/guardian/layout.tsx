import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { isGuardianEmail } from "@/lib/guardian-email";
import GuardianLogoutButton from "./GuardianLogoutButton";

export default async function GuardianLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 보호자 세션 검증 (일반 Supabase 세션 사용)
  if (!user || !isGuardianEmail(user.email ?? "")) {
    redirect("/guardian-login");
  }

  // ① 보호자 본인 guardian 행 조회 (RLS: guardian_auth_id = auth.uid())
  const { data: guardian } = await supabase
    .from("guardians")
    .select("user_id, name")
    .eq("guardian_auth_id", user.id)
    .maybeSingle();

  if (!guardian) {
    // DB에 없는 보호자 (삭제된 경우) → 강제 로그아웃
    await supabase.auth.signOut();
    redirect("/guardian-login");
  }

  // ② 담당 사용자 이름 조회 (RLS: profiles_guardian_read 정책 적용)
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", guardian.user_id)
    .maybeSingle();

  const userName = (profile as any)?.name ?? "";

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* 보호자 모드 배너 */}
      <div className="bg-brand-600 text-white px-5 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">👁</span>
          <p className="text-sm font-semibold">
            {userName ? `${userName}님의` : "사용자의"} 기록 열람 중
          </p>
        </div>
        <GuardianLogoutButton />
      </div>
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
