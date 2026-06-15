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

export type LoanType = "sss" | "pagibig" | "company" | "other"
export type LoanStatus = "active" | "paid" | "cancelled"

export interface LoanInput {
  employeeId: string
  type: LoanType
  principal: string
  amortization: string
  startDate: string
  balance?: string
}

export function useLoans(params?: { employeeId?: string; status?: LoanStatus }) {
  const query = new URLSearchParams()
  if (params?.employeeId) query.set("employeeId", params.employeeId)
  if (params?.status) query.set("status", params.status)
  return useQuery({
    queryKey: ["loans", params],
    queryFn: () => apiFetch(`/loans?${query}`),
  })
}

export function useCreateLoan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: LoanInput) =>
      apiFetch("/loans", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loans"] })
      toast.success("Loan added")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateLoan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<LoanInput> & { id: string; status?: LoanStatus }) =>
      apiFetch(`/loans/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loans"] })
      toast.success("Loan updated")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteLoan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/loans/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loans"] })
      toast.success("Loan deleted")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
