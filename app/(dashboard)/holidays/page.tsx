"use client"

import { useState } from "react"
import {
  useHolidays,
  useCreateHoliday,
  useUpdateHoliday,
  useDeleteHoliday,
  type HolidayInput,
} from "@/lib/hooks/useHolidays"
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
import { Plus, Pencil, Trash2 } from "lucide-react"

const typeLabel: Record<string, string> = {
  regular: "Regular Holiday",
  special_non_working: "Special Non-Working",
}

export default function HolidaysPage() {
  const { data: holidays, isLoading } = useHolidays()
  const { mutate: remove, isPending: deleting } = useDeleteHoliday()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Holidays</h1>
          <p className="text-muted-foreground">
            Regular and special non-working days that drive holiday pay computation.
          </p>
        </div>
        <HolidayDialog mode="create" />
      </div>

      <div className="rounded-md border bg-background overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : holidays?.length ? (
              holidays.map((h: any) => (
                <TableRow key={h.id}>
                  <TableCell className="font-mono text-sm">{h.date}</TableCell>
                  <TableCell className="font-medium">{h.name}</TableCell>
                  <TableCell>
                    <Badge variant={h.type === "regular" ? "default" : "secondary"}>
                      {typeLabel[h.type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <HolidayDialog mode="edit" holiday={h} />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={deleting}
                        onClick={() => {
                          if (confirm(`Delete "${h.name}"?`)) remove(h.id)
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
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No holidays added yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function HolidayDialog({ mode, holiday }: { mode: "create" | "edit"; holiday?: any }) {
  const { mutate: create, isPending: creating } = useCreateHoliday()
  const { mutate: update, isPending: updating } = useUpdateHoliday()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<HolidayInput>({
    name: holiday?.name ?? "",
    date: holiday?.date ?? "",
    type: holiday?.type ?? "regular",
  })

  const set = (k: keyof HolidayInput, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const onSuccess = () => setOpen(false)
    if (mode === "create") create(form, { onSuccess })
    else update({ id: holiday.id, ...form }, { onSuccess })
  }

  const isPending = creating || updating

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          mode === "create" ? (
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" /> Add Holiday
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
          <DialogTitle>{mode === "create" ? "Add Holiday" : "Edit Holiday"}</DialogTitle>
          <DialogDescription>
            Regular holidays pay 200%; special non-working days pay 130% when worked.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              placeholder="Independence Day"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
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
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => set("type", v ?? "regular")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">Regular Holiday</SelectItem>
                <SelectItem value="special_non_working">Special Non-Working</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              }
            />
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save Holiday"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
