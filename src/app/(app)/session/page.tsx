import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import SessionRecorder from "./SessionRecorder";

export default async function SessionPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <SessionRecorder userId={user.id} />;
}
