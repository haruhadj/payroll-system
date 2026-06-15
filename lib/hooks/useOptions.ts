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

export type OptionType = "designation" | "group" | "team"

export interface OptionItem {
  id: string
  name: string
}

export interface OptionsData {
  designations: OptionItem[]
  groups: OptionItem[]
  teams: OptionItem[]
}

export function useOptions() {
  return useQuery<OptionsData>({
    queryKey: ["options"],
    queryFn: () => apiFetch("/options"),
  })
}

export function useCreateOption() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ type, name }: { type: OptionType; name: string }) =>
      apiFetch(`/options/${type}`, { method: "POST", body: JSON.stringify({ name }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["options"] })
      toast.success("Option added")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateOption() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ type, id, name }: { type: OptionType; id: string; name: string }) =>
      apiFetch(`/options/${type}/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["options"] })
      toast.success("Option updated")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteOption() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ type, id }: { type: OptionType; id: string }) =>
      apiFetch(`/options/${type}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["options"] })
      toast.success("Option deleted")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
