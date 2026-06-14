"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useCreateEmployee, useUnlinkedUsers } from "@/lib/hooks/useEmployees"
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

  const [form, setForm] = useState({
    userId: "",
    employeeNo: "",
    department: "",
    position: "",
    employmentType: "full_time",
    basicSalary: "",
    hiredAt: "",
  })

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    create(form, { onSuccess: () => router.push("/employees") })
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

            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Input
                  placeholder="Finance"
                  value={form.department}
                  onChange={(e) => set("department", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Position</Label>
                <Input
                  placeholder="Accountant"
                  value={form.position}
                  onChange={(e) => set("position", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
