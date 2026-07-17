"use client"

import { useState } from "react"
import { useSession } from "@/lib/auth/client"
import { useEmployees } from "@/lib/hooks/useEmployees"
import {
  useTimeLogs,
  useTodayTimeLog,
  useCreateTimeLog,
  useUpdateTimeLog,
  useDeleteTimeLog,
  useClockIn,
  useClockOut,
  type TimeLogInput,
} from "@/lib/hooks/useTimeLogs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Plus, Trash2, Pencil, LogIn, LogOut } from "lucide-react"

function fmtTime(v: string | null | undefined): string {
  if (!v) return "—"
  return new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function toInputValue(v: string | null | undefined): string {
  if (!v) return ""
  const d = new Date(v)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function TimeLogsPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role ?? "employee"
  const isManager = role === "admin" || role === "hr"

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Time Logs (DTR)</h1>
          <p className="text-muted-foreground">
            {isManager
              ? "Daily Time Record for all staff. Add or correct entries as needed."
              : "Clock in and out, and review your Daily Time Record."}
          </p>
        </div>
        {isManager && <TimeLogDialog />}
      </div>

      {!isManager && <ClockCard />}
      <TimeLogsTable isManager={isManager} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Self-service clock in/out
// ---------------------------------------------------------------------------

function ClockCard() {
  const { data: rows, isLoading } = useTodayTimeLog("me")
  const { mutate: clockIn, isPending: clockingIn } = useClockIn()
  const { mutate: clockOut, isPending: clockingOut } = useClockOut()

  const today = rows?.[0]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today</CardTitle>
        <CardDescription>
          {today?.timeIn && today?.timeOut
            ? "You've completed today's time record."
            : today?.timeIn
              ? "You're clocked in."
              : "You haven't clocked in yet."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-4">
        <div className="text-sm">
          <span className="text-muted-foreground">Time In: </span>
          <span className="font-mono">{isLoading ? "…" : fmtTime(today?.timeIn)}</span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Time Out: </span>
          <span className="font-mono">{isLoading ? "…" : fmtTime(today?.timeOut)}</span>
        </div>
        <div className="flex gap-2 ml-auto">
          <Button
            onClick={() => clockIn()}
            disabled={clockingIn || !!today?.timeIn}
            size="sm"
          >
            <LogIn className="h-4 w-4 mr-2" /> Clock In
          </Button>
          <Button
            onClick={() => clockOut()}
            disabled={clockingOut || !today?.timeIn || !!today?.timeOut}
            variant="outline"
            size="sm"
          >
            <LogOut className="h-4 w-4 mr-2" /> Clock Out
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// History / admin table
// ---------------------------------------------------------------------------

function TimeLogsTable({ isManager }: { isManager: boolean }) {
  const [employeeId, setEmployeeId] = useState<string>("")
  const { data: employees } = useEmployees()
  const { data: records, isLoading } = useTimeLogs({
    employeeId: isManager ? employeeId || undefined : undefined,
  })
  const { mutate: remove, isPending: deleting } = useDeleteTimeLog()

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>{isManager ? "All Time Logs" : "My Time Logs"}</CardTitle>
        </div>
        {isManager && (
          <div className="w-56 space-y-1">
            <Label className="text-xs">Filter by Employee</Label>
            <Select
              value={employeeId || "all"}
              onValueChange={(v) => setEmployeeId(!v || v === "all" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All employees">
                  {(value: string) => {
                    if (!value || value === "all") return "All employees"
                    const emp = employees?.find((e: any) => e.id === value)
                    return emp ? `${emp.user?.name} (${emp.employeeNo})` : "All employees"
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All employees</SelectItem>
                {employees?.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.user?.name} ({e.employeeNo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {isManager && <TableHead>Employee</TableHead>}
                <TableHead>Date</TableHead>
                <TableHead>Time In</TableHead>
                <TableHead>Time Out</TableHead>
                <TableHead>Source</TableHead>
                {isManager && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: isManager ? 6 : 4 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : records?.length ? (
                records.map((r: any) => (
                  <TableRow key={r.id}>
                    {isManager && (
                      <TableCell>
                        <span className="font-medium">{r.employee?.user?.name ?? "—"}</span>
                        <span className="text-xs text-muted-foreground ml-2 font-mono">
                          {r.employee?.employeeNo}
                        </span>
                      </TableCell>
                    )}
                    <TableCell>{r.date}</TableCell>
                    <TableCell className="font-mono">{fmtTime(r.timeIn)}</TableCell>
                    <TableCell className="font-mono">{fmtTime(r.timeOut)}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">
                      {r.source}
                    </TableCell>
                    {isManager && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <EditTimeLogDialog row={r} />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            disabled={deleting}
                            onClick={() => {
                              if (confirm("Remove this time log?")) remove(r.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={isManager ? 6 : 4}
                    className="text-center text-muted-foreground py-8"
                  >
                    No time logs yet.
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

function TimeLogDialog() {
  const { data: employees } = useEmployees()
  const { mutate: create, isPending } = useCreateTimeLog()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<TimeLogInput>({
    employeeId: "",
    date: new Date().toISOString().slice(0, 10),
    timeIn: "",
    timeOut: "",
  })

  const set = (k: keyof TimeLogInput, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    create(
      {
        ...form,
        timeIn: form.timeIn || null,
        timeOut: form.timeOut || null,
      },
      {
        onSuccess: () => {
          setOpen(false)
          setForm({
            employeeId: "",
            date: new Date().toISOString().slice(0, 10),
            timeIn: "",
            timeOut: "",
          })
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" /> Add Time Log
          </Button>
        }
      />
      <DialogContent className="max-w-md w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle>Add Time Log</DialogTitle>
          <DialogDescription>
            Manually record an employee's time in/out for a date.
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
            <Label>Date</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Time In</Label>
              <Input
                type="time"
                value={form.timeIn ? form.timeIn.slice(11, 16) : ""}
                onChange={(e) =>
                  set("timeIn", e.target.value ? `${form.date}T${e.target.value}` : "")
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Time Out</Label>
              <Input
                type="time"
                value={form.timeOut ? form.timeOut.slice(11, 16) : ""}
                onChange={(e) =>
                  set("timeOut", e.target.value ? `${form.date}T${e.target.value}` : "")
                }
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancel</Button>} />
            <Button type="submit" disabled={isPending || !form.employeeId}>
              {isPending ? "Saving…" : "Add Time Log"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditTimeLogDialog({ row }: { row: any }) {
  const { mutate: update, isPending } = useUpdateTimeLog()
  const [open, setOpen] = useState(false)
  const [timeIn, setTimeIn] = useState(toInputValue(row.timeIn))
  const [timeOut, setTimeOut] = useState(toInputValue(row.timeOut))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    update(
      {
        id: row.id,
        data: {
          timeIn: timeIn || null,
          timeOut: timeOut || null,
        },
      },
      { onSuccess: () => setOpen(false) },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>} />
      <DialogContent className="max-w-md w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle>Correct Time Log</DialogTitle>
          <DialogDescription>
            {row.employee?.user?.name ?? row.employee?.employeeNo} — {row.date}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Time In</Label>
              <Input
                type="time"
                value={timeIn.slice(11, 16)}
                onChange={(e) =>
                  setTimeIn(e.target.value ? `${row.date}T${e.target.value}` : "")
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Time Out</Label>
              <Input
                type="time"
                value={timeOut.slice(11, 16)}
                onChange={(e) =>
                  setTimeOut(e.target.value ? `${row.date}T${e.target.value}` : "")
                }
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancel</Button>} />
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
