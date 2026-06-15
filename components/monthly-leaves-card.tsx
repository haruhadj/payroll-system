"use client"

import Link from "next/link"
import { useLeaveRequests } from "@/lib/hooks/useLeaves"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus } from "lucide-react"

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  pending: "secondary",
  approved: "default",
  rejected: "outline",
}

const typeLabel: Record<string, string> = {
  vacation: "Vacation",
  sick: "Sick",
  emergency: "Emergency",
  unpaid: "Unpaid",
}

function monthBounds() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  return {
    from: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`,
    to: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(last)}`,
    name: d.toLocaleString("en-PH", { month: "long" }),
  }
}

export function MonthlyLeavesCard() {
  const { from, to, name } = monthBounds()
  const { data, isLoading } = useLeaveRequests()
  const rows = (data ?? []).filter(
    (r: any) => r.dateFrom <= to && r.dateTo >= from,
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base">Leaves for the month of {name}</CardTitle>
        <Link href="/leaves">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Add Leave
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Employee Name</TableHead>
                <TableHead>Leave Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Duration</TableHead>
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
              ) : rows.length ? (
                rows.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">
                      {r.dateFrom === r.dateTo ? r.dateFrom : `${r.dateFrom} → ${r.dateTo}`}
                    </TableCell>
                    <TableCell>{r.employee?.user?.name ?? "—"}</TableCell>
                    <TableCell>{typeLabel[r.type] ?? r.type}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[r.status]}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {r.days} day(s)
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No leave applied.
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
