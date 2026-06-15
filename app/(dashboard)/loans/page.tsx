"use client"

import { useState } from "react"
import { useSession } from "@/lib/auth/client"
import { useEmployees } from "@/lib/hooks/useEmployees"
import {
  useLoans,
  useCreateLoan,
  useDeleteLoan,
  type LoanInput,
  type LoanType,
} from "@/lib/hooks/useLoans"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Plus, Trash2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

const LOAN_TYPES: { value: LoanType; label: string }[] = [
  { value: "sss", label: "SSS Loan" },
  { value: "pagibig", label: "Pag-IBIG Loan" },
  { value: "company", label: "Company Loan" },
  { value: "other", label: "Other" },
]
const typeLabel = Object.fromEntries(LOAN_TYPES.map((t) => [t.value, t.label]))

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  paid: "secondary",
  cancelled: "outline",
}

export default function LoansPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role ?? "employee"
  const isManager = role === "admin" || role === "hr"

  const { data: loans, isLoading } = useLoans()
  const { mutate: remove, isPending: deleting } = useDeleteLoan()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Loans</h1>
          <p className="text-muted-foreground">
            {isManager
              ? "Employee loans. Amortization is auto-deducted each time payroll is processed."
              : "Your active loans and remaining balances."}
          </p>
        </div>
        {isManager && <LoanDialog />}
      </div>

      <div className="rounded-md border bg-background overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {isManager && <TableHead>Employee</TableHead>}
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Principal</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-right">Amortization</TableHead>
              <TableHead>Status</TableHead>
              {isManager && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: isManager ? 7 : 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : loans?.length ? (
              loans.map((l: any) => (
                <TableRow key={l.id}>
                  {isManager && (
                    <TableCell>
                      <span className="font-medium">{l.employee?.user?.name ?? "—"}</span>
                      <span className="text-xs text-muted-foreground ml-2 font-mono">
                        {l.employee?.employeeNo}
                      </span>
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant="secondary">{typeLabel[l.type] ?? l.type}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(parseFloat(l.principal))}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatCurrency(parseFloat(l.balance))}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(parseFloat(l.amortization))}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[l.status]} className="capitalize">
                      {l.status}
                    </Badge>
                  </TableCell>
                  {isManager && (
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={deleting}
                        onClick={() => {
                          if (confirm("Delete this loan?")) remove(l.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={isManager ? 7 : 5}
                  className="text-center text-muted-foreground py-8"
                >
                  No loans recorded.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function LoanDialog() {
  const { data: employees } = useEmployees()
  const { mutate: create, isPending } = useCreateLoan()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<LoanInput>({
    employeeId: "",
    type: "company",
    principal: "",
    amortization: "",
    startDate: new Date().toISOString().slice(0, 10),
  })

  const set = (k: keyof LoanInput, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    create(form, {
      onSuccess: () => {
        setOpen(false)
        setForm({
          employeeId: "",
          type: "company",
          principal: "",
          amortization: "",
          startDate: new Date().toISOString().slice(0, 10),
        })
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" /> Add Loan
          </Button>
        }
      />
      <DialogContent className="max-w-md w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle>Add Loan</DialogTitle>
          <DialogDescription>
            The amortization amount is deducted from each processed payslip until the
            balance reaches zero.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select value={form.employeeId} onValueChange={(v) => set("employeeId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees?.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.user?.name ?? e.employeeNo} ({e.employeeNo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => set("type", v ?? "company")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOAN_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Principal (₱)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="12000"
                value={form.principal}
                onChange={(e) => set("principal", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Amortization (₱)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="1000"
                value={form.amortization}
                onChange={(e) => set("amortization", e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => set("startDate", e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancel</Button>} />
            <Button type="submit" disabled={isPending || !form.employeeId}>
              {isPending ? "Saving…" : "Add Loan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
