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

export interface ProfileInput {
  username?: string | null
  contactNo1?: string | null
  contactNo2?: string | null
  address?: string | null
  biometricId?: string | null
  iceName?: string | null
  iceContact?: string | null
  iceEmail?: string | null
  iceAddress?: string | null
}

export interface DocumentInput {
  name: string
  url: string
  type?: string | null
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => apiFetch("/profile"),
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ProfileInput) =>
      apiFetch("/profile", { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] })
      toast.success("Profile saved")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiFetch("/profile/password", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => toast.success("Password changed"),
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useAddDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: DocumentInput) =>
      apiFetch("/profile/documents", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] })
      toast.success("Document added")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/profile/documents/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] })
      toast.success("Document removed")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
