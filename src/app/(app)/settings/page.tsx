import { createClient } from "@/lib/supabase-server";
import { getOrCreateProfile } from "@/lib/profile";
import { redirect } from "next/navigation";
import GuardianManager from "./GuardianManager";
import PasswordChangeForm from "./PasswordChangeForm";
import FavoritesManager from "./FavoritesManager";
import LogoutButton from "./LogoutButton";
import BirthDateForm from "./BirthDateForm";

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getOrCreateProfile(supabase, user);

  const { data: profileData } = await supabase
    .from("profiles")
    .select("birth_date")
    .eq("id", profile.id)
    .maybeSingle();

  const { data: guardians } = await supabase
    .from("guardians")
    .select("id, email, name, relation")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  const birthDate = (profileData as any)?.birth_date ?? null;

  return (
    <div className="flex-1 flex flex-col px-5 pt-6 pb-10 space-y-6 overflow-y-auto">
      <h1 className="text-lg font-bold text-stone-800">설정</h1>

      {/* 계정 정보 */}
      <section className="card space-y-3">
        <h2 className="font-semibold text-stone-700">계정</h2>
        <p className="text-sm text-stone-500">{user.email}</p>
        <p className="text-xs text-stone-400">{profile.name}님</p>
      </section>

      {/* ★ 내 생년월일 — 보호자 등록 및 로그인에 필수 */}
      <section className="card space-y-3">
        <h2 className="font-semibold text-stone-700">내 생년월일</h2>
        {birthDate ? (
          <p className="text-sm text-green-700 font-semibold">
            ✅ {birthDate.replace(/(\d{4})-(\d{2})-(\d{2})/, "$1년 $2월 $3일")}
          </p>
        ) : (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
            <p className="text-xs text-amber-700 font-semibold">
              ⚠️ 생년월일이 설정되지 않았습니다. 보호자 등록 및 보호자 로그인에 필수입니다.
            </p>
          </div>
        )}
        <BirthDateForm currentBirthDate={birthDate} />
      </section>

      {/* 가족(보호자) 관리 */}
      <section className="card space-y-3">
        <h2 className="font-semibold text-stone-700">가족 관리</h2>
        <p className="text-xs text-stone-400">
          등록된 보호자는 전용 로그인 화면에서 회원님의 기록을 열람할 수 있습니다.
        </p>
        {!birthDate && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2">
            <p className="text-xs text-red-700">
              ❌ 먼저 위의 '내 생년월일'을 설정해야 보호자를 추가할 수 있습니다.
            </p>
          </div>
        )}
        <GuardianManager initialGuardians={guardians ?? []} />
      </section>

      {/* 즐겨찾는 문항 */}
      <section className="card space-y-3">
        <h2 className="font-semibold text-stone-700">즐겨찾는 문항</h2>
        <FavoritesManager />
      </section>

      {/* 비밀번호 변경 */}
      <section className="card space-y-3">
        <h2 className="font-semibold text-stone-700">비밀번호 변경</h2>
        <PasswordChangeForm />
      </section>

      <LogoutButton />
    </div>
  );
}
