"use client"

import { useState } from "react"
import { useSession } from "@/lib/auth/client"
import { useEmployees } from "@/lib/hooks/useEmployees"
import {
  useOvertimeRequests,
  useCreateOvertimeRequest,
  useUpdateOvertimeStatus,
  useDeleteOvertimeRequest,
  type OvertimeRequestInput,
} from "@/lib/hooks/useOvertime"
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

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  pending: "secondary",
  approved: "default",
  rejected: "outline",
}

function hoursBetween(from: string, to: string): number {
  if (!from || !to) return 0
  const [fh, fm] = from.split(":").map(Number)
  const [th, tm] = to.split(":").map(Number)
  const diff = (th * 60 + tm - (fh * 60 + fm)) / 60
  return diff > 0 ? Math.round(diff * 100) / 100 : 0
}

function monthRange(d = new Date()) {
  const y = d.getFullYear()
  const m = d.getMonth()
  const pad = (n: number) => String(n).padStart(2, "0")
  const last = new Date(y, m + 1, 0).getDate()
  return { from: `${y}-${pad(m + 1)}-01`, to: `${y}-${pad(m + 1)}-${pad(last)}` }
}

const MONTH_NAME = new Date().toLocaleString("en-PH", { month: "long" })

export function OvertimeRequestsCard({ month = false }: { month?: boolean }) {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role ?? "employee"
  const isManager = role === "admin" || role === "hr"

  const params = month ? monthRange() : {}
  const { data: requests, isLoading } = useOvertimeRequests(params)
  const { mutate: setStatus, isPending: updating } = useUpdateOvertimeStatus()
  const { mutate: remove, isPending: deleting } = useDeleteOvertimeRequest()

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>
            {month
              ? `Overtime for the month of ${MONTH_NAME}`
              : isManager
                ? "Overtime Requests"
                : "My Overtime"}
          </CardTitle>
          <CardDescription>
            {isManager
              ? "Review and approve overtime filed by employees."
              : "File overtime for approval."}
          </CardDescription>
        </div>
        <OvertimeRequestDialog isManager={isManager} />
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                {isManager && <TableHead>Employee Name</TableHead>}
                <TableHead>Time Range</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Note</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: isManager ? 7 : 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : requests?.length ? (
                requests.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.date}</TableCell>
                    {isManager && (
                      <TableCell>
                        <p className="font-medium">{r.employee?.user?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.employee?.employeeNo}
                        </p>
                      </TableCell>
                    )}
                    <TableCell className="font-mono text-sm">
                      {r.timeFrom} – {r.timeTo}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{r.hours}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[r.status]}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground max-w-[12rem] truncate">
                      {r.note ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {isManager && r.status === "pending" && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-green-600"
                              disabled={updating}
                              onClick={() => setStatus({ id: r.id, status: "approved" })}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              disabled={updating}
                              onClick={() => setStatus({ id: r.id, status: "rejected" })}
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
                              if (confirm("Delete this overtime request?")) remove(r.id)
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
                    colSpan={isManager ? 7 : 6}
                    className="text-center text-muted-foreground py-8"
                  >
                    No overtime applied.
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

function OvertimeRequestDialog({ isManager }: { isManager: boolean }) {
  const { mutate: create, isPending } = useCreateOvertimeRequest()
  const { data: employees } = useEmployees()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    employeeId: "",
    date: "",
    timeFrom: "",
    timeTo: "",
    note: "",
  })
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const hours = hoursBetween(form.timeFrom, form.timeTo)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: OvertimeRequestInput = {
      date: form.date,
      timeFrom: form.timeFrom,
      timeTo: form.timeTo,
      hours: String(hours),
      note: form.note || null,
      ...(isManager && form.employeeId ? { employeeId: form.employeeId } : {}),
    }
    create(payload, {
      onSuccess: () => {
        setOpen(false)
        setForm({ employeeId: "", date: "", timeFrom: "", timeTo: "", note: "" })
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Add Overtime
          </Button>
        }
      />
      <DialogContent className="max-w-md w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle>File Overtime</DialogTitle>
          <DialogDescription>Record overtime hours for approval.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isManager && (
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={form.employeeId} onValueChange={(v) => set("employeeId", v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee…" />
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
          )}
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Time From</Label>
              <Input
                type="time"
                value={form.timeFrom}
                onChange={(e) => set("timeFrom", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Time To</Label>
              <Input
                type="time"
                value={form.timeTo}
                onChange={(e) => set("timeTo", e.target.value)}
                required
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Computed hours: <span className="font-mono font-medium">{hours}</span>
          </p>
          <div className="space-y-2">
            <Label>Note</Label>
            <Textarea
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              placeholder="Reason for overtime…"
              rows={3}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancel</Button>} />
            <Button
              type="submit"
              disabled={isPending || !form.date || hours <= 0 || (isManager && !form.employeeId)}
            >
              {isPending ? "Saving…" : "Submit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
