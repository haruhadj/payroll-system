"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { useEmployee, useUpdateEmployee } from "@/lib/hooks/useEmployees"
import { useSchedules } from "@/lib/hooks/useSchedules"
import { useOptions } from "@/lib/hooks/useOptions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

const DEDUCTION_TOGGLES = [
  { key: "deductSss", label: "SSS" },
  { key: "deductPhilhealth", label: "PhilHealth" },
  { key: "deductPagibig", label: "Pag-IBIG" },
  { key: "deductTax", label: "Withholding Tax" },
] as const

export default function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params) as { id: string }
  const router = useRouter()
  const { data: emp, isLoading } = useEmployee(id)
  const { mutate: update, isPending } = useUpdateEmployee(id)
  const { data: schedules } = useSchedules()
  const { data: options } = useOptions()

  const [form, setForm] = useState({
    department: "",
    position: "",
    groupName: "",
    employmentType: "full_time",
    basicSalary: "",
    allowance: "",
    hiredAt: "",
    scheduleId: "none",
    isActive: true,
    deductSss: true,
    deductPhilhealth: true,
    deductPagibig: true,
    deductTax: true,
    latePerMinuteOverride: "",
  })

  useEffect(() => {
    if (emp) {
      setForm({
        department: emp.department,
        position: emp.position,
        groupName: emp.groupName ?? "",
        employmentType: emp.employmentType,
        basicSalary: emp.basicSalary,
        allowance: emp.allowance ?? "0",
        hiredAt: emp.hiredAt,
        scheduleId: emp.scheduleId ?? "none",
        isActive: emp.isActive ?? true,
        deductSss: emp.deductSss ?? true,
        deductPhilhealth: emp.deductPhilhealth ?? true,
        deductPagibig: emp.deductPagibig ?? true,
        deductTax: emp.deductTax ?? true,
        latePerMinuteOverride: emp.latePerMinuteOverride ?? "",
      })
    }
  }, [emp])

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ...form,
      allowance: form.allowance || "0",
      groupName: form.groupName || null,
      scheduleId: form.scheduleId === "none" ? null : form.scheduleId,
      latePerMinuteOverride: form.latePerMinuteOverride || null,
    }
    update(payload, { onSuccess: () => router.push("/employees") })
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/employees">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Employee</h1>
          <p className="text-muted-foreground">{emp?.employeeNo} — {emp?.user?.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Employee Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Team (Department)</Label>
                <Select value={form.department} onValueChange={(v) => set("department", v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Select team…" /></SelectTrigger>
                  <SelectContent>
                    {options?.teams?.map((t) => (
                      <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Designation (Position)</Label>
                <Select value={form.position} onValueChange={(v) => set("position", v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Select designation…" /></SelectTrigger>
                  <SelectContent>
                    {options?.designations?.map((d) => (
                      <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Group (Status)</Label>
                <Select value={form.groupName} onValueChange={(v) => set("groupName", v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Select group…" /></SelectTrigger>
                  <SelectContent>
                    {options?.groups?.map((g) => (
                      <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Employment Type</Label>
                <Select value={form.employmentType} onValueChange={(v) => set("employmentType", v ?? "full_time")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="part_time">Part Time</SelectItem>
                    <SelectItem value="contractual">Contractual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Basic Salary (PHP)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.basicSalary}
                  onChange={(e) => set("basicSalary", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monthly Allowance (PHP)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.allowance}
                  onChange={(e) => set("allowance", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Hired Date</Label>
                <Input type="date" value={form.hiredAt} onChange={(e) => set("hiredAt", e.target.value)} required />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Schedule</Label>
                <Select value={form.scheduleId} onValueChange={(v) => set("scheduleId", v ?? "none")}>
                  <SelectTrigger><SelectValue placeholder="No schedule" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No schedule</SelectItem>
                    {schedules?.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.timeIn}–{s.timeOut})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Late Deduction Override (PHP/min)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Auto (hourly rate ÷ 60)"
                  value={form.latePerMinuteOverride}
                  onChange={(e) => set("latePerMinuteOverride", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={form.isActive}
                  onChange={(e) => set("isActive", e.target.checked)}
                />
                Active employee (inactive staff are excluded from payroll)
              </label>
              <div>
                <p className="text-sm font-medium mb-2">Government Contributions</p>
                <div className="grid grid-cols-2 gap-2">
                  {DEDUCTION_TOGGLES.map((t) => (
                    <label key={t.key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={form[t.key]}
                        onChange={(e) => set(t.key, e.target.checked)}
                      />
                      {t.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : "Save Changes"}
              </Button>
              <Link href="/employees">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
