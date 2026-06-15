"use client"

import { useState } from "react"
import { usePayslips } from "@/lib/hooks/usePayslips"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { formatCurrency } from "@/lib/utils"
import { Eye } from "lucide-react"

export default function PayslipsPage() {
  const { data: payslips, isLoading } = usePayslips()
  const [selected, setSelected] = useState<any>(null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Payslips</h1>
        <p className="text-muted-foreground">Your payslip history</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : payslips?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No payslips available yet. Your payslips will appear here once a payroll period is released.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {payslips?.map((slip: any) => (
            <Card key={slip.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{slip.period?.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {slip.period?.dateFrom} → {slip.period?.dateTo}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={slip.status === "paid" ? "outline" : "default"}>{slip.status}</Badge>
                    <Dialog>
                      <DialogTrigger onClick={() => setSelected(slip)}>
                        <Button size="icon" variant="ghost" type="button">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md w-[calc(100vw-2rem)]">
                        <DialogHeader>
                          <DialogTitle>Payslip — {selected?.period?.label}</DialogTitle>
                        </DialogHeader>
                        {selected && <PayslipDetail slip={selected} />}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">Net Pay</p>
                  <p className="font-bold text-lg">{formatCurrency(parseFloat(slip.netPay))}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function PayslipDetail({ slip }: { slip: any }) {
  const row = (label: string, val: number, variant: "normal" | "deduct" | "total" = "normal") => (
    <div className={`flex justify-between text-sm ${variant === "deduct" ? "text-muted-foreground" : variant === "total" ? "font-bold text-base" : ""}`}>
      <span>{label}</span>
      <span className="font-mono">{formatCurrency(val)}</span>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Period</p>
        <p className="font-medium">{slip.period?.dateFrom} → {slip.period?.dateTo}</p>
      </div>

      <Separator />

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Earnings</p>
        {row("Basic Pay", parseFloat(slip.basicPay))}
        {parseFloat(slip.allowances) > 0 && row("Allowances", parseFloat(slip.allowances))}
        {row("Gross Pay", parseFloat(slip.grossPay))}
      </div>

      <Separator />

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Deductions</p>
        {row("SSS", parseFloat(slip.sss), "deduct")}
        {row("PhilHealth", parseFloat(slip.philhealth), "deduct")}
        {row("Pag-IBIG", parseFloat(slip.pagibig), "deduct")}
        {row("Withholding Tax", parseFloat(slip.withholdingTax), "deduct")}
      </div>

      <Separator />

      {row("Net Pay", parseFloat(slip.netPay), "total")}
    </div>
  )
}
