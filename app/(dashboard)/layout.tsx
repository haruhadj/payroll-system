import { auth } from "@/lib/auth/server"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { MobileHeader } from "@/components/mobile-header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/sign-in")

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1 overflow-hidden">
        <MobileHeader />
        <main className="flex-1 overflow-y-auto bg-muted/30">
          <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">{children}</div>
        </main>
        <MobileBottomNav />
      </div>
    </div>
  )
}
