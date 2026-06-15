"use client"

import { TimeCard } from "@/components/time-card"

export default function TimeCardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Time Card</h1>
        <p className="text-muted-foreground">
          Daily attendance grid for all active employees.
        </p>
      </div>
      <TimeCard />
    </div>
  )
}
