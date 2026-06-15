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

export interface ScheduleInput {
  name: string
  timeIn: string
  timeOut: string
  breakMinutes?: number
  workDays: string[]
  isNightShift?: boolean
}

export function useSchedules() {
  return useQuery({
    queryKey: ["schedules"],
    queryFn: () => apiFetch("/schedules"),
  })
}

export function useCreateSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ScheduleInput) =>
      apiFetch("/schedules", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedules"] })
      toast.success("Schedule created")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<ScheduleInput> & { id: string }) =>
      apiFetch(`/schedules/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedules"] })
      toast.success("Schedule updated")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/schedules/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedules"] })
      toast.success("Schedule deleted")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
