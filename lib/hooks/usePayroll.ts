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

export function usePayrollPeriods(status?: string) {
  return useQuery({
    queryKey: ["payroll", { status }],
    queryFn: () => apiFetch(`/payroll${status ? `?status=${status}` : ""}`),
  })
}

export function usePayrollPeriod(id: string) {
  return useQuery({
    queryKey: ["payroll", id],
    queryFn: () => apiFetch(`/payroll/${id}`),
    enabled: !!id,
  })
}

export function useCreatePayrollPeriod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { label: string; dateFrom: string; dateTo: string }) =>
      apiFetch("/payroll", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll"] })
      toast.success("Payroll period created")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdatePayrollStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "processed" | "released" }) =>
      apiFetch(`/payroll/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["payroll"] })
      qc.invalidateQueries({ queryKey: ["payslips"] })
      toast.success(status === "processed" ? "Payslips generated" : "Period released to employees")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeletePayrollPeriod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/payroll/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll"] })
      toast.success("Period deleted")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
