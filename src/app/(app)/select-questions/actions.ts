"use server";

import { createClient } from "@/lib/supabase-server";
import { getOrCreateProfile } from "@/lib/profile";

export async function getLastSelectedQuestionIds(): Promise<number[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const profile = await getOrCreateProfile(supabase, user);

  const { data, error } = await supabase
    .from("sessions")
    .select("selected_questions")
    .eq("user_id", profile.id)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.selected_questions) return [];
  const ids = data.selected_questions;
  return Array.isArray(ids) ? (ids as number[]) : [];
}
