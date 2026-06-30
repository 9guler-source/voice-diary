"use server";

import { createClient } from "@/lib/supabase-server";

export async function getLastSelectedQuestionIds(): Promise<number[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("sessions")
    .select("selected_questions")
    .eq("user_id", user.id)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.selected_questions) return [];
  const ids = data.selected_questions;
  return Array.isArray(ids) ? (ids as number[]) : [];
}
