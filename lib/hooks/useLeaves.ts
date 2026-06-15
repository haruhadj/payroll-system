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

export type LeaveType = "vacation" | "sick" | "emergency" | "unpaid"
export type LeaveStatus = "pending" | "approved" | "rejected"

export interface LeaveRequestInput {
  employeeId?: string
  type: LeaveType
  dateFrom: string
  dateTo: string
  days: string
  reason?: string | null
}

export interface LeaveCreditInput {
  employeeId: string
  type: LeaveType
  balance: string
}

// ----- Leave requests --------------------------------------------------------

export function useLeaveRequests(params?: { status?: LeaveStatus; employeeId?: string }) {
  const query = new URLSearchParams()
  if (params?.status) query.set("status", params.status)
  if (params?.employeeId) query.set("employeeId", params.employeeId)
  return useQuery({
    queryKey: ["leaves", params],
    queryFn: () => apiFetch(`/leaves?${query}`),
  })
}

export function useCreateLeaveRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: LeaveRequestInput) =>
      apiFetch("/leaves", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leaves"] })
      toast.success("Leave request submitted")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateLeaveStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "rejected" }) =>
      apiFetch(`/leaves/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["leaves"] })
      qc.invalidateQueries({ queryKey: ["leave-credits"] })
      toast.success(status === "approved" ? "Leave approved" : "Leave rejected")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteLeaveRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/leaves/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leaves"] })
      toast.success("Leave request deleted")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ----- Leave credits ---------------------------------------------------------

export function useLeaveCredits(params?: { employeeId?: string }) {
  const query = new URLSearchParams()
  if (params?.employeeId) query.set("employeeId", params.employeeId)
  return useQuery({
    queryKey: ["leave-credits", params],
    queryFn: () => apiFetch(`/leaves/credits?${query}`),
  })
}

export function useUpsertLeaveCredit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: LeaveCreditInput) =>
      apiFetch("/leaves/credits", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave-credits"] })
      toast.success("Leave credits saved")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
