"use client"

import { useState } from "react"
import {
  useSchedules,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
  type ScheduleInput,
} from "@/lib/hooks/useSchedules"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { Plus, Pencil, Trash2, Moon } from "lucide-react"

const DAYS = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
]

export default function SchedulesPage() {
  const { data: schedules, isLoading } = useSchedules()
  const { mutate: remove, isPending: deleting } = useDeleteSchedule()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Schedules</h1>
          <p className="text-muted-foreground">
            Define work shifts used to compute attendance, late, and night differential.
          </p>
        </div>
        <ScheduleDialog mode="create" />
      </div>

      <div className="rounded-md border bg-background overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead className="hidden md:table-cell">Break</TableHead>
              <TableHead className="hidden sm:table-cell">Work Days</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : schedules?.length ? (
              schedules.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2">
                      {s.name}
                      {s.isNightShift && (
                        <Badge variant="secondary" className="gap-1">
                          <Moon className="h-3 w-3" /> Night
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {s.timeIn} – {s.timeOut}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{s.breakMinutes} min</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {DAYS.filter((d) => s.workDays?.includes(d.key)).map((d) => (
                        <Badge key={d.key} variant="outline" className="text-xs">
                          {d.label}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <ScheduleDialog mode="edit" schedule={s} />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={deleting}
                        onClick={() => {
                          if (confirm(`Delete schedule "${s.name}"?`)) remove(s.id)
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
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No schedules yet. Create one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function ScheduleDialog({
  mode,
  schedule,
}: {
  mode: "create" | "edit"
  schedule?: any
}) {
  const { mutate: create, isPending: creating } = useCreateSchedule()
  const { mutate: update, isPending: updating } = useUpdateSchedule()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<ScheduleInput>({
    name: schedule?.name ?? "",
    timeIn: schedule?.timeIn ?? "08:00",
    timeOut: schedule?.timeOut ?? "17:00",
    breakMinutes: schedule?.breakMinutes ?? 60,
    workDays: schedule?.workDays ?? ["mon", "tue", "wed", "thu", "fri"],
    isNightShift: schedule?.isNightShift ?? false,
  })

  const set = (k: keyof ScheduleInput, v: any) => setForm((f) => ({ ...f, [k]: v }))
  const toggleDay = (day: string) =>
    setForm((f) => ({
      ...f,
      workDays: f.workDays.includes(day)
        ? f.workDays.filter((d) => d !== day)
        : [...f.workDays, day],
    }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const onSuccess = () => setOpen(false)
    if (mode === "create") create(form, { onSuccess })
    else update({ id: schedule.id, ...form }, { onSuccess })
  }

  const isPending = creating || updating

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          mode === "create" ? (
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" /> New Schedule
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
          <DialogTitle>{mode === "create" ? "New Schedule" : "Edit Schedule"}</DialogTitle>
          <DialogDescription>
            Shift times use 24-hour format (e.g. 22:00 for 10 PM).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              placeholder="Day Shift"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Time In</Label>
              <Input
                type="time"
                value={form.timeIn}
                onChange={(e) => set("timeIn", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Time Out</Label>
              <Input
                type="time"
                value={form.timeOut}
                onChange={(e) => set("timeOut", e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Break (minutes)</Label>
            <Input
              type="number"
              min="0"
              max="480"
              value={form.breakMinutes}
              onChange={(e) => set("breakMinutes", parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label>Work Days</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => toggleDay(d.key)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm transition-colors",
                    form.workDays.includes(d.key)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={form.isNightShift}
              onChange={(e) => set("isNightShift", e.target.checked)}
            />
            Night shift
          </label>
          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              }
            />
            <Button type="submit" disabled={isPending || !form.workDays.length}>
              {isPending ? "Saving…" : "Save Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
