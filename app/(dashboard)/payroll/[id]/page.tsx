"use client"

import { use } from "react"
import Link from "next/link"
import { usePayrollPeriod } from "@/lib/hooks/usePayroll"
import { usePayslips, usePayslipSummary, useUpdatePayslipStatus } from "@/lib/hooks/usePayslips"
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
import { ArrowLeft } from "lucide-react"
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
              <h1 className="text-2xl font-bold">{period?.label}</h1>
              <p className="text-muted-foreground">
                {period?.dateFrom} → {period?.dateTo} ·{" "}
                <Badge variant={period?.status === "released" ? "outline" : "default"}>
                  {period?.status}
                </Badge>
              </p>
            </>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-4">
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

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead className="text-right">Gross Pay</TableHead>
              <TableHead className="text-right">SSS</TableHead>
              <TableHead className="text-right">PhilHealth</TableHead>
              <TableHead className="text-right">Pag-IBIG</TableHead>
              <TableHead className="text-right">Tax</TableHead>
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
                    <TableCell className="text-right font-mono">{formatCurrency(parseFloat(s.grossPay))}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{formatCurrency(parseFloat(s.sss))}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{formatCurrency(parseFloat(s.philhealth))}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{formatCurrency(parseFloat(s.pagibig))}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{formatCurrency(parseFloat(s.withholdingTax))}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{formatCurrency(parseFloat(s.netPay))}</TableCell>
                    <TableCell>
                      <Badge variant={slipStatusVariant[s.status]}>{s.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
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
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
