"use client"

import Link from "next/link"
import { useEmployees, useDeleteEmployee } from "@/lib/hooks/useEmployees"
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
import { Plus, Pencil, Trash2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export default function EmployeesPage() {
  const { data: employees, isLoading } = useEmployees()
  const { mutate: deleteEmployee, isPending: deleting } = useDeleteEmployee()

  const typeLabel: Record<string, string> = {
    full_time: "Full Time",
    part_time: "Part Time",
    contractual: "Contractual",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Manage employee records</p>
        </div>
        <Link href="/employees/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </Link>
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee No.</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Basic Salary</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : employees?.map((emp: any) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-mono text-sm">{emp.employeeNo}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{emp.user?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{emp.user?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{emp.department}</TableCell>
                    <TableCell>{emp.position}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{typeLabel[emp.employmentType] ?? emp.employmentType}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(parseFloat(emp.basicSalary))}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Link href={`/employees/${emp.id}`}>
                        <Button size="icon" variant="ghost">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={deleting}
                        onClick={() => {
                          if (confirm(`Delete employee ${emp.employeeNo}?`)) {
                            deleteEmployee(emp.id)
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            {!isLoading && employees?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No employees yet.{" "}
                  <Link href="/employees/new" className="text-primary hover:underline">
                    Add one
                  </Link>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
