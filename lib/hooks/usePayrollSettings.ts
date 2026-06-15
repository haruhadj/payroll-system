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

export function usePayrollSettings() {
  return useQuery({
    queryKey: ["payroll-settings"],
    queryFn: () => apiFetch("/settings/payroll"),
  })
}

export function useUpdatePayrollSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch("/settings/payroll", { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll-settings"] })
      toast.success("Payroll settings saved")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useCompanyProfile() {
  return useQuery({
    queryKey: ["company-profile"],
    queryFn: () => apiFetch("/settings/company"),
  })
}

export function useUpdateCompanyProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch("/settings/company", { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-profile"] })
      toast.success("Company profile saved")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
