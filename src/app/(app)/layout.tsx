import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase-server'
import TabBar from '@/components/layout/TabBar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-cream pb-24">
      {children}
      <footer className="py-3 text-center">
        <p className="text-xs text-muted/50">© 2026 Young Sohk Song (宋映錫 · 송영석). All rights reserved.</p>
      </footer>
      <TabBar />
    </div>
  )
}
