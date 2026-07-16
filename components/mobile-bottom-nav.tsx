"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { useSession } from "@/lib/auth/client"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { SidebarNav } from "./sidebar"
import {
  LayoutDashboard,
  CalendarOff,
  CalendarRange,
  FileText,
  UserCircle,
  Menu,
} from "lucide-react"

type Role = "admin" | "hr" | "employee"

const ALL: Role[] = ["admin", "hr", "employee"]
const STAFF: Role[] = ["admin", "hr"]

interface Tab {
  href: string
  label: string
  icon: any
  roles: Role[]
}

const tabs: Tab[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard, roles: ALL },
  { href: "/leaves", label: "Leaves", icon: CalendarOff, roles: ALL },
  { href: "/payroll", label: "Payroll", icon: CalendarRange, roles: STAFF },
  { href: "/payslips", label: "Payslips", icon: FileText, roles: ["employee"] },
  { href: "/profile", label: "Profile", icon: UserCircle, roles: ALL },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = ((session?.user as any)?.role ?? "employee") as Role
  const [open, setOpen] = useState(false)

  const visible = tabs.filter((t) => t.roles.includes(role)).slice(0, 4)

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/")

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/70 bg-background/90 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5">
        {visible.map((t) => {
          const active = isActive(t.href)
          return (
            <Link
              key={t.href}
              href={t.href}
              className="flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium"
            >
              <span
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                )}
              >
                <t.icon className="h-[18px] w-[18px]" />
              </span>
              <span className={cn(active ? "text-foreground" : "text-muted-foreground")}>
                {t.label}
              </span>
            </Link>
          )
        })}

        <Sheet open={open} onOpenChange={setOpen}>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium text-muted-foreground"
          >
            <span className="flex h-7 w-12 items-center justify-center rounded-full">
              <Menu className="h-[18px] w-[18px]" />
            </span>
            <span>More</span>
          </button>
          <SheetContent side="left" className="p-0 w-72" showCloseButton={false}>
            <SidebarNav onClose={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}
