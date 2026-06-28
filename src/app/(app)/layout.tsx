import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import TabBar from '@/components/layout/TabBar'

async function getSession() {
  const supabase = createClient<Database, 'voice_diary'>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: 'voice_diary' } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-cream pb-20">
      {children}
      <TabBar />
    </div>
  )
}
