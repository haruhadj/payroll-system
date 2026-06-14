"use client"

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
import { Plus, Eye, Trash2 } from "lucide-react"

const statusVariant: Record<string, "secondary" | "default" | "outline"> = {
  draft: "secondary",
  processed: "default",
  released: "outline",
}

export default function PayrollPage() {
  const { data: periods, isLoading } = usePayrollPeriods()
  const { mutate: updateStatus, isPending: updating } = useUpdatePayrollStatus()
  const { mutate: deletePeriod, isPending: deleting } = useDeletePayrollPeriod()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payroll Periods</h1>
          <p className="text-muted-foreground">Manage payroll cutoffs and generate payslips</p>
        </div>
        <Link href="/payroll/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Period
          </Button>
        </Link>
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Date From</TableHead>
              <TableHead>Date To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : periods?.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.label}</TableCell>
                    <TableCell className="text-muted-foreground">{p.dateFrom}</TableCell>
                    <TableCell className="text-muted-foreground">{p.dateTo}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[p.status]}>{p.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
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
                    </TableCell>
                  </TableRow>
                ))}
            {!isLoading && periods?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
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
