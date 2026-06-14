"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, FileText, Star, CalendarRange } from "lucide-react"

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

export default function DashboardPage() {
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
