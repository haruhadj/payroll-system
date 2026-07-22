"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useSession } from "@/lib/auth/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Plus, Trash2, SlidersHorizontal } from "lucide-react"
import Link from "next/link"
import {
  usePayrollSettings,
  useUpdatePayrollSettings,
  useCompanyProfile,
  useUpdateCompanyProfile,
} from "@/lib/hooks/usePayrollSettings"
import { useEffect } from "react"

function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users")
      if (!res.ok) throw new Error("Failed to load users")
      return res.json()
    },
  })
}

function useUpdateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Failed to update role")
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] })
      toast.success("Role updated")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; email: string; password: string; role: string }) => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? "Failed to create user")
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] })
      qc.invalidateQueries({ queryKey: ["employees", "unlinked-users"] })
      toast.success("User created")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? "Failed to delete user")
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] })
      toast.success("User deleted")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

const roleVariant: Record<string, "default" | "secondary" | "outline"> = {
  admin: "default",
  hr: "secondary",
  employee: "outline",
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id
  const { data: users, isLoading } = useUsers()
  const { mutate: updateRole, isPending } = useUpdateRole()
  const { mutate: deleteUser, isPending: deleting } = useDeleteUser()
  const [pendingRoles, setPendingRoles] = useState<Record<string, string>>({})

  const set = (userId: string, role: string) =>
    setPendingRoles((r) => ({ ...r, [userId]: role }))

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage user accounts and roles</p>
        </div>
        <CreateUserDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Accounts</CardTitle>
          <CardDescription>
            Provision accounts for staff and employees, set their roles, or remove access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
            : users?.map((u: any) => (
                <div
                  key={u.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border px-4 py-3 gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {u.name}
                      {u.id === currentUserId && (
                        <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <Badge variant={roleVariant[u.role]}>{u.role}</Badge>
                    <Select
                      value={pendingRoles[u.id] ?? u.role ?? "employee"}
                      onValueChange={(v) => set(u.id, v ?? "employee")}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="hr">HR</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending || (pendingRoles[u.id] ?? u.role) === u.role}
                      onClick={() =>
                        updateRole(
                          { userId: u.id, role: pendingRoles[u.id] ?? u.role },
                          { onSuccess: () => setPendingRoles((r) => ({ ...r, [u.id]: "" })) },
                        )
                      }
                    >
                      Save
                    </Button>
                    {u.id !== currentUserId && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={deleting}
                        onClick={() => {
                          if (
                            confirm(
                              `Delete ${u.name}? This also removes their employee record and payslips.`,
                            )
                          )
                            deleteUser(u.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
        </CardContent>
      </Card>

      <PayrollConfigCard />

      <CompanyProfileCard />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Manage Options</CardTitle>
            <CardDescription>
              Designations, employment groups, and teams used across the system.
            </CardDescription>
          </div>
          <Link href="/settings/manage">
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" /> Open
            </Button>
          </Link>
        </CardHeader>
      </Card>
    </div>
  )
}

const COMPANY_FIELDS: { key: string; label: string; type?: string; placeholder?: string }[] = [
  { key: "name", label: "Company name", placeholder: "Acme Corp." },
  { key: "address", label: "Address", placeholder: "123 Main St, City" },
  { key: "email", label: "Email", type: "email", placeholder: "info@company.com" },
  { key: "phone", label: "Phone Number", placeholder: "+63 900 000 0000" },
  { key: "website", label: "Website", type: "url", placeholder: "https://company.com" },
  { key: "logoUrl", label: "Logo URL (190 × 60 px)", type: "url", placeholder: "https://…/logo.png" },
]

function CompanyProfileCard() {
  const { data: profile, isLoading } = useCompanyProfile()
  const { mutate: save, isPending } = useUpdateCompanyProfile()
  const [form, setForm] = useState<Record<string, any>>({})

  useEffect(() => {
    if (profile) setForm(profile)
  }, [profile])

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = () => {
    const payload: Record<string, any> = {}
    for (const f of COMPANY_FIELDS) payload[f.key] = form[f.key] ?? ""
    save(payload)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Profile</CardTitle>
        <CardDescription>
          Appears on payslips and reports. Preferred logo size 190 × 60 pixels.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              {COMPANY_FIELDS.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label className="text-xs">{f.label}</Label>
                  <Input
                    type={f.type ?? "text"}
                    placeholder={f.placeholder}
                    value={form[f.key] ?? ""}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving…" : "Save Company Profile"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}

const NUMERIC_FIELDS = ["philhealthRate", "leaveAmount"] as const

const INT_FIELDS = ["workingDaysPerMonth"] as const

// Flat amount + "actual rate" toggle pairs.
const FLAT_RULES: { amount: string; flag: string; label: string }[] = [
  { amount: "leaveAmount", flag: "leaveActualRate", label: "Leave" },
]

const TAX_FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "semi_monthly", label: "Semi-Monthly" },
  { value: "monthly", label: "Monthly" },
]

const WORK_DAYS: { key: string; label: string }[] = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
]

const TOGGLES: { key: string; label: string }[] = [
  { key: "sssEnabled", label: "SSS contribution" },
  { key: "philhealthEnabled", label: "PhilHealth contribution" },
  { key: "pagibigEnabled", label: "Pag-IBIG contribution" },
  { key: "taxEnabled", label: "Withholding tax" },
]

function PayrollConfigCard() {
  const { data: settings, isLoading } = usePayrollSettings()
  const { mutate: save, isPending } = useUpdatePayrollSettings()
  const [form, setForm] = useState<Record<string, any>>({})

  useEffect(() => {
    if (settings) setForm(settings)
  }, [settings])

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const toggleWorkDay = (day: string) =>
    setForm((f) => {
      const days: string[] = f.workDays ?? []
      return {
        ...f,
        workDays: days.includes(day) ? days.filter((d) => d !== day) : [...days, day],
      }
    })

  const handleSave = () => {
    const payload: Record<string, any> = {}
    for (const k of NUMERIC_FIELDS) payload[k] = String(form[k] ?? "0")
    for (const k of INT_FIELDS) payload[k] = parseInt(form[k] ?? "0") || 0
    for (const t of TOGGLES) payload[t.key] = !!form[t.key]
    for (const r of FLAT_RULES) payload[r.flag] = !!form[r.flag]
    payload.thirteenthMonthEveryCutoff = !!form.thirteenthMonthEveryCutoff
    payload.adminEmail = form.adminEmail || null
    payload.hrEmail = form.hrEmail || null
    payload.withholdingTaxFrequency = form.withholdingTaxFrequency ?? "semi_monthly"
    payload.workDays = form.workDays?.length ? form.workDays : ["mon", "tue", "wed", "thu", "fri"]
    payload.enableClockInOut = !!form.enableClockInOut
    payload.lateDeductionEnabled = !!form.lateDeductionEnabled
    payload.standardTimeIn = form.standardTimeIn || "08:00"
    payload.standardTimeOut = form.standardTimeOut || "17:00"
    payload.lateGracePeriodMinutes = parseInt(form.lateGracePeriodMinutes ?? "0") || 0
    save(payload)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payroll Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payroll Configuration</CardTitle>
        <CardDescription>
          Rates and government-mandated contributions applied when processing payroll.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold mb-3">School Week</h3>
          <p className="text-[11px] text-muted-foreground mb-3">
            Days counted as scheduled working days. Staff are paid for every one of these
            days unless an absence is logged or unpaid leave is approved.
          </p>
          <div className="flex flex-wrap gap-2">
            {WORK_DAYS.map((d) => {
              const active = (form.workDays ?? []).includes(d.key)
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => toggleWorkDay(d.key)}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {d.label}
                </button>
              )
            })}
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-semibold mb-3">Working Time</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Working days / month</Label>
              <Input
                type="number"
                min="1"
                value={form.workingDaysPerMonth ?? ""}
                onChange={(e) => set("workingDaysPerMonth", e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Used to derive the daily rate.</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">PhilHealth rate</Label>
              <Input
                type="number"
                step="0.0001"
                min="0"
                value={form.philhealthRate ?? ""}
                onChange={(e) => set("philhealthRate", e.target.value)}
              />
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-semibold mb-3">Daily Time Record (DTR)</h3>
          <p className="text-[11px] text-muted-foreground mb-3">
            Staff clock in/out from their dashboard, or HR records entries manually. When
            lateness deduction is on, minutes past the standard time-in (plus grace period)
            are deducted from basic pay when payroll is processed.
          </p>
          <label className="flex items-center gap-2 text-sm mb-3">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={!!form.enableClockInOut}
              onChange={(e) => set("enableClockInOut", e.target.checked)}
            />
            Enable self-service clock in/out
          </label>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Standard Time In</Label>
              <Input
                type="time"
                value={form.standardTimeIn ?? "08:00"}
                onChange={(e) => set("standardTimeIn", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Standard Time Out</Label>
              <Input
                type="time"
                value={form.standardTimeOut ?? "17:00"}
                onChange={(e) => set("standardTimeOut", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Grace Period (minutes)</Label>
              <Input
                type="number"
                min="0"
                value={form.lateGracePeriodMinutes ?? "0"}
                onChange={(e) => set("lateGracePeriodMinutes", e.target.value)}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm mt-3">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={!!form.lateDeductionEnabled}
              onChange={(e) => set("lateDeductionEnabled", e.target.checked)}
            />
            Deduct lateness from pay when processing payroll
          </label>
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-semibold mb-3">Administrative & Notifications</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Admin Email</Label>
              <Input
                type="email"
                placeholder="admin@company.com"
                value={form.adminEmail ?? ""}
                onChange={(e) => set("adminEmail", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">HR Email</Label>
              <Input
                type="email"
                placeholder="hr@company.com"
                value={form.hrEmail ?? ""}
                onChange={(e) => set("hrEmail", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Withholding Tax Frequency</Label>
              <Select
                value={form.withholdingTaxFrequency ?? "semi_monthly"}
                onValueChange={(v) => set("withholdingTaxFrequency", v ?? "semi_monthly")}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TAX_FREQUENCIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-semibold mb-3">Paid Leave Valuation</h3>
          <p className="text-[11px] text-muted-foreground mb-3">
            Set a flat amount per day, or tick “Actual Rate” to pay approved leave at the
            employee’s own daily rate instead.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {FLAT_RULES.map((r) => (
              <div key={r.amount} className="rounded-md border p-3 space-y-2">
                <Label className="text-xs">{r.label} amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={!!form[r.flag]}
                  value={form[r.amount] ?? ""}
                  onChange={(e) => set(r.amount, e.target.value)}
                />
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={!!form[r.flag]}
                    onChange={(e) => set(r.flag, e.target.checked)}
                  />
                  Actual Rate (use daily rate)
                </label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-semibold mb-3">Government Contributions</h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {TOGGLES.map((t) => (
              <label key={t.key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={!!form[t.key]}
                  onChange={(e) => set(t.key, e.target.checked)}
                />
                {t.label}
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm mt-3">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={!!form.thirteenthMonthEveryCutoff}
              onChange={(e) => set("thirteenthMonthEveryCutoff", e.target.checked)}
            />
            Accrue 13th-month pay every cut-off
          </label>
        </div>

        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving…" : "Save Configuration"}
        </Button>
      </CardContent>
    </Card>
  )
}

function CreateUserDialog() {
  const { mutate: createUser, isPending } = useCreateUser()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee",
  })

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    createUser(form, {
      onSuccess: () => {
        setOpen(false)
        setForm({ name: "", email: "", password: "", role: "employee" })
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            New User
          </Button>
        }
      />
      <DialogContent className="max-w-md w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle>Create User Account</DialogTitle>
          <DialogDescription>
            Provision an admin or HR account. For employees, use Add Employee instead —
            it creates the login and employee record together.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input
              placeholder="Juan dela Cruz"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="juan@company.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Temporary Password</Label>
            <Input
              type="text"
              placeholder="Min. 8 characters"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              minLength={8}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => set("role", v ?? "employee")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              }
            />
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating…" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
