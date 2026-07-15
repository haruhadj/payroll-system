"use client"

import { useState } from "react"
import { useDailyTimeCard } from "@/lib/hooks/useTimeLogs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`
}

function fmtTime(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

function fmtHours(hours: number) {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h} Hr(s) ${m} min(s)`
}

function fmtMinutes(mins: number) {
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  return `${h} Hr(s) ${m} min(s)`
}

export function TimeCard({ showDatePicker = true }: { showDatePicker?: boolean }) {
  const [date, setDate] = useState(todayStr())
  const { data, isLoading } = useDailyTimeCard(date)

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Time Card Date</Label>
          {showDatePicker ? (
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value || todayStr())}
              className="w-auto"
            />
          ) : (
            <p className="font-mono text-sm">{date}</p>
          )}
        </div>
      </div>

      <div className="rounded-md border bg-background overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee Name</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead className="text-center">Log In (AM)</TableHead>
              <TableHead className="text-center">Log Out (AM)</TableHead>
              <TableHead className="text-center">Log In (PM)</TableHead>
              <TableHead className="text-center">Log Out (PM)</TableHead>
              <TableHead className="text-right">Late Hours</TableHead>
              <TableHead className="text-right">Work Hours</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.rows?.length ? (
              data.rows.map((r: any) => (
                <TableRow key={r.employeeId}>
                  <TableCell>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.employeeNo}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.scheduleName}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-center">{fmtTime(r.amIn)}</TableCell>
                  <TableCell className="font-mono text-sm text-center">{fmtTime(r.amOut)}</TableCell>
                  <TableCell className="font-mono text-sm text-center">{fmtTime(r.pmIn)}</TableCell>
                  <TableCell className="font-mono text-sm text-center">{fmtTime(r.pmOut)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtMinutes(r.lateMinutes)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtHours(r.workHours)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No active employees.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {data?.totals && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={6} className="font-semibold">
                  Accumulated Records
                </TableCell>
                <TableCell className="text-right font-mono text-xs font-semibold">
                  {fmtMinutes(data.totals.lateMinutes)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs font-semibold">
                  {fmtHours(data.totals.workHours)}
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  )
}
