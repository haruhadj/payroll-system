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

export interface TimeLogFilters {
  employeeId?: string
  from?: string
  to?: string
}

export interface TimeLogInput {
  employeeId: string
  logDate: string
  amIn?: string | null
  amOut?: string | null
  pmIn?: string | null
  pmOut?: string | null
  otIn?: string | null
  otOut?: string | null
}

export function useTimeLogs(filters: TimeLogFilters = {}) {
  const params = new URLSearchParams()
  if (filters.employeeId) params.set("employeeId", filters.employeeId)
  if (filters.from) params.set("from", filters.from)
  if (filters.to) params.set("to", filters.to)
  const qs = params.toString()
  return useQuery({
    queryKey: ["timelogs", filters],
    queryFn: () => apiFetch(`/timelogs${qs ? `?${qs}` : ""}`),
  })
}

export function useCreateTimeLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TimeLogInput) =>
      apiFetch("/timelogs", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timelogs"] })
      toast.success("Time log saved")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateTimeLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<TimeLogInput> & { id: string }) =>
      apiFetch(`/timelogs/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timelogs"] })
      toast.success("Time log updated")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteTimeLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/timelogs/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timelogs"] })
      toast.success("Time log deleted")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

interface ScanResult {
  action: string // e.g. "AM in", "PM out", or "done"
  employeeName: string
  employeeNo: string
}

export function useDailyTimeCard(date: string) {
  return useQuery({
    queryKey: ["timecard-daily", date],
    queryFn: () => apiFetch(`/timelogs/timecard?date=${date}`),
  })
}

export function useTimeCard(periodId: string, employeeId: string | null) {
  return useQuery({
    queryKey: ["timecard", periodId, employeeId],
    queryFn: () => apiFetch(`/payroll/${periodId}/timecard/${employeeId}`),
    enabled: !!periodId && !!employeeId,
  })
}

export function useScanFingerprint() {
  const qc = useQueryClient()
  return useMutation<ScanResult>({
    mutationFn: () => apiFetch("/timelogs/scan", { method: "POST" }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["timelogs"] })
      if (res.action === "done") {
        toast.info(`${res.employeeName} already completed today's log`)
      } else {
        toast.success(`${res.employeeName} punched ${res.action}`)
      }
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
