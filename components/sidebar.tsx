"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { signOut, useSession } from "@/lib/auth/client"
import { useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  CalendarRange,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
  Building2,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/theme-toggle"

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "hr", "employee"],
  },
  {
    href: "/employees",
    label: "Employees",
    icon: Users,
    roles: ["admin", "hr"],
  },
  {
    href: "/payroll",
    label: "Payroll Periods",
    icon: CalendarRange,
    roles: ["admin", "hr"],
  },
  {
    href: "/payslips",
    label: "My Payslips",
    icon: FileText,
    roles: ["employee"],
  },
  {
    href: "/feedback",
    label: "Feedback",
    icon: MessageSquare,
    roles: ["employee"],
  },
  {
    href: "/feedback/admin",
    label: "Feedback Reports",
    icon: MessageSquare,
    roles: ["admin", "hr"],
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    roles: ["admin"],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const role = (session?.user as any)?.role ?? "employee"

  const visibleItems = navItems.filter((item) => item.roles.includes(role))

  const handleSignOut = async () => {
    await signOut()
    router.push("/sign-in")
  }

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside className="flex flex-col w-64 border-r bg-background h-full">
      <div className="flex items-center gap-2 px-6 py-5 border-b">
        <Building2 className="h-5 w-5 text-primary" />
        <span className="font-semibold text-lg">PayrollPH</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <Separator />
      <div className="px-4 py-4 space-y-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{session?.user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{role}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ThemeToggle />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground gap-2"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  )
}
