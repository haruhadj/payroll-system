"use client"

import { use, useState } from "react"
import Link from "next/link"
import { usePayrollPeriod } from "@/lib/hooks/usePayroll"
import { usePayslips, usePayslipSummary, useUpdatePayslipStatus } from "@/lib/hooks/usePayslips"
import { useAttendanceSummary } from "@/lib/hooks/useAbsences"
import { computeLeakage, type LeakageStatus } from "@/lib/payroll-calc"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  DialogFooter,
} from "@/components/ui/dialog"
import { ArrowLeft, CalendarCheck2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

const slipStatusVariant: Record<string, "secondary" | "default" | "outline"> = {
  pending: "secondary",
  approved: "default",
  paid: "outline",
}

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
  unreleased: "—",
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
              <TableHead className="text-right hidden md:table-cell">Actual Released</TableHead>
              <TableHead className="hidden md:table-cell">Leakage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 11 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : payslips?.map((s: any) => {
                  const netPay = parseFloat(s.netPay)
                  const actualNetPay = s.actualNetPay === null || s.actualNetPay === undefined ? null : parseFloat(s.actualNetPay)
                  const { status: leakageStatus } = computeLeakage({ netPay, actualNetPay })
                  return (
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
                    <TableCell className="text-right font-mono font-semibold">{formatCurrency(netPay)}</TableCell>
                    <TableCell className="text-right font-mono hidden md:table-cell">
                      {actualNetPay === null ? "—" : formatCurrency(actualNetPay)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={leakageStatusVariant[leakageStatus]}>{leakageStatusLabel[leakageStatus]}</Badge>
                    </TableCell>
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
                          <MarkPaidDialog
                            netPay={netPay}
                            updating={updating}
                            onConfirm={(amount) => updateStatus({ id: s.id, status: "paid", actualNetPay: amount })}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  )
                })}
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

// Prompts for the amount actually released before marking a payslip "paid",
// pre-filled with the computed netPay but editable — this is the figure
// leakage reconciliation is measured against.
function MarkPaidDialog({
  netPay,
  updating,
  onConfirm,
}: {
  netPay: number
  updating: boolean
  onConfirm: (actualNetPay: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(String(netPay))

  const parsed = parseFloat(amount)
  const valid = !isNaN(parsed) && parsed > 0

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setAmount(String(netPay))
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="default">Mark Paid</Button>} />
      <DialogContent className="max-w-sm w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle>Confirm Release</DialogTitle>
          <DialogDescription>
            Enter the amount actually released to the employee. This is compared
            against the computed net pay to flag payroll leakage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Computed Net Pay</span>
            <span className="font-mono font-semibold">{formatCurrency(netPay)}</span>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="actual-net-pay">Amount Released</Label>
            <Input
              id="actual-net-pay"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            disabled={!valid || updating}
            onClick={() => {
              onConfirm(parsed)
              setOpen(false)
            }}
          >
            Confirm & Mark Paid
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
