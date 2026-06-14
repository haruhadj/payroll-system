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

export function usePayslips(params?: { periodId?: string; employeeId?: string; status?: string }) {
  const q = new URLSearchParams()
  if (params?.periodId) q.set("periodId", params.periodId)
  if (params?.employeeId) q.set("employeeId", params.employeeId)
  if (params?.status) q.set("status", params.status)
  return useQuery({
    queryKey: ["payslips", params],
    queryFn: () => apiFetch(`/payslips?${q}`),
  })
}

export function usePayslip(id: string) {
  return useQuery({
    queryKey: ["payslips", id],
    queryFn: () => apiFetch(`/payslips/${id}`),
    enabled: !!id,
  })
}

export function usePayslipSummary(periodId: string) {
  return useQuery({
    queryKey: ["payslips", "summary", periodId],
    queryFn: () => apiFetch(`/payslips/summary/${periodId}`),
    enabled: !!periodId,
  })
}

export function useUpdatePayslipStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "paid" }) =>
      apiFetch(`/payslips/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payslips"] })
      toast.success("Payslip status updated")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
