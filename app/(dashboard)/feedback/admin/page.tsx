"use client"

import { useFeedbackSummary, useAllFeedback } from "@/lib/hooks/useFeedback"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function RatingBar({ rating, count, total }: { rating: number; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-4 text-right">{rating}★</span>
      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-yellow-400 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-12 text-muted-foreground text-right">{count} ({pct}%)</span>
    </div>
  )
}

export default function FeedbackAdminPage() {
  const { data: summary, isLoading: sumLoading } = useFeedbackSummary()
  const { data: allFeedback, isLoading: fbLoading } = useAllFeedback()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Feedback Reports</h1>
        <p className="text-muted-foreground">Employee satisfaction across payroll periods</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Overall summary */}
        <Card>
          <CardHeader>
            <CardTitle>Overall Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sumLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <span className="text-4xl font-bold">
                    {summary?.averageRating ?? "—"}
                  </span>
                  <div>
                    <div className="text-yellow-400 text-lg">
                      {"★".repeat(Math.round(summary?.averageRating ?? 0))}
                      {"☆".repeat(5 - Math.round(summary?.averageRating ?? 0))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {summary?.totalResponses ?? 0} responses
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((r) => (
                    <RatingBar
                      key={r}
                      rating={r}
                      count={summary?.ratingDistribution?.[String(r)] ?? 0}
                      total={summary?.totalResponses ?? 0}
                    />
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Per-period breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Per Period</CardTitle>
          </CardHeader>
          <CardContent>
            {sumLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : summary?.periods?.length === 0 ? (
              <p className="text-muted-foreground text-sm">No data</p>
            ) : (
              <div className="space-y-3">
                {summary?.periods?.map((p: any) => (
                  <div key={p.periodId} className="flex items-center justify-between">
                    <p className="text-sm font-medium">{p.label}</p>
                    <div className="text-right">
                      <p className="text-sm font-bold">{p.avgRating} / 5</p>
                      <p className="text-xs text-muted-foreground">{p.responseCount} responses</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All feedback entries */}
      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Comment</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fbLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : allFeedback?.map((f: any) => (
                  <TableRow key={f.id}>
                    <TableCell>
                      <p className="font-medium">{f.employee?.user?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{f.employee?.user?.email}</p>
                    </TableCell>
                    <TableCell>{f.period?.label}</TableCell>
                    <TableCell>
                      <span className="text-yellow-500">{"★".repeat(f.rating)}</span>
                      <span className="text-muted-foreground">{"★".repeat(5 - f.rating)}</span>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm text-muted-foreground truncate">
                        {f.comment ?? "—"}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(f.createdAt).toLocaleDateString("en-PH")}
                    </TableCell>
                  </TableRow>
                ))}
            {!fbLoading && allFeedback?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No feedback submitted yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
