"use client"

import { useState } from "react"
import { useSession } from "@/lib/auth/client"
import { useEmployees } from "@/lib/hooks/useEmployees"
import {
  useLeaveRequests,
  useLeaveCredits,
  useCreateLeaveRequest,
  useUpdateLeaveStatus,
  useDeleteLeaveRequest,
  useUpsertLeaveCredit,
  type LeaveRequestInput,
  type LeaveCreditInput,
  type LeaveType,
} from "@/lib/hooks/useLeaves"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { Plus, Check, X, Trash2 } from "lucide-react"

const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: "vacation", label: "Vacation" },
  { value: "sick", label: "Sick" },
  { value: "emergency", label: "Emergency" },
  { value: "unpaid", label: "Unpaid" },
]
const typeLabel = Object.fromEntries(LEAVE_TYPES.map((t) => [t.value, t.label]))

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  pending: "secondary",
  approved: "default",
  rejected: "outline",
}

function inclusiveDays(from: string, to: string): number {
  if (!from || !to) return 0
  const a = new Date(from)
  const b = new Date(to)
  const diff = Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1
  return diff > 0 ? diff : 0
}

export default function LeavesPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role ?? "employee"
  const isManager = role === "admin" || role === "hr"

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Leaves</h1>
          <p className="text-muted-foreground">
            {isManager
              ? "Review leave applications and manage leave credits."
              : "Apply for leave and track your remaining credits."}
          </p>
        </div>
        <LeaveRequestDialog isManager={isManager} />
      </div>

      <LeaveCreditsCard isManager={isManager} />
      <LeaveRequestsCard isManager={isManager} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Leave credits
// ---------------------------------------------------------------------------

