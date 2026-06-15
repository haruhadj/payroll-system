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
import { formatCurrency, cn } from "@/lib/utils"
import { useState } from "react"

export default function EmployeesPage() {
  const [status, setStatus] = useState<"all" | "true" | "false">("all")
  const { data: employees, isLoading } = useEmployees(
    status === "all" ? undefined : { active: status },
  )
  const { mutate: deleteEmployee, isPending: deleting } = useDeleteEmployee()

  const typeLabel: Record<string, string> = {
    full_time: "Full Time",
    part_time: "Part Time",
    contractual: "Contractual",
  }

  const filters: { key: "all" | "true" | "false"; label: string }[] = [
    { key: "all", label: "All" },
    { key: "true", label: "Active" },
    { key: "false", label: "Inactive" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Manage employee records</p>
        </div>
        <Link href="/employees/new">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </Link>
      </div>

      <div className="flex gap-1 rounded-md border p-1 w-fit">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatus(f.key)}
            className={cn(
              "rounded px-3 py-1 text-sm transition-colors",
              status === f.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="rounded-md border bg-background overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee No.</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Department</TableHead>
              <TableHead className="hidden md:table-cell">Position</TableHead>
              <TableHead className="hidden sm:table-cell">Type</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Basic Salary</TableHead>
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
                        <p className="font-medium flex items-center gap-2">
                          {emp.user?.name ?? "—"}
                          {emp.isActive === false && (
                            <Badge variant="outline" className="text-[10px]">
                              Inactive
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{emp.user?.email}</p>
                        <p className="text-xs text-muted-foreground md:hidden">
                          {emp.department} · {emp.position}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{emp.department}</TableCell>
                    <TableCell className="hidden md:table-cell">{emp.position}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary">{typeLabel[emp.employmentType] ?? emp.employmentType}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono hidden sm:table-cell">
                      {formatCurrency(parseFloat(emp.basicSalary))}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
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
                      </div>
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
