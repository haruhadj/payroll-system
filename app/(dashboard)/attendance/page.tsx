"use client"

import { useState } from "react"
import {
  useTimeLogs,
  useCreateTimeLog,
  useUpdateTimeLog,
  useDeleteTimeLog,
  useScanFingerprint,
  type TimeLogInput,
} from "@/lib/hooks/useTimeLogs"
import { useEmployees } from "@/lib/hooks/useEmployees"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
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
import { cn } from "@/lib/utils"
import { Plus, Pencil, Trash2, Fingerprint } from "lucide-react"

function fmtTime(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

function segHours(a: string | null, b: string | null) {
  if (!a || !b) return 0
  return Math.max(0, (new Date(b).getTime() - new Date(a).getTime()) / 3_600_000)
}

function workHours(l: any) {
  const h = segHours(l.amIn, l.amOut) + segHours(l.pmIn, l.pmOut)
  return h > 0 ? `${h.toFixed(2)} h` : "—"
}

export default function AttendancePage() {
  const [employeeId, setEmployeeId] = useState<string>("")
  const [date, setDate] = useState<string>("")
  const { data: employees } = useEmployees()
  const { data: logs, isLoading } = useTimeLogs({
    employeeId: employeeId || undefined,
    from: date || undefined,
    to: date || undefined,
  })
  const { mutate: remove, isPending: deleting } = useDeleteTimeLog()

  const scan = useScanFingerprint()
  const [scanning, setScanning] = useState(false)
  const busy = scanning || scan.isPending

  const handleScan = () => {
    setScanning(true)
    // Brief artificial delay so the "Scanning…" animation reads clearly on stage.
    setTimeout(() => {
      scan.mutate(undefined, { onSettled: () => setScanning(false) })
    }, 1000)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-muted-foreground">
            Time logs feed attendance, late, and night differential computation.
          </p>
        </div>
        <TimeLogDialog mode="create" employees={employees} />
      </div>

      {/* Biometric scanner mock */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <button
            type="button"
            onClick={handleScan}
            disabled={busy}
            className={cn(
              "flex h-28 w-28 items-center justify-center rounded-full border-2 transition-all",
              busy
                ? "border-primary bg-primary/10 animate-pulse"
                : "border-muted-foreground/30 hover:border-primary hover:bg-primary/5",
            )}
          >
            <Fingerprint
              className={cn(
                "h-14 w-14 transition-colors",
                busy ? "text-primary" : "text-muted-foreground",
              )}
            />
          </button>
          <div className="text-center">
            <p className="font-semibold">
              {busy ? "Scanning…" : "Scan Fingerprint"}
            </p>
            <p className="text-sm text-muted-foreground">
              {busy
                ? "Reading biometric data"
                : "Simulates a biometric device clocking an employee in or out"}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 space-y-1">
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
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Filter by Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        {(employeeId || date) && (
          <div className="flex items-end">
            <Button
              variant="ghost"
              onClick={() => {
                setEmployeeId("")
                setDate("")
              }}
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-md border bg-background overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead className="text-center">AM In</TableHead>
              <TableHead className="text-center">AM Out</TableHead>
              <TableHead className="text-center">PM In</TableHead>
              <TableHead className="text-center">PM Out</TableHead>
              <TableHead className="hidden sm:table-cell text-center">Work Hrs</TableHead>
              <TableHead className="hidden lg:table-cell">Source</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : logs?.length ? (
              logs.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono text-sm">{l.logDate}</TableCell>
                  <TableCell>
                    <p className="font-medium">{l.employee?.user?.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{l.employee?.employeeNo}</p>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-center">{fmtTime(l.amIn)}</TableCell>
                  <TableCell className="font-mono text-sm text-center">{fmtTime(l.amOut)}</TableCell>
                  <TableCell className="font-mono text-sm text-center">{fmtTime(l.pmIn)}</TableCell>
                  <TableCell className="font-mono text-sm text-center">{fmtTime(l.pmOut)}</TableCell>
                  <TableCell className="hidden sm:table-cell font-mono text-sm text-center">
                    {workHours(l)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge variant={l.source === "biometric" ? "default" : "outline"}>
                      {l.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <TimeLogDialog mode="edit" log={l} employees={employees} />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={deleting}
                        onClick={() => {
                          if (confirm("Delete this time log?")) remove(l.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No time logs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function TimeLogDialog({
  mode,
  log,
  employees,
}: {
  mode: "create" | "edit"
  log?: any
  employees?: any[]
}) {
  const { mutate: create, isPending: creating } = useCreateTimeLog()
  const { mutate: update, isPending: updating } = useUpdateTimeLog()
  const [open, setOpen] = useState(false)

  const isoToTime = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleTimeString("en-PH", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : ""

  const [form, setForm] = useState({
    employeeId: log?.employeeId ?? "",
    logDate: log?.logDate ?? "",
    amIn: isoToTime(log?.amIn ?? null),
    amOut: isoToTime(log?.amOut ?? null),
    pmIn: isoToTime(log?.pmIn ?? null),
    pmOut: isoToTime(log?.pmOut ?? null),
  })

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const toIso = (t: string) =>
      t ? new Date(`${form.logDate}T${t}:00`).toISOString() : null
    const payload: TimeLogInput = {
      employeeId: form.employeeId,
      logDate: form.logDate,
      amIn: toIso(form.amIn),
      amOut: toIso(form.amOut),
      pmIn: toIso(form.pmIn),
      pmOut: toIso(form.pmOut),
    }
    const onSuccess = () => setOpen(false)
    if (mode === "create") create(payload, { onSuccess })
    else update({ id: log.id, ...payload }, { onSuccess })
  }

  const isPending = creating || updating

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          mode === "create" ? (
            <Button variant="outline" className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" /> Manual Log
            </Button>
          ) : (
            <Button size="icon" variant="ghost">
              <Pencil className="h-4 w-4" />
            </Button>
          )
        }
      />
      <DialogContent className="max-w-md w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Time Log" : "Edit Time Log"}</DialogTitle>
          <DialogDescription>Manually record an employee's clock in/out.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select
              value={form.employeeId}
              onValueChange={(v) => set("employeeId", v ?? "")}
            >
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
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={form.logDate}
              onChange={(e) => set("logDate", e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Log In (AM)</Label>
              <Input type="time" value={form.amIn} onChange={(e) => set("amIn", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Log Out (AM)</Label>
              <Input type="time" value={form.amOut} onChange={(e) => set("amOut", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Log In (PM)</Label>
              <Input type="time" value={form.pmIn} onChange={(e) => set("pmIn", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Log Out (PM)</Label>
              <Input type="time" value={form.pmOut} onChange={(e) => set("pmOut", e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              }
            />
            <Button type="submit" disabled={isPending || !form.employeeId || !form.logDate}>
              {isPending ? "Saving…" : "Save Log"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
