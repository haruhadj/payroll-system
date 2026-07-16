"use client"

import { useState } from "react"
import { useEmployees } from "@/lib/hooks/useEmployees"
import {
  useAbsences,
  useCreateAbsence,
  useDeleteAbsence,
  type AbsenceInput,
} from "@/lib/hooks/useAbsences"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Plus, Trash2 } from "lucide-react"

export default function AbsencesPage() {
  const [employeeId, setEmployeeId] = useState<string>("")
  const { data: employees } = useEmployees()
  const { data: records, isLoading } = useAbsences({
    employeeId: employeeId || undefined,
  })
  const { mutate: remove, isPending: deleting } = useDeleteAbsence()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Absences</h1>
          <p className="text-muted-foreground">
            Every scheduled school day is paid unless logged here. Approved leave is
            handled separately under Leaves.
          </p>
        </div>
        <AbsenceDialog />
      </div>

      <div className="max-w-xs space-y-1">
        <Label className="text-xs">Filter by Employee</Label>
        <Select value={employeeId} onValueChange={(v) => setEmployeeId(v ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="All employees" />
          </SelectTrigger>
          <SelectContent>
            {employees?.map((e: any) => (
              <SelectItem key={e.id} value={e.id}>
                {e.user?.name} ({e.employeeNo})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-background overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : records?.length ? (
              records.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <span className="font-medium">{r.employee?.user?.name ?? "—"}</span>
                    <span className="text-xs text-muted-foreground ml-2 font-mono">
                      {r.employee?.employeeNo}
                    </span>
                  </TableCell>
                  <TableCell>{r.date}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.reason || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={deleting}
                      onClick={() => {
                        if (confirm("Remove this absence record?")) remove(r.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No absences logged.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function AbsenceDialog() {
  const { data: employees } = useEmployees()
  const { mutate: create, isPending } = useCreateAbsence()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<AbsenceInput>({
    employeeId: "",
    date: new Date().toISOString().slice(0, 10),
    reason: "",
  })

  const set = (k: keyof AbsenceInput, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    create(form, {
      onSuccess: () => {
        setOpen(false)
        setForm({
          employeeId: "",
          date: new Date().toISOString().slice(0, 10),
          reason: "",
        })
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" /> Log Absence
          </Button>
        }
      />
      <DialogContent className="max-w-md w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle>Log Absence</DialogTitle>
          <DialogDescription>
            Marks the employee absent (unpaid) for this date when payroll is processed.
            For sick/vacation leave, use Leaves instead.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select value={form.employeeId} onValueChange={(v) => set("employeeId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees?.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.user?.name ?? e.employeeNo} ({e.employeeNo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Input
              placeholder="No call, no show"
              value={form.reason ?? ""}
              onChange={(e) => set("reason", e.target.value)}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancel</Button>} />
            <Button type="submit" disabled={isPending || !form.employeeId}>
              {isPending ? "Saving…" : "Log Absence"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
