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

export type OvertimeStatus = "pending" | "approved" | "rejected"

export interface OvertimeRequestInput {
  employeeId?: string
  date: string
  timeFrom: string
  timeTo: string
  hours: string
  note?: string | null
}

export function useOvertimeRequests(params?: {
  status?: OvertimeStatus
  employeeId?: string
  from?: string
  to?: string
}) {
  const query = new URLSearchParams()
  if (params?.status) query.set("status", params.status)
  if (params?.employeeId) query.set("employeeId", params.employeeId)
  if (params?.from) query.set("from", params.from)
  if (params?.to) query.set("to", params.to)
  return useQuery({
    queryKey: ["overtime", params],
    queryFn: () => apiFetch(`/overtime?${query}`),
  })
}

export function useCreateOvertimeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: OvertimeRequestInput) =>
      apiFetch("/overtime", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["overtime"] })
      toast.success("Overtime request submitted")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateOvertimeStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "rejected" }) =>
      apiFetch(`/overtime/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["overtime"] })
      toast.success(status === "approved" ? "Overtime approved" : "Overtime rejected")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteOvertimeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/overtime/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["overtime"] })
      toast.success("Overtime request deleted")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
