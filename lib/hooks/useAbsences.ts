"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }))
    throw new Error(err.error ?? "Request failed")
  }
  return res.json()
}

export interface AbsenceFilters {
  employeeId?: string
  from?: string
  to?: string
}

export interface AbsenceInput {
  employeeId: string
  date: string
  reason?: string | null
}

export function useAbsences(filters: AbsenceFilters = {}) {
  const params = new URLSearchParams()
  if (filters.employeeId) params.set("employeeId", filters.employeeId)
  if (filters.from) params.set("from", filters.from)
  if (filters.to) params.set("to", filters.to)
  const qs = params.toString()
  return useQuery({
    queryKey: ["absences", filters],
    queryFn: () => apiFetch(`/absences${qs ? `?${qs}` : ""}`),
  })
}

export function useCreateAbsence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AbsenceInput) =>
      apiFetch("/absences", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["absences"] })
      toast.success("Absence logged")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteAbsence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/absences/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["absences"] })
      toast.success("Absence removed")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useAttendanceSummary(periodId: string, employeeId: string | null) {
  return useQuery({
    queryKey: ["attendance-summary", periodId, employeeId],
    queryFn: () => apiFetch(`/payroll/${periodId}/attendance/${employeeId}`),
    enabled: !!periodId && !!employeeId,
  })
}
