import BottomNav from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <main className="flex-1 flex flex-col">{children}</main>
      <BottomNav />
    </div>
  );
}
