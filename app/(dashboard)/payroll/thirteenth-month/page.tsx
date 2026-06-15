"use client"

import { useState } from "react"
import { useThirteenthMonth } from "@/lib/hooks/useThirteenthMonth"
import { useOptions } from "@/lib/hooks/useOptions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
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
  TableFooter,
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

const ALL = "all"

export default function ThirteenthMonthPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [designation, setDesignation] = useState(ALL)
  const [group, setGroup] = useState(ALL)
  const [team, setTeam] = useState(ALL)
  const { data: options } = useOptions()
  const { data, isLoading } = useThirteenthMonth({
    year,
    designation: designation === ALL ? undefined : designation,
    group: group === ALL ? undefined : group,
    team: team === ALL ? undefined : team,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">13th Month Report</h1>
        <p className="text-muted-foreground">
          1/12 of basic salary earned in the year, pro-rated by months of service.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Select the year and narrow by classification.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Year</Label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value) || year)}
              />
            </div>
            <FilterSelect
              label="Designation"
              value={designation}
              onChange={setDesignation}
              items={options?.designations?.map((d) => d.name) ?? []}
            />
            <FilterSelect
              label="Group"
              value={group}
              onChange={setGroup}
              items={options?.groups?.map((g) => g.name) ?? []}
            />
            <FilterSelect
              label="Team"
              value={team}
              onChange={setTeam}
              items={options?.teams?.map((t) => t.name) ?? []}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Report for {data?.year ?? year}</CardTitle>
          <Button
            variant="outline"
            onClick={() => exportCsv(data)}
            disabled={!data?.rows?.length}
          >
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead className="text-right">Basic Salary</TableHead>
                  <TableHead className="text-right">Months</TableHead>
                  <TableHead className="text-right">13th Month</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : data?.rows?.length ? (
                  data.rows.map((r: any) => (
                    <TableRow key={r.employeeId}>
                      <TableCell>
                        <p className="font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.employeeNo}</p>
                      </TableCell>
                      <TableCell className="text-sm">{r.position}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(r.basicSalary)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{r.monthsWorked}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        {formatCurrency(r.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No employees match these filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              {data?.rows?.length ? (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} className="font-semibold">Total</TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {formatCurrency(data.total)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              ) : null}
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  items,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  items: string[]
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v ?? ALL)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All</SelectItem>
          {items.map((i) => (
            <SelectItem key={i} value={i}>{i}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function exportCsv(data: any) {
  if (!data?.rows?.length) return
  const header = ["Employee No", "Name", "Designation", "Basic Salary", "Months", "13th Month"]
  const lines = data.rows.map((r: any) =>
    [r.employeeNo, r.name, r.position, r.basicSalary, r.monthsWorked, r.amount].join(","),
  )
  const csv = [header.join(","), ...lines].join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `13th-month-${data.year}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
