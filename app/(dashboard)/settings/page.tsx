"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useSession } from "@/lib/auth/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Plus, Trash2 } from "lucide-react"

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

function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; email: string; password: string; role: string }) => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? "Failed to create user")
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] })
      qc.invalidateQueries({ queryKey: ["employees", "unlinked-users"] })
      toast.success("User created")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? "Failed to delete user")
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] })
      toast.success("User deleted")
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
  const { data: session } = useSession()
  const currentUserId = session?.user?.id
  const { data: users, isLoading } = useUsers()
  const { mutate: updateRole, isPending } = useUpdateRole()
  const { mutate: deleteUser, isPending: deleting } = useDeleteUser()
  const [pendingRoles, setPendingRoles] = useState<Record<string, string>>({})

  const set = (userId: string, role: string) =>
    setPendingRoles((r) => ({ ...r, [userId]: role }))

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage user accounts and roles</p>
        </div>
        <CreateUserDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Accounts</CardTitle>
          <CardDescription>
            Provision accounts for staff and employees, set their roles, or remove access.
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
                    <p className="font-medium">
                      {u.name}
                      {u.id === currentUserId && (
                        <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                      )}
                    </p>
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
                    {u.id !== currentUserId && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={deleting}
                        onClick={() => {
                          if (
                            confirm(
                              `Delete ${u.name}? This also removes their employee record and payslips.`,
                            )
                          )
                            deleteUser(u.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
        </CardContent>
      </Card>
    </div>
  )
}

function CreateUserDialog() {
  const { mutate: createUser, isPending } = useCreateUser()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee",
  })

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    createUser(form, {
      onSuccess: () => {
        setOpen(false)
        setForm({ name: "", email: "", password: "", role: "employee" })
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New User
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create User Account</DialogTitle>
          <DialogDescription>
            Provision a new account. Share the password with the user securely.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input
              placeholder="Juan dela Cruz"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="juan@company.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Temporary Password</Label>
            <Input
              type="text"
              placeholder="Min. 8 characters"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              minLength={8}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => set("role", v ?? "employee")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              }
            />
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating…" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
