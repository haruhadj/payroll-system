"use client"

import { useQuery } from "@tanstack/react-query"

async function apiFetch(path: string) {
  const res = await fetch(`/api${path}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }))
    throw new Error(err.error ?? "Request failed")
  }
  return res.json()
}

export interface ThirteenthMonthFilters {
  year: number
  designation?: string
  group?: string
  team?: string
}

export function useThirteenthMonth(filters: ThirteenthMonthFilters) {
  const q = new URLSearchParams()
  q.set("year", String(filters.year))
  if (filters.designation) q.set("designation", filters.designation)
  if (filters.group) q.set("group", filters.group)
  if (filters.team) q.set("team", filters.team)
  return useQuery({
    queryKey: ["thirteenth-month", filters],
    queryFn: () => apiFetch(`/payroll/thirteenth-month?${q}`),
  })
}
