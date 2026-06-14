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

export function useEmployees(params?: { department?: string; position?: string }) {
  const query = new URLSearchParams()
  if (params?.department) query.set("department", params.department)
  if (params?.position) query.set("position", params.position)
  return useQuery({
    queryKey: ["employees", params],
    queryFn: () => apiFetch(`/employees?${query}`),
  })
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ["employees", id],
    queryFn: () => apiFetch(`/employees/${id}`),
    enabled: !!id,
  })
}

export function useUnlinkedUsers() {
  return useQuery({
    queryKey: ["employees", "unlinked-users"],
    queryFn: () => apiFetch("/employees/users/unlinked"),
  })
}

export function useCreateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch("/employees", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] })
      toast.success("Employee created")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateEmployee(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch(`/employees/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] })
      toast.success("Employee updated")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/employees/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] })
      toast.success("Employee deleted")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