function LeaveCreditsCard({ isManager }: { isManager: boolean }) {
  const { data: credits, isLoading } = useLeaveCredits()

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>{isManager ? "Leave Credits" : "My Leave Credits"}</CardTitle>
          <CardDescription>
            Remaining paid-leave days. Approving a paid leave deducts from these.
          </CardDescription>
        </div>
        {isManager && <SetCreditsDialog />}
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {isManager && <TableHead>Employee</TableHead>}
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Balance (days)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: isManager ? 3 : 2 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : credits?.length ? (
                credits.map((c: any) => (
                  <TableRow key={c.id}>
                    {isManager && (
                      <TableCell>
                        <span className="font-medium">{c.employee?.user?.name ?? "—"}</span>
                        <span className="text-xs text-muted-foreground ml-2 font-mono">
                          {c.employee?.employeeNo}
                        </span>
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant="secondary">{typeLabel[c.type] ?? c.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {parseFloat(c.balance).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={isManager ? 3 : 2}
                    className="text-center text-muted-foreground py-8"
                  >
                    No leave credits set.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function SetCreditsDialog() {
  const { data: employees } = useEmployees()
  const { mutate: upsert, isPending } = useUpsertLeaveCredit()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<LeaveCreditInput>({
    employeeId: "",
    type: "vacation",
    balance: "",
  })

  const set = (k: keyof LeaveCreditInput, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    upsert(form, { onSuccess: () => setOpen(false) })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" /> Set Credits
          </Button>
        }
      />
      <DialogContent className="max-w-md w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle>Set Leave Credits</DialogTitle>
          <DialogDescription>
            Assign or overwrite the running balance for an employee and leave type.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select value={form.employeeId} onValueChange={(v) => set("employeeId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee">
                  {(value: string) => {
                    const emp = employees?.find((e: any) => e.id === value)
                    return emp ? `${emp.user?.name ?? emp.employeeNo} (${emp.employeeNo})` : "Select employee"
                  }}
                </SelectValue>
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
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => set("type", v ?? "vacation")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.filter((t) => t.value !== "unpaid").map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Balance (days)</Label>
            <Input
              type="number"
              min="0"
              step="0.5"
              placeholder="5"
              value={form.balance}
              onChange={(e) => set("balance", e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancel</Button>} />
            <Button type="submit" disabled={isPending || !form.employeeId}>
              {isPending ? "Saving…" : "Save Credits"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Leave requests
// ---------------------------------------------------------------------------

function LeaveRequestsCard({ isManager }: { isManager: boolean }) {
  const { data: requests, isLoading } = useLeaveRequests()
  const { mutate: updateStatus, isPending: updating } = useUpdateLeaveStatus()
  const { mutate: remove, isPending: deleting } = useDeleteLeaveRequest()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave Requests</CardTitle>
        <CardDescription>
          {isManager
            ? "Approve or reject pending applications."
            : "Your submitted leave applications."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {isManager && <TableHead>Employee</TableHead>}
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead className="text-right">Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: isManager ? 6 : 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : requests?.length ? (
                requests.map((r: any) => (
                  <TableRow key={r.id}>
                    {isManager && (
                      <TableCell>
                        <span className="font-medium">{r.employee?.user?.name ?? "—"}</span>
                        <span className="text-xs text-muted-foreground ml-2 font-mono">
                          {r.employee?.employeeNo}
                        </span>
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant="secondary">{typeLabel[r.type] ?? r.type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm whitespace-nowrap">
                      {r.dateFrom} → {r.dateTo}
                      {r.reason && (
                        <p className="text-xs text-muted-foreground font-sans">{r.reason}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {parseFloat(r.days).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[r.status]} className="capitalize">
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {isManager && r.status === "pending" && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-green-600 hover:text-green-700"
                              disabled={updating}
                              onClick={() => updateStatus({ id: r.id, status: "approved" })}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              disabled={updating}
                              onClick={() => updateStatus({ id: r.id, status: "rejected" })}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {(isManager || r.status === "pending") && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            disabled={deleting}
                            onClick={() => {
                              if (confirm("Delete this leave request?")) remove(r.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={isManager ? 6 : 5}
                    className="text-center text-muted-foreground py-8"
                  >
                    No leave requests yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function LeaveRequestDialog({ isManager }: { isManager: boolean }) {
  const { data: employees } = useEmployees()
  const { mutate: create, isPending } = useCreateLeaveRequest()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<LeaveRequestInput>({
    employeeId: "",
    type: "vacation",
    dateFrom: "",
    dateTo: "",
    days: "1",
    reason: "",
  })

  const set = (k: keyof LeaveRequestInput, v: any) => setForm((f) => ({ ...f, [k]: v }))

  // Keep the day count in step with the selected date range.
  const setDate = (k: "dateFrom" | "dateTo", v: string) => {
    setForm((f) => {
      const next = { ...f, [k]: v }
      const d = inclusiveDays(next.dateFrom, next.dateTo)
      if (d > 0) next.days = String(d)
      return next
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: LeaveRequestInput = { ...form }
    if (!isManager) delete payload.employeeId
    create(payload, {
      onSuccess: () => {
        setOpen(false)
        setForm({ employeeId: "", type: "vacation", dateFrom: "", dateTo: "", days: "1", reason: "" })
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" /> Apply for Leave
          </Button>
        }
      />
      <DialogContent className="max-w-md w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle>Apply for Leave</DialogTitle>
          <DialogDescription>
            Paid leaves (vacation, sick, emergency) draw from leave credits; unpaid leave
            simply excuses the absence.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isManager && (
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={form.employeeId} onValueChange={(v) => set("employeeId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee">
                    {(value: string) => {
                      const emp = employees?.find((e: any) => e.id === value)
                      return emp ? `${emp.user?.name ?? emp.employeeNo} (${emp.employeeNo})` : "Select employee"
                    }}
                  </SelectValue>
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
          )}
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => set("type", v ?? "vacation")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>From</Label>
              <Input
                type="date"
                value={form.dateFrom}
                onChange={(e) => setDate("dateFrom", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Input
                type="date"
                value={form.dateTo}
                onChange={(e) => setDate("dateTo", e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Days</Label>
            <Input
              type="number"
              min="0.5"
              step="0.5"
              value={form.days}
              onChange={(e) => set("days", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Textarea
              placeholder="Short note for the approver"
              value={form.reason ?? ""}
              onChange={(e) => set("reason", e.target.value)}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancel</Button>} />
            <Button type="submit" disabled={isPending || (isManager && !form.employeeId)}>
              {isPending ? "Submitting…" : "Submit Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
