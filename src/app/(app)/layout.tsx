import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase-server'
import TabBar from '@/components/layout/TabBar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-cream pb-20">
      {children}
      <TabBar />
    </div>
  )
}
