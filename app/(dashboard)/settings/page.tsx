"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users")
      if (!res.ok) throw new Error("Failed to load users")
      return res.json()
    },
  })
}

function useUpdateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Failed to update role")
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] })
      toast.success("Role updated")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

const roleVariant: Record<string, "default" | "secondary" | "outline"> = {
  admin: "default",
  hr: "secondary",
  employee: "outline",
}

export default function SettingsPage() {
  const { data: users, isLoading } = useUsers()
  const { mutate: updateRole, isPending } = useUpdateRole()
  const [pendingRoles, setPendingRoles] = useState<Record<string, string>>({})

  const set = (userId: string, role: string) =>
    setPendingRoles((r) => ({ ...r, [userId]: role }))

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage user roles and system configuration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Role Management</CardTitle>
          <CardDescription>
            Promote users to HR or Admin. Employees cannot modify their own role.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
            : users?.map((u: any) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between rounded-lg border px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={roleVariant[u.role]}>{u.role}</Badge>
                    <Select
                      value={pendingRoles[u.id] ?? u.role ?? "employee"}
                      onValueChange={(v) => set(u.id, v ?? "employee")}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="hr">HR</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending || (pendingRoles[u.id] ?? u.role) === u.role}
                      onClick={() =>
                        updateRole(
                          { userId: u.id, role: pendingRoles[u.id] ?? u.role },
                          { onSuccess: () => setPendingRoles((r) => ({ ...r, [u.id]: "" })) },
                        )
                      }
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ))}
        </CardContent>
      </Card>
    </div>
  )
}
