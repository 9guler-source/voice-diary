import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyGuardianToken } from "@/lib/guardian-session";
import { createAdminClient } from "@/lib/supabase-admin";
import GuardianLogoutButton from "./GuardianLogoutButton";

export default async function GuardianLayout({ children }: { children: React.ReactNode }) {
  // 세션 검증
  const cookieStore = cookies();
  const token = cookieStore.get("vd_guardian_session")?.value;
  const payload = token ? verifyGuardianToken(token) : null;

  if (!payload) {
    redirect("/guardian-login");
  }

  // 열람 대상 사용자 이름 조회
  let userName = "";
  try {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("name")
      .eq("id", payload.uid)
      .maybeSingle();
    userName = profile?.name ?? "";
  } catch {
    // admin 클라이언트 미설정 시 이름 없이 진행
  }

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
