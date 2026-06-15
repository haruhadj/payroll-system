"use client"

import { Building2 } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-muted/40 px-4 overflow-hidden">
      {/* Brand backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_-10%,oklch(0.6_0.21_264/0.18),transparent)]"
      />
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="brand-gradient flex h-12 w-12 items-center justify-center rounded-2xl shadow-md">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">PayrollPH</h1>
            <p className="text-sm text-muted-foreground">Philippine Payroll Management</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
