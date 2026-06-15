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

export interface HolidayInput {
  name: string
  date: string
  type: "regular" | "special_non_working"
}

export function useHolidays() {
  return useQuery({
    queryKey: ["holidays"],
    queryFn: () => apiFetch("/holidays"),
  })
}

export function useCreateHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: HolidayInput) =>
      apiFetch("/holidays", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["holidays"] })
      toast.success("Holiday added")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<HolidayInput> & { id: string }) =>
      apiFetch(`/holidays/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["holidays"] })
      toast.success("Holiday updated")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/holidays/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["holidays"] })
      toast.success("Holiday deleted")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
