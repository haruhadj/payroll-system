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

export function useMyFeedback() {
  return useQuery({
    queryKey: ["feedback", "mine"],
    queryFn: () => apiFetch("/feedback/mine"),
  })
}

export function useFeedbackSummary(periodId?: string) {
  return useQuery({
    queryKey: ["feedback", "summary", periodId],
    queryFn: () => apiFetch(`/feedback/summary${periodId ? `?periodId=${periodId}` : ""}`),
  })
}

export function useAllFeedback(params?: { periodId?: string; employeeId?: string }) {
  const q = new URLSearchParams()
  if (params?.periodId) q.set("periodId", params.periodId)
  if (params?.employeeId) q.set("employeeId", params.employeeId)
  return useQuery({
    queryKey: ["feedback", params],
    queryFn: () => apiFetch(`/feedback?${q}`),
  })
}

export function useSubmitFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { periodId: string; rating: number; comment?: string }) =>
      apiFetch("/feedback", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feedback"] })
      toast.success("Feedback submitted. Thank you!")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
