"use client"

import { useState } from "react"
import { usePayslips } from "@/lib/hooks/usePayslips"
import { useMyFeedback, useSubmitFeedback } from "@/lib/hooks/useFeedback"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

function StarRating({
  value,
  onChange,
}: {
  value: number
  onChange: (n: number) => void
}) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={cn(
            "text-2xl transition-colors",
            star <= (hover || value) ? "text-yellow-400" : "text-muted-foreground",
          )}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export default function FeedbackPage() {
  const { data: payslips, isLoading: slipsLoading } = usePayslips({ status: undefined })
  const { data: myFeedback } = useMyFeedback()
  const { mutate: submit, isPending } = useSubmitFeedback()

  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [comments, setComments] = useState<Record<string, string>>({})

  const submittedPeriods = new Set(myFeedback?.map((f: any) => f.periodId))
  const releasedPayslips = payslips?.filter((s: any) => s.period?.status === "released") ?? []

  const handleSubmit = (periodId: string) => {
    const rating = ratings[periodId]
    if (!rating) return
    submit(
      { periodId, rating, comment: comments[periodId] },
      {
        onSuccess: () => {
          setRatings((r) => ({ ...r, [periodId]: 0 }))
          setComments((c) => ({ ...c, [periodId]: "" }))
        },
      },
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Feedback</h1>
        <p className="text-muted-foreground">Rate the payroll process for each period</p>
      </div>

      {slipsLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : releasedPayslips.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No released payroll periods to rate yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {releasedPayslips.map((slip: any) => {
            const periodId = slip.periodId
            const already = submittedPeriods.has(periodId)
            const existing = myFeedback?.find((f: any) => f.periodId === periodId)

            return (
              <Card key={slip.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{slip.period.label}</CardTitle>
                      <CardDescription>
                        {slip.period.dateFrom} → {slip.period.dateTo}
                      </CardDescription>
                    </div>
                    {already && (
                      <Badge variant="outline" className="gap-1">
                        <span>{"★".repeat(existing?.rating ?? 0)}</span>
                        Submitted
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                {!already && (
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Your rating</p>
                      <StarRating
                        value={ratings[periodId] ?? 0}
                        onChange={(n) => setRatings((r) => ({ ...r, [periodId]: n }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Comment (optional)</p>
                      <Textarea
                        placeholder="Any feedback about this payroll period?"
                        maxLength={1000}
                        value={comments[periodId] ?? ""}
                        onChange={(e) =>
                          setComments((c) => ({ ...c, [periodId]: e.target.value }))
                        }
                        rows={3}
                      />
                    </div>
                    <Button
                      disabled={!ratings[periodId] || isPending}
                      onClick={() => handleSubmit(periodId)}
                    >
                      {isPending ? "Submitting…" : "Submit Feedback"}
                    </Button>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
