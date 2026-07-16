"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { useSession } from "@/lib/auth/client"
import { usePayslips } from "@/lib/hooks/usePayslips"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, cn } from "@/lib/utils"
import { MonthlyLeavesCard } from "@/components/monthly-leaves-card"
import { Users, FileText, Star, CalendarRange, MessageSquare } from "lucide-react"

export default function DashboardPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role ?? "employee"

  if (role === "employee") {
    return <EmployeeDashboard />
  }
  return <AdminDashboard />
}

// ---------------------------------------------------------------------------
// Admin / HR dashboard
// ---------------------------------------------------------------------------

function useDashboardOverview() {
  return useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/overview")
      if (!res.ok) throw new Error("Failed to load")
      return res.json()
    },
  })
}

const statusColor: Record<string, string> = {
  draft: "secondary",
  processed: "default",
  released: "outline",
}

function AdminDashboard() {
  const { data, isLoading } = useDashboardOverview()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Payroll system overview</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Employees"
          value={data?.totalEmployees}
          icon={Users}
          loading={isLoading}
          tone="indigo"
        />
        <StatCard
          title="Pending Payslips"
          value={data?.pendingPayslips}
          icon={FileText}
          loading={isLoading}
          tone="amber"
        />
        <StatCard
          title="Active Periods"
          value={data?.activePayrollPeriods}
          icon={CalendarRange}
          loading={isLoading}
          tone="sky"
        />
        <StatCard
          title="Avg. Feedback Rating"
          value={data?.averageFeedbackRating != null ? `${data.averageFeedbackRating} / 5` : "—"}
          icon={Star}
          loading={isLoading}
          tone="emerald"
        />
      </div>

      {/* Monthly leaves */}
      <MonthlyLeavesCard />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Latest period */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Latest Payroll Period</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : data?.latestPeriod ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{data.latestPeriod.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {data.latestPeriod.dateFrom} → {data.latestPeriod.dateTo}
                  </p>
                </div>
                <Badge variant={statusColor[data.latestPeriod.status] as any}>
                  {data.latestPeriod.status}
                </Badge>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No payroll periods yet</p>
            )}
          </CardContent>
        </Card>

        {/* Recent feedback */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : data?.recentFeedback?.length ? (
              <ul className="space-y-2">
                {data.recentFeedback.map((f: any, i: number) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span>{f.employee}</span>
                    <span className="flex items-center gap-1">
                      {"★".repeat(f.rating)}
                      <span className="text-muted-foreground">({f.rating}/5)</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No feedback yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Employee dashboard
// ---------------------------------------------------------------------------

function EmployeeDashboard() {
  const { data: session } = useSession()
  const { data: payslips, isLoading } = usePayslips()
  const latest = payslips?.[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-muted-foreground">Your payroll at a glance</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Latest Net Pay"
          value={latest ? formatCurrency(parseFloat(latest.netPay)) : "No payslips yet"}
          icon={FileText}
          loading={isLoading}
          tone="emerald"
        />
        <StatCard
          title="Total Payslips"
          value={payslips?.length ?? 0}
          icon={CalendarRange}
          loading={isLoading}
          tone="indigo"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Latest Payslip</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : latest ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{latest.period?.label}</p>
                <p className="text-sm text-muted-foreground">
                  {latest.period?.dateFrom} → {latest.period?.dateTo}
                </p>
              </div>
              <Link href="/payslips">
                <Button variant="outline" size="sm">
                  View payslips
                </Button>
              </Link>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Your payslips will appear here once a payroll period is released.
            </p>
          )}
        </CardContent>
      </Card>

      <MonthlyLeavesCard />

      <div className="flex gap-3">
        <Link href="/payslips">
          <Button variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            My Payslips
          </Button>
        </Link>
        <Link href="/feedback">
          <Button variant="outline" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Give Feedback
          </Button>
        </Link>
      </div>
    </div>
  )
}

const STAT_TONES: Record<string, string> = {
  indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
}

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
  tone = "indigo",
}: {
  title: string
  value: any
  icon: any
  loading: boolean
  tone?: keyof typeof STAT_TONES
}) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-20" />
          ) : (
            <p className="mt-1 text-2xl font-bold tracking-tight">{value ?? "—"}</p>
          )}
        </div>
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            STAT_TONES[tone],
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  )
}
