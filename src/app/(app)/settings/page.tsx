import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import GuardianManager from "./GuardianManager";
import PasswordChangeForm from "./PasswordChangeForm";
import FavoritesManager from "./FavoritesManager";
import LogoutButton from "./LogoutButton";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: guardians } = await supabase
    .from("guardians")
    .select("id, guardian_email, guardian_name")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex-1 flex flex-col px-5 pt-6 pb-10 space-y-6 overflow-y-auto">
      <h1 className="text-lg font-bold text-stone-800">설정</h1>

      <section className="card space-y-3">
        <h2 className="font-semibold text-stone-700">계정</h2>
        <p className="text-sm text-stone-500">{user.email}</p>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold text-stone-700">가족 관리</h2>
        <p className="text-xs text-stone-400">등록된 보호자는 회원님의 기록에 접근할 수 있습니다.</p>
        <GuardianManager initialGuardians={guardians ?? []} />
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold text-stone-700">즐겨찾는 문항</h2>
        <FavoritesManager />
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold text-stone-700">비밀번호 변경</h2>
        <PasswordChangeForm />
      </section>

      <LogoutButton />
    </div>
  );
}
