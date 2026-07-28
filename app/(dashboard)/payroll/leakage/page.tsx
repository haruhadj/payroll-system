"use client"

import { useState } from "react"
import { usePayrollPeriods } from "@/lib/hooks/usePayroll"
import { usePayrollLeakage } from "@/lib/hooks/usePayslips"
import type { LeakageStatus } from "@/lib/payroll-calc"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"
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

const leakageStatusVariant: Record<LeakageStatus, "secondary" | "default" | "destructive" | "outline"> = {
  ok: "secondary",
  overpayment: "destructive",
  underpayment: "destructive",
  unreleased: "outline",
}

const leakageStatusLabel: Record<LeakageStatus, string> = {
  ok: "OK",
  overpayment: "Overpayment",
  underpayment: "Underpayment",
  unreleased: "Not yet released",
}

export default function PayrollLeakagePage() {
  const { data: periods, isLoading: periodsLoading } = usePayrollPeriods()
  const [periodId, setPeriodId] = useState<string>("")
  const { data, isLoading } = usePayrollLeakage(periodId)

  const rows = data?.rows ?? []
  const flagged = rows.filter((r: any) => r.leakageStatus !== "ok" && r.leakageStatus !== "unreleased")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payroll Leakage Report</h1>
        <p className="text-muted-foreground">
          Compares each payslip&apos;s computed net pay against the amount actually
          released, to catch over- or under-payment during release.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Select a payroll period to reconcile.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-1">
            <Select value={periodId} onValueChange={(v) => setPeriodId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder={periodsLoading ? "Loading periods…" : "Select a payroll period"} />
              </SelectTrigger>
              <SelectContent>
                {periods?.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label} ({p.dateFrom} → {p.dateTo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {periodId && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm text-muted-foreground">Flagged Payslips</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">{flagged.length} / {rows.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm text-muted-foreground">Total Overpayment</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-destructive">
                  {formatCurrency(data?.totalOverpayment ?? 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm text-muted-foreground">Total Underpayment</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-destructive">
                  {formatCurrency(Math.abs(data?.totalUnderpayment ?? 0))}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-md border bg-background overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Expected Net Pay</TableHead>
                  <TableHead className="text-right">Actual Released</TableHead>
                  <TableHead className="text-right">Leakage</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 5 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : rows.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No payslips in this period yet.
                      </TableCell>
                    </TableRow>
                  )
                  : rows.map((r: any) => (
                      <TableRow key={r.payslipId}>
                        <TableCell>
                          <p className="font-medium">{r.name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{r.employeeNo}</p>
                        </TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(r.netPay)}</TableCell>
                        <TableCell className="text-right font-mono">
                          {r.actualNetPay === null ? "—" : formatCurrency(r.actualNetPay)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {r.leakage === null ? "—" : formatCurrency(r.leakage)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={leakageStatusVariant[r.leakageStatus as LeakageStatus]}>
                            {leakageStatusLabel[r.leakageStatus as LeakageStatus]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}
