"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Download, Upload, FileSpreadsheet } from "lucide-react"

// Minimal CSV parser: first row is the header, simple comma split.
function parseCsv(text: string): Record<string, string>[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(",").map((h) => h.trim())
  return lines.slice(1).map((line) => {
    const cells = line.split(",")
    const row: Record<string, string> = {}
    headers.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()))
    return row
  })
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const EMPLOYEE_TEMPLATE =
  "name,email,password,employeeNo,department,position,group,employmentType,basicSalary,allowance,hiredAt\n" +
  "Juan Cruz,juan@company.com,Passw0rd!,EMP-100,Accounting,Rider,Regular,full_time,18000,1000,2026-01-15"

const TIMELOG_TEMPLATE =
  "employeeNo,date,amIn,amOut,pmIn,pmOut\n" +
  "EMP-001,2026-06-16,08:00,12:00,13:00,17:00,18:00,20:00"

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tools</h1>
        <p className="text-muted-foreground">Bulk import and export utilities.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export Employees</CardTitle>
          <CardDescription>Download all employee records as a CSV file.</CardDescription>
        </CardHeader>
        <CardContent>
          <a href="/api/tools/export/employees">
            <Button className="gap-2">
              <Download className="h-4 w-4" /> Export Employees CSV
            </Button>
          </a>
        </CardContent>
      </Card>

      <ImportCard
        title="Import Employees"
        description="Creates a user account + employee record for each row."
        template={EMPLOYEE_TEMPLATE}
        templateName="employees-template.csv"
        endpoint="/api/tools/import/employees"
        resultKey="created"
      />

      <ImportCard
        title="Import Time Records"
        description="Upserts six-punch time logs, matched by employee number + date."
        template={TIMELOG_TEMPLATE}
        templateName="timerecords-template.csv"
        endpoint="/api/tools/import/timelogs"
        resultKey="imported"
      />
    </div>
  )
}

function ImportCard({
  title,
  description,
  template,
  templateName,
  endpoint,
  resultKey,
}: {
  title: string
  description: string
  template: string
  templateName: string
  endpoint: string
  resultKey: "created" | "imported"
}) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ count: number; errors: any[] } | null>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setResult(null)
    try {
      const text = await file.text()
      const rows = parseCsv(text)
      if (!rows.length) {
        toast.error("No data rows found in the CSV")
        return
      }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Import failed")
      const count = data[resultKey] ?? 0
      setResult({ count, errors: data.errors ?? [] })
      toast.success(`${count} record(s) imported`)
    } catch (err: any) {
      toast.error(err.message ?? "Import failed")
    } finally {
      setBusy(false)
      e.target.value = ""
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => downloadText(templateName, template)}
          >
            <FileSpreadsheet className="h-4 w-4" /> Download Template
          </Button>
          <label>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFile}
              disabled={busy}
            />
            <Button className="gap-2" disabled={busy} render={<span />}>
              <Upload className="h-4 w-4" /> {busy ? "Importing…" : "Upload CSV"}
            </Button>
          </label>
        </div>

        {result && (
          <div className="rounded-md border p-3 text-sm space-y-1">
            <p className="font-medium text-green-600">{result.count} row(s) imported.</p>
            {result.errors.length > 0 && (
              <div className="text-destructive">
                <p className="font-medium">{result.errors.length} error(s):</p>
                <ul className="list-disc pl-5">
                  {result.errors.slice(0, 10).map((er, i) => (
                    <li key={i}>
                      Row {er.row}: {er.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
