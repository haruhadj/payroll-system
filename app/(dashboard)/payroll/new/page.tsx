"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useCreatePayrollPeriod } from "@/lib/hooks/usePayroll"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NewPayrollPeriodPage() {
  const router = useRouter()
  const { mutate: create, isPending } = useCreatePayrollPeriod()
  const [form, setForm] = useState({ label: "", dateFrom: "", dateTo: "" })
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    create(form, { onSuccess: () => router.push("/payroll") })
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Link href="/payroll">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Payroll Period</h1>
          <p className="text-muted-foreground">Define a payroll cutoff window</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Period Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                placeholder="e.g. June 1–15, 2025"
                value={form.label}
                onChange={(e) => set("label", e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date From</Label>
                <Input type="date" value={form.dateFrom} onChange={(e) => set("dateFrom", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Date To</Label>
                <Input type="date" value={form.dateTo} onChange={(e) => set("dateTo", e.target.value)} required />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating…" : "Create Period"}
              </Button>
              <Link href="/payroll">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
