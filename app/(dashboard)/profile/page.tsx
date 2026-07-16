"use client"

import { useState, useEffect } from "react"
import { useSession } from "@/lib/auth/client"
import {
  useProfile,
  useUpdateProfile,
  useChangePassword,
  useAddDocument,
  useDeleteDocument,
  type ProfileInput,
  type DocumentInput,
} from "@/lib/hooks/useProfile"
import { useLeaveCredits, useLeaveRequests } from "@/lib/hooks/useLeaves"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Plus, Trash2, ExternalLink } from "lucide-react"

const TABS = ["About", "Leaves", "Login Info", "Files"] as const
type Tab = (typeof TABS)[number]

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>("About")
  const { data, isLoading } = useProfile()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">
          Your personal details, leaves, and documents.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          {tab === "About" && <AboutTab data={data} />}
          {tab === "Leaves" && <LeavesTab />}
          {tab === "Login Info" && <LoginInfoTab username={data?.profile?.username} />}
          {tab === "Files" && <FilesTab documents={data?.documents ?? []} />}
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// About + Emergency Contact
// ---------------------------------------------------------------------------

const ABOUT_FIELDS: { key: keyof ProfileInput; label: string }[] = [
  { key: "username", label: "Username" },
  { key: "contactNo1", label: "Contact number 1" },
  { key: "contactNo2", label: "Contact number 2" },
  { key: "address", label: "Address" },
]

const ICE_FIELDS: { key: keyof ProfileInput; label: string }[] = [
  { key: "iceName", label: "Contact person's name" },
  { key: "iceContact", label: "Contact number" },
  { key: "iceEmail", label: "Email" },
  { key: "iceAddress", label: "Address" },
]

function AboutTab({ data }: { data: any }) {
  const { mutate: save, isPending } = useUpdateProfile()
  const [form, setForm] = useState<Record<string, any>>({})

  useEffect(() => {
    if (data?.profile) setForm(data.profile)
  }, [data])

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = () => {
    const payload: ProfileInput = {}
    for (const f of [...ABOUT_FIELDS, ...ICE_FIELDS]) {
      ;(payload as any)[f.key] = form[f.key] || null
    }
    save(payload)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Meta */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>System account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Meta label="Full name" value={data?.user?.name} />
          <Meta label="Email" value={data?.user?.email} />
          <Meta label="Position" value={data?.employee?.position ?? "—"} />
          <Meta label="Department" value={data?.employee?.department ?? "—"} />
          <Meta
            label="Employee Status"
            value={
              data?.employee
                ? data.employee.isActive
                  ? "Active"
                  : "Inactive"
                : "—"
            }
          />
          <Meta label="Role" value={data?.user?.role} />
        </CardContent>
      </Card>

      {/* About form */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
          <CardDescription>Your contact information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ABOUT_FIELDS.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label className="text-xs">{f.label}</Label>
              <Input
                value={form[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ICE */}
      <Card>
        <CardHeader>
          <CardTitle>In Case of Emergency</CardTitle>
          <CardDescription>Who to contact in an emergency.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ICE_FIELDS.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label className="text-xs">{f.label}</Label>
              <Input
                value={form[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="lg:col-span-3">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving…" : "Save Profile"}
        </Button>
      </div>
    </div>
  )
}

function Meta({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right capitalize">{value ?? "—"}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Leaves (SIL balance + history)
// ---------------------------------------------------------------------------

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  pending: "secondary",
  approved: "default",
  rejected: "outline",
}

function LeavesTab() {
  const { data: credits, isLoading: loadingCredits } = useLeaveCredits()
  const { data: requests, isLoading: loadingReqs } = useLeaveRequests()

  const available = (credits ?? []).reduce(
    (s: number, c: any) => s + parseFloat(c.balance ?? "0"),
    0,
  )
  const availed = (requests ?? [])
    .filter((r: any) => r.status === "approved")
    .reduce((s: number, r: any) => s + parseFloat(r.days ?? "0"), 0)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatBox label="Total SIL" value={available + availed} loading={loadingCredits} />
        <StatBox label="Availed SIL" value={availed} loading={loadingReqs} />
        <StatBox label="Available SIL" value={available} loading={loadingCredits} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leave History</CardTitle>
          <CardDescription>Your leave applications.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingReqs ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 4 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : requests?.length ? (
                  requests.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">
                        {r.dateFrom === r.dateTo ? r.dateFrom : `${r.dateFrom} → ${r.dateTo}`}
                      </TableCell>
                      <TableCell className="capitalize">{r.type}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[r.status]}>{r.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{r.days}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No leaves yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatBox({
  label,
  value,
  loading,
}: {
  label: string
  value: number
  loading: boolean
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-12" />
        ) : (
          <p className="text-2xl font-bold">{Math.round(value * 100) / 100}</p>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Login info (change password)
// ---------------------------------------------------------------------------

function LoginInfoTab({ username }: { username?: string | null }) {
  const { mutate: change, isPending } = useChangePassword()
  const [form, setForm] = useState({ currentPassword: "", newPassword: "" })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    change(form, {
      onSuccess: () => setForm({ currentPassword: "", newPassword: "" }),
    })
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Login Information</CardTitle>
        <CardDescription>Change your account password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Username</Label>
            <Input value={username ?? ""} disabled placeholder="Not set" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Current Password</Label>
            <Input
              type="password"
              value={form.currentPassword}
              onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">New Password</Label>
            <Input
              type="password"
              value={form.newPassword}
              onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
              placeholder="Min. 8 characters"
              required
            />
          </div>
          <Button type="submit" disabled={isPending || form.newPassword.length < 8}>
            {isPending ? "Changing…" : "Change Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Files (document links)
// ---------------------------------------------------------------------------

function FilesTab({ documents }: { documents: any[] }) {
  const { mutate: remove, isPending: deleting } = useDeleteDocument()

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>Files</CardTitle>
          <CardDescription>Links to documents stored elsewhere (e.g. Google Drive).</CardDescription>
        </div>
        <AddDocumentDialog />
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Date Uploaded</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length ? (
                documents.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(d.createdAt).toLocaleDateString("en-PH")}
                    </TableCell>
                    <TableCell className="text-sm">{d.type ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <a href={d.url} target="_blank" rel="noopener noreferrer">
                          <Button size="icon" variant="ghost">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </a>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          disabled={deleting}
                          onClick={() => {
                            if (confirm("Remove this document link?")) remove(d.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No files found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function AddDocumentDialog() {
  const { mutate: add, isPending } = useAddDocument()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: "", url: "", type: "" })
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: DocumentInput = {
      name: form.name,
      url: form.url,
      type: form.type || null,
    }
    add(payload, {
      onSuccess: () => {
        setOpen(false)
        setForm({ name: "", url: "", type: "" })
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Add Document
          </Button>
        }
      />
      <DialogContent className="max-w-md w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle>Add Document Link</DialogTitle>
          <DialogDescription>Paste a shareable link to the document.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>URL</Label>
            <Input
              type="url"
              placeholder="https://drive.google.com/…"
              value={form.url}
              onChange={(e) => set("url", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Type (optional)</Label>
            <Input placeholder="PDF, JPEG, DOCX…" value={form.type} onChange={(e) => set("type", e.target.value)} />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancel</Button>} />
            <Button type="submit" disabled={isPending || !form.name || !form.url}>
              {isPending ? "Adding…" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
