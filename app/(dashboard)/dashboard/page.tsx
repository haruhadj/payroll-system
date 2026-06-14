"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { useSession } from "@/lib/auth/client"
import { usePayslips } from "@/lib/hooks/usePayslips"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"
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
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Payroll system overview</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Employees"
          value={data?.totalEmployees}
          icon={Users}
          loading={isLoading}
        />
        <StatCard
          title="Pending Payslips"
          value={data?.pendingPayslips}
          icon={FileText}
          loading={isLoading}
        />
        <StatCard
          title="Active Periods"
          value={data?.activePayrollPeriods}
          icon={CalendarRange}
          loading={isLoading}
        />
        <StatCard
          title="Avg. Feedback Rating"
          value={data?.averageFeedbackRating != null ? `${data.averageFeedbackRating} / 5` : "—"}
          icon={Star}
          loading={isLoading}
        />
      </div>

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
        <h1 className="text-2xl font-bold">
          Welcome{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-muted-foreground">Your payroll at a glance</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Latest Net Pay
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : latest ? (
              <p className="text-2xl font-bold">{formatCurrency(parseFloat(latest.netPay))}</p>
            ) : (
              <p className="text-muted-foreground text-sm">No payslips yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Payslips
            </CardTitle>
            <CalendarRange className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <p className="text-2xl font-bold">{payslips?.length ?? 0}</p>
            )}
          </CardContent>
        </Card>
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

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
}: {
  title: string
  value: any
  icon: any
  loading: boolean
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <p className="text-2xl font-bold">{value ?? "—"}</p>
        )}
      </CardContent>
    </Card>
  )
}
