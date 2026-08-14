"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { usePayrollPeriods, useUpdatePayrollStatus, useDeletePayrollPeriod } from "@/lib/hooks/usePayroll"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { Plus, Eye, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react"

const statusVariant: Record<string, "secondary" | "default" | "outline"> = {
  draft: "secondary",
  processed: "default",
  released: "outline",
}

type PayrollPeriod = {
  id: string
  label: string
  dateFrom: string
  dateTo: string
  status: string
  createdAt: string
}

// Columns the table can be sorted by. Values are compared as strings with
// numeric-aware collation, so ISO dates/timestamps sort chronologically and
// labels like "1st Half" / "2nd Half" order naturally.
type SortKey = "label" | "dateFrom" | "dateTo" | "createdAt" | "status"
type SortDir = "asc" | "desc"

function formatCreatedAt(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function SortHeader({
  label,
  columnKey,
  className,
  sortKey,
  sortDir,
  onToggle,
}: {
  label: string
  columnKey: SortKey
  className?: string
  sortKey: SortKey
  sortDir: SortDir
  onToggle: (key: SortKey) => void
}) {
  const active = sortKey === columnKey
  const Icon = active ? (sortDir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onToggle(columnKey)}
        aria-label={`Sort by ${label}`}
        className="-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 font-medium transition-colors hover:text-foreground"
      >
        {label}
        <Icon
          className={cn("h-3.5 w-3.5", active ? "text-foreground" : "text-muted-foreground/60")}
        />
      </button>
    </TableHead>
  )
}

export default function PayrollPage() {
  const { data: periods, isLoading } = usePayrollPeriods()
  const { mutate: updateStatus, isPending: updating } = useUpdatePayrollStatus()
  const { mutate: deletePeriod, isPending: deleting } = useDeletePayrollPeriod()

  // Default to the most recent cutoff first.
  const [sortKey, setSortKey] = useState<SortKey>("dateFrom")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      // Text columns read best ascending; dates default to newest first.
      setSortDir(key === "label" || key === "status" ? "asc" : "desc")
    }
  }

  const sortedPeriods = useMemo(() => {
    const rows: PayrollPeriod[] = periods ?? []
    return [...rows].sort((a, b) => {
      const cmp = String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? ""), undefined, {
        numeric: true,
        sensitivity: "base",
      })
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [periods, sortKey, sortDir])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Payroll Periods</h1>
          <p className="text-muted-foreground">Manage payroll cutoffs and generate payslips</p>
        </div>
        <Link href="/payroll/new">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            New Period
          </Button>
        </Link>
      </div>

      <div className="rounded-md border bg-background overflow-x-auto [-webkit-overflow-scrolling:touch]">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <SortHeader label="Period" columnKey="label" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <SortHeader label="Date From" columnKey="dateFrom" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <SortHeader label="Date To" columnKey="dateTo" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <SortHeader label="Created" columnKey="createdAt" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <SortHeader label="Status" columnKey="status" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : sortedPeriods.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <p className="font-medium">{p.label}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.dateFrom}</TableCell>
                    <TableCell className="text-muted-foreground">{p.dateTo}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatCreatedAt(p.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[p.status]}>{p.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        <Link href={`/payroll/${p.id}`}>
                          <Button size="icon" variant="ghost">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {p.status === "draft" && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              disabled={updating}
                              onClick={() =>
                                confirm("Generate payslips for all employees?") &&
                                updateStatus({ id: p.id, status: "processed" })
                              }
                            >
                              Process
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              disabled={deleting}
                              onClick={() =>
                                confirm("Delete this draft period?") && deletePeriod(p.id)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {p.status === "processed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updating}
                            onClick={() =>
                              confirm("Release payslips to employees?") &&
                              updateStatus({ id: p.id, status: "released" })
                            }
                          >
                            Release
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            {!isLoading && sortedPeriods.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No payroll periods.{" "}
                  <Link href="/payroll/new" className="text-primary hover:underline">Create one</Link>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
