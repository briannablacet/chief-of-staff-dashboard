"use client"

import { useState, useTransition } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import {
  Plus,
  ExternalLink,
  Trash2,
  ChevronDown,
  Link2,
  Building2,
  MapPin,
  Calendar,
  StickyNote,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { updateMatchStatus, saveManualMatch, deleteMatch, type MatchDoc } from "@/lib/actions"

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type Status = MatchDoc["status"]

const PIPELINE: { status: Status; label: string; color: string }[] = [
  { status: "New",          label: "New",          color: "bg-muted text-muted-foreground" },
  { status: "Reviewing",    label: "Reviewing",    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  { status: "Applied",      label: "Applied",      color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
  { status: "Interviewing", label: "Interviewing", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  { status: "Offer",        label: "Offer",        color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  { status: "Rejected",     label: "Rejected",     color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  { status: "Not a Fit",    label: "Not a Fit",    color: "bg-muted text-muted-foreground line-through" },
]

function statusColor(s: Status) {
  return PIPELINE.find((p) => p.status === s)?.color ?? "bg-muted text-muted-foreground"
}

function statusLabel(s: Status) {
  return PIPELINE.find((p) => p.status === s)?.label ?? s
}

// ---------------------------------------------------------------------------
// Add job dialog (manual + LinkedIn paste)
// ---------------------------------------------------------------------------

function AddJobDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    company: "",
    role: "",
    location: "",
    workModel: "Remote" as MatchDoc["workModel"],
    salary: "",
    jobUrl: "",
    jobReqContent: "",
    notes: "",
  })

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = () => {
    if (!form.company.trim() || !form.role.trim()) {
      toast.error("Company and role are required")
      return
    }
    startTransition(async () => {
      await saveManualMatch(form)
      toast.success("Job added to tracker")
      setForm({ company: "", role: "", location: "", workModel: "Remote", salary: "", jobUrl: "", jobReqContent: "", notes: "" })
      onSaved()
      onClose()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a job</DialogTitle>
        </DialogHeader>

        {/* LinkedIn tip */}
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/40">
          <Link2 className="mt-0.5 size-4 shrink-0 text-blue-600" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <span className="font-semibold">LinkedIn jobs:</span> Open the job on LinkedIn, copy the URL into the field below, then paste the full job description into the description box. LinkedIn blocks automated scraping, so this is the fastest way to track those roles.
          </p>
        </div>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tj-company">Company *</Label>
              <Input id="tj-company" placeholder="Acme Corp" value={form.company} onChange={(e) => set("company", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tj-role">Role / Title *</Label>
              <Input id="tj-role" placeholder="Chief of Staff" value={form.role} onChange={(e) => set("role", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tj-location">Location</Label>
              <Input id="tj-location" placeholder="San Francisco, CA" value={form.location} onChange={(e) => set("location", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tj-workmodel">Work model</Label>
              <Select value={form.workModel} onValueChange={(v) => set("workModel", v as MatchDoc["workModel"])}>
                <SelectTrigger id="tj-workmodel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Remote">Remote</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                  <SelectItem value="On-site">On-site</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tj-salary">Salary range</Label>
              <Input id="tj-salary" placeholder="$180k–$220k" value={form.salary} onChange={(e) => set("salary", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tj-url">Job URL</Label>
              <Input id="tj-url" placeholder="https://..." value={form.jobUrl} onChange={(e) => set("jobUrl", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tj-desc">Job description (paste from LinkedIn or elsewhere)</Label>
            <Textarea
              id="tj-desc"
              placeholder="Paste the full job description here..."
              className="min-h-[100px] resize-y font-mono text-xs"
              value={form.jobReqContent}
              onChange={(e) => set("jobReqContent", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tj-notes">Notes</Label>
            <Textarea
              id="tj-notes"
              placeholder="Referral from Jane, applied via Greenhouse..."
              className="min-h-[60px] resize-y"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Add job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Notes editor inline
// ---------------------------------------------------------------------------

function NotesCell({ matchId, initialNotes }: { matchId: string; initialNotes?: string }) {
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState(initialNotes ?? "")
  const [isPending, startTransition] = useTransition()

  const save = () => {
    startTransition(async () => {
      await updateMatchStatus(matchId, undefined as unknown as MatchDoc["status"], { notes })
      setEditing(false)
      toast.success("Notes saved")
    })
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex w-full items-center gap-1.5 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <StickyNote className="size-3 shrink-0" />
        <span className="truncate">{notes || "Add notes..."}</span>
      </button>
    )
  }

  return (
    <div className="flex items-start gap-1.5">
      <Textarea
        autoFocus
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); save() }
          if (e.key === "Escape") setEditing(false)
        }}
        className="min-h-[60px] resize-none text-xs"
        placeholder="Notes..."
      />
      <div className="flex flex-col gap-1">
        <Button size="sm" className="h-6 px-2 text-xs" onClick={save} disabled={isPending}>Save</Button>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setEditing(false)}>
          <X className="size-3" />
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Status dropdown per row
// ---------------------------------------------------------------------------

function StatusDropdown({ match, onUpdate }: { match: MatchDoc; onUpdate: () => void }) {
  const [isPending, startTransition] = useTransition()

  const change = (s: Status) => {
    startTransition(async () => {
      const patch = s === "Applied" ? { appliedAt: new Date() } : undefined
      await updateMatchStatus(match.matchId, s, patch)
      onUpdate()
    })
  }

  return (
    <Select value={match.status} onValueChange={(v) => change(v as Status)} disabled={isPending}>
      <SelectTrigger className="h-7 w-36 border-0 bg-transparent px-0 text-xs shadow-none focus:ring-0">
        <Badge className={`pointer-events-none text-xs font-medium ${statusColor(match.status)}`}>
          {statusLabel(match.status)}
        </Badge>
        <ChevronDown className="ml-1 size-3 shrink-0 opacity-50" />
      </SelectTrigger>
      <SelectContent>
        {PIPELINE.map((p) => (
          <SelectItem key={p.status} value={p.status}>
            <Badge className={`text-xs font-medium ${p.color}`}>{p.label}</Badge>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ---------------------------------------------------------------------------
// Main tracker component
// ---------------------------------------------------------------------------

interface TrackerProps {
  initialMatches: MatchDoc[]
}

export function Tracker({ initialMatches }: TrackerProps) {
  const { data: matches = initialMatches, mutate } = useSWR<MatchDoc[]>(
    "/api/matches",
    (url: string) => fetch(url).then((r) => r.json()),
    { fallbackData: initialMatches, revalidateOnFocus: false }
  )

  const [addOpen, setAddOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<Status | "all">("all")
  const [, startTransition] = useTransition()

  const handleDelete = (matchId: string, role: string, company: string) => {
    if (!confirm(`Remove "${role} at ${company}" from your tracker?`)) return
    startTransition(async () => {
      await deleteMatch(matchId)
      mutate()
      toast.success("Job removed")
    })
  }

  const filtered = filterStatus === "all"
    ? matches
    : matches.filter((m) => m.status === filterStatus)

  // Summary counts
  const counts = PIPELINE.reduce((acc, p) => {
    acc[p.status] = matches.filter((m) => m.status === p.status).length
    return acc
  }, {} as Record<Status, number>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Application Tracker</h2>
          <p className="text-sm text-muted-foreground">
            {matches.length} job{matches.length !== 1 ? "s" : ""} tracked — {counts["Applied"] ?? 0} applied, {counts["Interviewing"] ?? 0} interviewing
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Add job
        </Button>
      </div>

      {/* Pipeline summary bar */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {PIPELINE.map((p) => (
          <button
            key={p.status}
            onClick={() => setFilterStatus(filterStatus === p.status ? "all" : p.status)}
            className={`rounded-lg border p-3 text-center transition-colors ${filterStatus === p.status ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-accent/50"}`}
          >
            <p className="text-2xl font-bold text-foreground">{counts[p.status] ?? 0}</p>
            <p className="text-xs text-muted-foreground">{p.label}</p>
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <Building2 className="size-8 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">
            {filterStatus === "all" ? "No jobs tracked yet" : `No jobs with status "${statusLabel(filterStatus)}"`}
          </p>
          {filterStatus === "all" && (
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" />
              Add your first job
            </Button>
          )}
          {filterStatus !== "all" && (
            <Button variant="ghost" size="sm" onClick={() => setFilterStatus("all")}>Show all</Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Role / Company</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium text-muted-foreground md:table-cell">Location</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium text-muted-foreground lg:table-cell">Added</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium text-muted-foreground xl:table-cell">Notes</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((m) => (
                <tr key={m.matchId} className="group bg-card transition-colors hover:bg-accent/30">
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{m.role}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Building2 className="size-3 shrink-0" />
                          <span>{m.company}</span>
                          {m.source === "manual" && (
                            <Badge variant="outline" className="ml-1 py-0 text-[10px]">Manual</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3 shrink-0" />
                      <span>{m.location || m.workModel}</span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="size-3 shrink-0" />
                      <span>
                        {m.appliedAt
                          ? new Date(m.appliedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                          : m.postedAgo}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusDropdown match={m} onUpdate={() => mutate()} />
                  </td>
                  <td className="hidden px-4 py-3 xl:table-cell">
                    <NotesCell matchId={m.matchId} initialNotes={m.notes} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {m.jobUrl && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-foreground"
                          aria-label="Open job listing"
                          onClick={() => window.open(m.jobUrl, "_blank", "noopener,noreferrer")}
                        >
                          <ExternalLink className="size-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                        aria-label="Delete"
                        onClick={() => handleDelete(m.matchId, m.role, m.company)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddJobDialog open={addOpen} onClose={() => setAddOpen(false)} onSaved={() => mutate()} />
    </div>
  )
}
