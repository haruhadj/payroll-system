"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useCreateEmployee, useUnlinkedUsers } from "@/lib/hooks/useEmployees"
import { useSchedules } from "@/lib/hooks/useSchedules"
import { useOptions } from "@/lib/hooks/useOptions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NewEmployeePage() {
  const router = useRouter()
  const { mutate: create, isPending } = useCreateEmployee()
  const { data: users } = useUnlinkedUsers()
  const { data: schedules } = useSchedules()
  const { data: options } = useOptions()

  const [form, setForm] = useState({
    userId: "",
    employeeNo: "",
    department: "",
    position: "",
    groupName: "",
    employmentType: "full_time",
    basicSalary: "",
    allowance: "",
    hiredAt: "",
    scheduleId: "none",
  })

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ...form,
      allowance: form.allowance || "0",
      groupName: form.groupName || null,
      scheduleId: form.scheduleId === "none" ? null : form.scheduleId,
    }
    create(payload, { onSuccess: () => router.push("/employees") })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/employees">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add Employee</h1>
          <p className="text-muted-foreground">Create a new employee record</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Employee Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Linked User Account</Label>
              <Select value={form.userId} onValueChange={(v) => set("userId", v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user…" />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Employee No.</Label>
                <Input
                  placeholder="EMP-001"
                  value={form.employeeNo}
                  onChange={(e) => set("employeeNo", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Hired Date</Label>
                <Input
                  type="date"
                  value={form.hiredAt}
                  onChange={(e) => set("hiredAt", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Team (Department)</Label>
                <Select value={form.department} onValueChange={(v) => set("department", v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team…" />
                  </SelectTrigger>
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
                  <SelectTrigger>
                    <SelectValue placeholder="Select designation…" />
                  </SelectTrigger>
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
                  <SelectTrigger>
                    <SelectValue placeholder="Select group…" />
                  </SelectTrigger>
                  <SelectContent>
                    {options?.groups?.map((g) => (
                      <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Employment Type</Label>
                <Select
                  value={form.employmentType}
                  onValueChange={(v) => set("employmentType", v ?? "full_time")}
                >
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
                  placeholder="30000"
                  value={form.basicSalary}
                  onChange={(e) => set("basicSalary", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Monthly Allowance (PHP)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={form.allowance}
                  onChange={(e) => set("allowance", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Transportation, meal, and other non-taxable allowances.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Work Schedule</Label>
              <Select
                value={form.scheduleId}
                onValueChange={(v) => set("scheduleId", v ?? "none")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No schedule" />
                </SelectTrigger>
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

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating…" : "Create Employee"}
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
