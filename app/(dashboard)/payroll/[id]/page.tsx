"use client"

import { use, useState } from "react"
import Link from "next/link"
import { usePayrollPeriod } from "@/lib/hooks/usePayroll"
import { usePayslips, usePayslipSummary, useUpdatePayslipStatus } from "@/lib/hooks/usePayslips"
import { useAttendanceSummary } from "@/lib/hooks/useAbsences"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ArrowLeft, CalendarCheck2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

const slipStatusVariant: Record<string, "secondary" | "default" | "outline"> = {
  pending: "secondary",
  approved: "default",
  paid: "outline",
}

export default function PayrollDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params) as { id: string }
  const { data: period, isLoading: pLoading } = usePayrollPeriod(id)
  const { data: payslips, isLoading: sLoading } = usePayslips({ periodId: id })
  const { data: summary } = usePayslipSummary(id)
  const { mutate: updateStatus, isPending: updating } = useUpdatePayslipStatus()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/payroll">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          {pLoading ? (
            <Skeleton className="h-8 w-48" />
          ) : (
            <>
              <h1 className="text-xl sm:text-2xl font-bold">{period?.label}</h1>
              <p className="text-muted-foreground text-sm">
                {period?.dateFrom} → {period?.dateTo} ·{" "}
                <Badge variant={period?.status === "released" ? "outline" : "default"}>
                  {period?.status}
                </Badge>
              </p>
            </>
          )}
        </div>
      </div>

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Payslips", value: summary.totalPayslips },
            { label: "Total Net Pay", value: formatCurrency(summary.totalNetPay) },
            { label: "Total Deductions", value: formatCurrency(summary.totalDeductions) },
            { label: "Avg Net Pay", value: formatCurrency(summary.averageNetPay) },
          ].map((s) => (
            <Card key={s.label}>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm text-muted-foreground">{s.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="rounded-md border bg-background overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead className="text-right hidden lg:table-cell">Gross Pay</TableHead>
              <TableHead className="text-right hidden lg:table-cell">SSS</TableHead>
              <TableHead className="text-right hidden lg:table-cell">PhilHealth</TableHead>
              <TableHead className="text-right hidden lg:table-cell">Pag-IBIG</TableHead>
              <TableHead className="text-right hidden lg:table-cell">Tax</TableHead>
              <TableHead className="text-right">Net Pay</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : payslips?.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <p className="font-medium">{s.employee?.user?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{s.employee?.employeeNo}</p>
                    </TableCell>
                    <TableCell className="text-right font-mono hidden lg:table-cell">{formatCurrency(parseFloat(s.grossPay))}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground hidden lg:table-cell">{formatCurrency(parseFloat(s.sss))}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground hidden lg:table-cell">{formatCurrency(parseFloat(s.philhealth))}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground hidden lg:table-cell">{formatCurrency(parseFloat(s.pagibig))}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground hidden lg:table-cell">{formatCurrency(parseFloat(s.withholdingTax))}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{formatCurrency(parseFloat(s.netPay))}</TableCell>
                    <TableCell>
                      <Badge variant={slipStatusVariant[s.status]}>{s.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <AttendanceDialog periodId={id} payslip={s} />
                        {s.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updating}
                            onClick={() => updateStatus({ id: s.id, status: "approved" })}
                          >
                            Approve
                          </Button>
                        )}
                        {s.status === "approved" && (
                          <Button
                            size="sm"
                            variant="default"
                            disabled={updating}
                            onClick={() => updateStatus({ id: s.id, status: "paid" })}
                          >
                            Mark Paid
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

const dayStatusVariant: Record<string, "default" | "secondary" | "outline"> = {
  present: "default",
  absent: "secondary",
  leave: "outline",
  off: "outline",
}

function AttendanceDialog({ periodId, payslip }: { periodId: string; payslip: any }) {
  const [open, setOpen] = useState(false)
  const { data, isLoading } = useAttendanceSummary(
    open ? periodId : "",
    open ? payslip.employeeId : null,
  )

  const breakdown = [
    { label: "Basic Pay", value: payslip.basicPay },
    { label: "Allowances", value: payslip.allowances },
  ]
  const deductions = [
    { label: "SSS", value: payslip.sss },
    { label: "PhilHealth", value: payslip.philhealth },
    { label: "Pag-IBIG", value: payslip.pagibig },
    { label: "Withholding Tax", value: payslip.withholdingTax },
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="ghost">
            <CalendarCheck2 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Attendance</span>
          </Button>
        }
      />
      <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{payslip.employee?.user?.name ?? "Employee"} — Attendance</DialogTitle>
          <DialogDescription>{payslip.employee?.employeeNo}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div className="rounded-md border px-3 py-2">
            <p className="text-muted-foreground text-xs">Days Worked</p>
            <p className="font-semibold">{payslip.daysWorked}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">Earnings</h3>
            {breakdown.map((b) => (
              <div key={b.label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{b.label}</span>
                <span className="font-mono">
                  {formatCurrency(parseFloat(b.value ?? "0"))}
                </span>
              </div>
            ))}
            <div className="flex justify-between text-sm border-t pt-1 font-semibold">
              <span>Gross Pay</span>
              <span className="font-mono">{formatCurrency(parseFloat(payslip.grossPay))}</span>
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">Deductions</h3>
            {deductions.map((b) => (
              <div key={b.label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{b.label}</span>
                <span className="font-mono">{formatCurrency(parseFloat(b.value ?? "0"))}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm border-t pt-1 font-semibold">
              <span>Net Pay</span>
              <span className="font-mono">{formatCurrency(parseFloat(payslip.netPay))}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">Daily Attendance</h3>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 3 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  data?.days?.map((d: any) => (
                    <TableRow key={d.date}>
                      <TableCell className="font-mono text-xs">{d.date}</TableCell>
                      <TableCell className="text-xs">{d.scheduled ? "Yes" : "—"}</TableCell>
                      <TableCell>
                        <Badge variant={dayStatusVariant[d.status]} className="text-[10px] capitalize">
                          {d.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
