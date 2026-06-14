"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { useEmployee, useUpdateEmployee } from "@/lib/hooks/useEmployees"
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

export default function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params) as { id: string }
  const router = useRouter()
  const { data: emp, isLoading } = useEmployee(id)
  const { mutate: update, isPending } = useUpdateEmployee(id)

  const [form, setForm] = useState({
    department: "",
    position: "",
    employmentType: "full_time",
    basicSalary: "",
    hiredAt: "",
  })

  useEffect(() => {
    if (emp) {
      setForm({
        department: emp.department,
        position: emp.position,
        employmentType: emp.employmentType,
        basicSalary: emp.basicSalary,
        hiredAt: emp.hiredAt,
      })
    }
  }, [emp])

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    update(form, { onSuccess: () => router.push("/employees") })
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Input value={form.department} onChange={(e) => set("department", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Position</Label>
                <Input value={form.position} onChange={(e) => set("position", e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label>Hired Date</Label>
              <Input type="date" value={form.hiredAt} onChange={(e) => set("hiredAt", e.target.value)} required />
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
