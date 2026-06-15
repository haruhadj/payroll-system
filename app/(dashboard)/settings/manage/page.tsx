"use client"

import { useState } from "react"
import {
  useOptions,
  useCreateOption,
  useUpdateOption,
  useDeleteOption,
  type OptionType,
  type OptionItem,
} from "@/lib/hooks/useOptions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Plus, Pencil, Trash2, Check, X } from "lucide-react"

export default function ManageOptionsPage() {
  const { data, isLoading } = useOptions()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manage Options</h1>
        <p className="text-muted-foreground">
          Define the designations, employment groups, and teams used across the system.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <OptionCard
          type="designation"
          title="Designations"
          description="Job roles / hierarchy."
          items={data?.designations}
          loading={isLoading}
        />
        <OptionCard
          type="group"
          title="Groups"
          description="Employment statuses."
          items={data?.groups}
          loading={isLoading}
        />
        <OptionCard
          type="team"
          title="Teams"
          description="Departments / units."
          items={data?.teams}
          loading={isLoading}
        />
      </div>
    </div>
  )
}

function OptionCard({
  type,
  title,
  description,
  items,
  loading,
}: {
  type: OptionType
  title: string
  description: string
  items?: OptionItem[]
  loading: boolean
}) {
  const { mutate: create, isPending: creating } = useCreateOption()
  const { mutate: update } = useUpdateOption()
  const { mutate: remove } = useDeleteOption()
  const [newName, setNewName] = useState("")
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    create({ type, name: newName.trim() }, { onSuccess: () => setNewName("") })
  }

  const startEdit = (item: OptionItem) => {
    setEditId(item.id)
    setEditName(item.name)
  }

  const saveEdit = () => {
    if (editId && editName.trim()) {
      update(
        { type, id: editId, name: editName.trim() },
        { onSuccess: () => setEditId(null) },
      )
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={add} className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={`Add ${title.slice(0, -1).toLowerCase()}…`}
          />
          <Button type="submit" size="icon" disabled={creating || !newName.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </form>

        <ul className="divide-y rounded-md border">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="p-2">
                <Skeleton className="h-6 w-full" />
              </li>
            ))
          ) : items?.length ? (
            items.map((item) => (
              <li key={item.id} className="flex items-center gap-2 p-2">
                {editId === item.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={saveEdit}>
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setEditId(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm">{item.name}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => startEdit(item)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Delete "${item.name}"?`)) remove({ type, id: item.id })
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </li>
            ))
          ) : (
            <li className="p-4 text-center text-sm text-muted-foreground">
              No options yet.
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  )
}
