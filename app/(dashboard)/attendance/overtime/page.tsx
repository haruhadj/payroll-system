"use client"

import { OvertimeRequestsCard } from "@/components/overtime-requests-card"

export default function OvertimePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overtime</h1>
        <p className="text-muted-foreground">
          File and approve overtime hours.
        </p>
      </div>
      <OvertimeRequestsCard />
    </div>
  )
}
