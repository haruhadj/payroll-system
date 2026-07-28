"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { signOut, useSession } from "@/lib/auth/client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  LayoutDashboard,
  Users,
  CalendarRange,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
  Building2,
  UserX,
  CalendarOff,
  HandCoins,
  UserCircle,
  Wrench,
  ChevronDown,
  Clock,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/theme-toggle"

type Role = "admin" | "hr" | "employee"

interface NavLeaf {
  href: string
  label: string
  icon: any
  roles: Role[]
}

interface NavGroup {
  label: string
  icon: any
  roles: Role[]
  children: { href: string; label: string; roles: Role[] }[]
}

type NavEntry = NavLeaf | NavGroup

const isGroup = (e: NavEntry): e is NavGroup => "children" in e

const ALL: Role[] = ["admin", "hr", "employee"]
const STAFF: Role[] = ["admin", "hr"]

const navItems: NavEntry[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ALL },
  { href: "/profile", label: "My Profile", icon: UserCircle, roles: ALL },
  { href: "/timelogs", label: "Time Logs", icon: Clock, roles: ALL },
  { href: "/absences", label: "Absences", icon: UserX, roles: STAFF },
  {
    label: "Payroll",
    icon: CalendarRange,
    roles: STAFF,
    children: [
      { href: "/payroll", label: "Payroll Periods", roles: STAFF },
      { href: "/payroll/thirteenth-month", label: "13th Month", roles: STAFF },
      { href: "/payroll/leakage", label: "Leakage Report", roles: STAFF },
    ],
  },
  { href: "/leaves", label: "Leaves", icon: CalendarOff, roles: ALL },
  { href: "/loans", label: "Loans", icon: HandCoins, roles: ALL },
  { href: "/employees", label: "Employees", icon: Users, roles: STAFF },
  { href: "/tools", label: "Tools", icon: Wrench, roles: STAFF },
  { href: "/payslips", label: "My Payslips", icon: FileText, roles: ["employee"] },
  { href: "/feedback", label: "Feedback", icon: MessageSquare, roles: ["employee"] },
  { href: "/feedback/admin", label: "Feedback Reports", icon: MessageSquare, roles: STAFF },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["admin"] },
]

function NavGroupItem({
  group,
  pathname,
  onClose,
  linkClass,
}: {
  group: NavGroup
  pathname: string
  onClose?: () => void
  linkClass: (active: boolean) => string
}) {
  const groupActive = group.children.some(
    (ch) => pathname === ch.href || pathname.startsWith(ch.href + "/"),
  )
  const [open, setOpen] = useState(groupActive)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
          groupActive
            ? "text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <group.icon className={cn("h-4 w-4 shrink-0", groupActive && "text-primary")} />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="ml-4 mt-1 space-y-1 border-l pl-3">
          {group.children.map((ch) => (
            <Link
              key={ch.href}
              href={ch.href}
              onClick={onClose}
              className={linkClass(pathname === ch.href)}
            >
              {ch.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function SidebarNav({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const role = (session?.user as any)?.role ?? "employee"

  const visibleItems = navItems
    .filter((item) => item.roles.includes(role))
    .map((item) =>
      isGroup(item)
        ? { ...item, children: item.children.filter((ch) => ch.roles.includes(role)) }
        : item,
    )
    .filter((item) => (isGroup(item) ? item.children.length > 0 : true))

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

  const linkClass = (active: boolean) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
      active
        ? "bg-accent text-accent-foreground font-semibold shadow-xs"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    )

  return (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="brand-gradient flex h-9 w-9 items-center justify-center rounded-xl shadow-sm">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="font-semibold text-[15px] tracking-tight">PayrollPH</span>
          <span className="text-[11px] text-muted-foreground">Payroll System</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleItems.map((item) =>
          isGroup(item) ? (
            <NavGroupItem
              key={item.label}
              group={item}
              pathname={pathname}
              onClose={onClose}
              linkClass={linkClass}
            />
          ) : (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={linkClass(
                pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href)),
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          ),
        )}
      </nav>

      <div className="p-3">
        <div className="rounded-xl border border-border/70 bg-card p-3 shadow-xs">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="brand-gradient text-xs font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{session?.user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
            <ThemeToggle />
          </div>
          <Separator className="my-2.5" />
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
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="flex flex-col w-64 border-r border-border/70 h-full bg-sidebar">
      <SidebarNav />
    </aside>
  )
}
