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
  date: string
  timeIn?: string | null
  timeOut?: string | null
}

export interface TimeLogUpdateInput {
  timeIn?: string | null
  timeOut?: string | null
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

export function useTodayTimeLog(employeeId: string | null) {
  const today = new Date().toISOString().slice(0, 10)
  return useQuery({
    queryKey: ["timelogs", "today", employeeId],
    queryFn: () =>
      apiFetch(`/timelogs?employeeId=${employeeId}&from=${today}&to=${today}`),
    enabled: !!employeeId,
  })
}

export function useCreateTimeLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TimeLogInput) =>
      apiFetch("/timelogs", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timelogs"] })
      toast.success("Time log added")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateTimeLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TimeLogUpdateInput }) =>
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
      toast.success("Time log removed")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useClockIn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiFetch("/timelogs/clock-in", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timelogs"] })
      toast.success("Clocked in")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useClockOut() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiFetch("/timelogs/clock-out", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timelogs"] })
      toast.success("Clocked out")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
