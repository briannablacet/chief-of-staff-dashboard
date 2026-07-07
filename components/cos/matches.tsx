"use client"

import { useState, useTransition } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import {
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Wallet,
  ExternalLink,
  RefreshCw,
  PenLine,
  Building2,
  Briefcase,
  Clock,
  Trash2,
  ThumbsDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { updateMatchStatus, saveCoverLetter, saveResumeForMatch, saveCoverLetterToLibrary, saveResumeEntry, deleteMatch, deleteAllMatches, cleanupDefaultUserData, type MatchDoc, type ResumeEntry, type CoverLetterEntry } from "@/lib/actions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AtsChecklist } from "@/components/cos/ats-checklist"
import { CoverLetterLibrary } from "@/components/cos/cover-letter-library"

const statusStyles: Record<MatchDoc["status"], string> = {
  "New":          "bg-primary/10 text-primary",
  "Reviewing":    "bg-warning/15 text-warning",
  "Applied":      "bg-success/15 text-success",
  "Interviewing": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "Offer":        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "Rejected":     "bg-destructive/10 text-destructive",
  "Not a Fit":    "bg-muted text-muted-foreground line-through",
  "Archived":     "bg-muted text-muted-foreground",
}

interface MatchesProps {
  initialMatches: MatchDoc[]
  initialSelectedMatchId?: string
  onMatchSelected?: () => void
  resumes?: ResumeEntry[]
  initialCoverLetters?: CoverLetterEntry[]
}

export function Matches({ initialMatches, initialSelectedMatchId, onMatchSelected, resumes = [], initialCoverLetters = [] }: MatchesProps) {
  const [tab, setTab] = useState<"matches" | "cover-letters">("matches")
  const { data: fetchedMatches, mutate, isValidating } = useSWR<MatchDoc[]>(
    "/api/matches",
    (url: string) => fetch(url).then((r) => r.json()),
    { fallbackData: initialMatches, revalidateOnFocus: false }
  )
  const matches = fetchedMatches ?? initialMatches
  const [selected, setSelected] = useState<MatchDoc | null>(
    initialSelectedMatchId ? (initialMatches.find((m) => m.matchId === initialSelectedMatchId) ?? null) : null
  )
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [clearingAll, setClearingAll] = useState(false)
  const [cleaningUp, setCleaningUp] = useState(false)
  const [showNotAFit, setShowNotAFit] = useState(false)

  const notAFitCount = matches.filter((m) => m.status === "Not a Fit").length
  const visibleMatches = showNotAFit ? matches : matches.filter((m) => m.status !== "Not a Fit")

  const handleCleanupDefault = async () => {
    setCleaningUp(true)
    try {
      const result = await cleanupDefaultUserData()
      const total = Object.values(result.migrated).reduce((a, b) => a + b, 0)
      mutate()
      toast.success(total > 0 ? `Migrated ${total} records to your account` : "No legacy records found")
    } catch {
      toast.error("Migration failed")
    } finally {
      setCleaningUp(false)
    }
  }

  const handleClearAll = async () => {
    if (!window.confirm("Remove all matches? This cannot be undone.")) return
    setClearingAll(true)
    try {
      await deleteAllMatches()
      mutate([], false)
      toast.success("All matches cleared")
    } catch {
      toast.error("Failed to clear matches")
    } finally {
      setClearingAll(false)
    }
  }

  const handleStatusChange = (matchId: string, status: MatchDoc["status"]) => {
    mutate(
      matches.map((m) => (m.matchId === matchId ? { ...m, status } : m)),
      false
    )
    if (selected?.matchId === matchId) {
      setSelected((prev) => (prev ? { ...prev, status } : prev))
    }
  }

  const handleNotAFit = async (e: React.MouseEvent, matchId: string) => {
    e.stopPropagation()
    await updateMatchStatus(matchId, "Not a Fit")
    mutate()
  }

  const handleDelete = async (e: React.MouseEvent, matchId: string) => {
    e.stopPropagation()
    setDeletingId(matchId)
    try {
      await deleteMatch(matchId)
      mutate(matches.filter((m) => m.matchId !== matchId), false)
      toast.success("Job removed")
    } catch {
      toast.error("Failed to remove job")
    } finally {
      setDeletingId(null)
    }
  }

  if (selected) {
    return (
      <MatchDetail
        match={selected}
        onStatusChange={handleStatusChange}
        onBack={() => setSelected(null)}
        resumes={resumes}
        savedCoverLetters={initialCoverLetters}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top-level tabs */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setTab("matches")}
          className={cn(
            "px-4 pb-3 pt-1 text-sm font-medium transition-colors",
            tab === "matches"
              ? "border-b-2 border-foreground text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Matches
        </button>
        <button
          type="button"
          onClick={() => setTab("cover-letters")}
          className={cn(
            "px-4 pb-3 pt-1 text-sm font-medium transition-colors",
            tab === "cover-letters"
              ? "border-b-2 border-foreground text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Cover Letters
        </button>
      </div>

      {tab === "cover-letters" && (
        <CoverLetterLibrary initialLetters={initialCoverLetters} />
      )}

      {tab === "matches" && <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Every role that cleared your filters. Click any match for the full breakdown.
        </p>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-muted-foreground">
            {matches.length} matches
          </Badge>
          <Badge variant="outline" className="text-success">
            {matches.filter((m) => m.status === "Applied").length} applied
          </Badge>
          {notAFitCount > 0 && (
            <button
              type="button"
              onClick={() => setShowNotAFit((v) => !v)}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              {showNotAFit ? `Hide ${notAFitCount} not a fit` : `Show ${notAFitCount} not a fit`}
            </button>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={isValidating}
            onClick={() => mutate()}
          >
            <RefreshCw data-icon="inline-start" className={isValidating ? "animate-spin" : ""} />
            {isValidating ? "Refreshing..." : "Refresh"}
          </Button>
          {matches.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              disabled={clearingAll}
              onClick={handleClearAll}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 data-icon="inline-start" className="size-3.5" />
              {clearingAll ? "Clearing..." : "Clear all"}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            disabled={cleaningUp}
            onClick={handleCleanupDefault}
            className="text-muted-foreground hover:text-foreground"
          >
            {cleaningUp ? "Fixing..." : "Fix stale data"}
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden py-0">
        <div className="hidden grid-cols-[1.6fr_0.9fr_1.2fr_0.6fr_auto] gap-4 border-b border-border bg-secondary/30 px-5 py-3 text-xs font-medium text-muted-foreground md:grid">
          <span>Role</span>
          <span>Location</span>
          <span>Compensation</span>
          <span>Match</span>
          <span className="text-right">Status</span>
        </div>

        <ul className="divide-y divide-border">
          {visibleMatches.map((match) => (
            <li key={match.matchId} className="flex items-center">
              <button
                type="button"
                onClick={() => setSelected(match)}
                className="grid min-w-0 flex-1 grid-cols-1 gap-3 px-5 py-4 text-left transition-colors hover:bg-accent/30 md:grid-cols-[1.6fr_0.9fr_1.2fr_0.6fr_auto] md:items-center md:gap-4"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-semibold text-secondary-foreground">
                    {match.company.slice(0, 2)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {match.role}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {match.company} &bull; {match.postedAgo}
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-3.5 md:hidden" />
                  {match.location}
                </span>
                <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                  <Wallet className="size-3.5 shrink-0 md:hidden" />
                  <span className="truncate">{match.salary}</span>
                </span>
                <span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold tabular-nums",
                      match.score >= 80
                        ? "bg-success/15 text-success"
                        : match.score >= 60
                          ? "bg-primary/15 text-primary"
                          : "bg-warning/15 text-warning"
                    )}
                  >
                    {match.score}%
                  </span>
                </span>
                <span className="flex items-center justify-between gap-2 md:justify-end">
                  <Badge
                    variant="secondary"
                    className={cn("font-medium", statusStyles[match.status])}
                  >
                    {match.status}
                  </Badge>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </span>
              </button>
              {/* Not a Fit button */}
              {match.status !== "Not a Fit" && (
                <button
                  type="button"
                  onClick={(e) => handleNotAFit(e, match.matchId)}
                  aria-label="Mark as not a fit"
                  title="Not a fit"
                  className="shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ThumbsDown className="size-4" />
                </button>
              )}
              {/* Delete button — always visible */}
              <button
                type="button"
                onClick={(e) => handleDelete(e, match.matchId)}
                disabled={deletingId === match.matchId}
                aria-label="Remove job"
                className="mr-3 shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      </Card>
      </>}
    </div>
  )
}

function MatchDetail({
  match,
  onStatusChange,
  onBack,
  resumes = [],
  savedCoverLetters = [],
}: {
  match: MatchDoc
  onStatusChange: (matchId: string, status: MatchDoc["status"]) => void
  onBack: () => void
  resumes?: ResumeEntry[]
  savedCoverLetters?: CoverLetterEntry[]
}) {
  const defaultResume = resumes.find((r) => r.isDefault) ?? resumes[0] ?? null
  const initialResumeId = match.resumeId ?? defaultResume?.id ?? ""
  const [selectedResumeId, setSelectedResumeId] = useState(initialResumeId)
  const [savingResume, setSavingResume] = useState(false)
  const [editingResume, setEditingResume] = useState(false)
  const [editedResumeText, setEditedResumeText] = useState("")
  const [editedResumeLabel, setEditedResumeLabel] = useState("")
  const [savingResumeEdit, setSavingResumeEdit] = useState(false)
  const activeResume = resumes.find((r) => r.id === selectedResumeId) ?? defaultResume

  const handleResumeChange = async (id: string) => {
    setSelectedResumeId(id)
    setSavingResume(true)
    try {
      await saveResumeForMatch(match.matchId, id)
    } finally {
      setSavingResume(false)
    }
  }

  const openResumeEditor = () => {
    setEditedResumeText(activeResume?.text ?? "")
    setEditedResumeLabel(activeResume?.label ?? "")
    setEditingResume(true)
  }

  const saveResumeEdit = async (andClose: boolean) => {
    if (!activeResume) return
    setSavingResumeEdit(true)
    try {
      const updated: ResumeEntry = { ...activeResume, text: editedResumeText, label: editedResumeLabel }
      await saveResumeEntry(updated)
      toast.success("Résumé saved")
      if (andClose) setEditingResume(false)
    } catch {
      toast.error("Failed to save résumé")
    } finally {
      setSavingResumeEdit(false)
    }
  }

  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [coverLetter, setCoverLetter] = useState(match.coverLetter ?? "")
  const [savingLetter, setSavingLetter] = useState(false)
  const [editingLetter, setEditingLetter] = useState(false)
  const [rawEditing, setRawEditing] = useState(false)

  const copyLetter = async () => {
    try {
      await navigator.clipboard.writeText(coverLetter)
      setCopied(true)
      toast.success("Copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy")
    }
  }

  const handleLetterBlur = async () => {
    if (coverLetter === match.coverLetter) return
    setSavingLetter(true)
    try {
      await saveCoverLetter(match.matchId, coverLetter)
      // Auto-save to library — use existing entry if this match already has one, otherwise create
      const existingEntry = savedCoverLetters.find((l) => l.matchId === match.matchId)
      await saveCoverLetterToLibrary({
        id: existingEntry?.id ?? `cl-${match.matchId}`,
        name: existingEntry?.name ?? `${match.company} Cover Letter`,
        text: coverLetter,
        matchId: match.matchId,
      })
      toast.success("Cover letter saved")
    } catch {
      toast.error("Failed to save cover letter")
    } finally {
      setSavingLetter(false)
    }
  }

  if (editingLetter) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setEditingLetter(false)} className="-ml-2">
            <ChevronLeft data-icon="inline-start" />
            Back to match
          </Button>
          <span className="text-sm text-muted-foreground">{match.role} at {match.company}</span>
        </div>

        <div className="flex flex-col gap-3">
          {rawEditing ? (
            /* Plain textarea for editing */
            <Textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              className="min-h-[520px] resize-y font-sans text-sm leading-6"
              placeholder="Your cover letter will appear here..."
              autoFocus
            />
          ) : (
            /* Rendered view with proper paragraph spacing */
            <div className="min-h-[520px] cursor-text rounded-md border border-border bg-background px-6 py-6 text-sm text-foreground" onClick={() => setRawEditing(true)}>
              {coverLetter
                ? coverLetter
                    // Normalize: treat any newline (single or double) as a paragraph break
                    .split(/\n+/)
                    .map(line => line.trim())
                    .filter(line => line.length > 0)
                    .map((para, i) => (
                      <p key={i} className="mb-8 leading-6 last:mb-0">{para}</p>
                    ))
                : <span className="text-muted-foreground">Click to edit your cover letter...</span>
              }
            </div>
          )}

          {/* Saved cover letter picker */}
          {savedCoverLetters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-accent/30 px-3 py-2.5">
              <span className="text-xs font-medium text-muted-foreground">Use saved cover letter:</span>
              <Select
                onValueChange={(id) => {
                  const found = savedCoverLetters.find((l) => l.id === id)
                  if (found) {
                    setCoverLetter(found.text)
                    setRawEditing(false)
                  }
                }}
              >
                <SelectTrigger className="h-8 min-w-48 text-xs">
                  <SelectValue placeholder="Choose one..." />
                </SelectTrigger>
                <SelectContent>
                  {savedCoverLetters.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name || "Untitled"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {rawEditing ? (
                <Button size="sm" onClick={() => setRawEditing(false)}>Done editing</Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setRawEditing(true)}>
                  <PenLine data-icon="inline-start" /> Edit text
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={copyLetter}>
                {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
                {copied ? "Copied" : "Copy to clipboard"}
              </Button>
            </div>
            <div className="flex items-center gap-3">
              {savingLetter && <span className="text-xs text-muted-foreground">Saving...</span>}
              <Button size="sm" onClick={handleLetterBlur} disabled={savingLetter || coverLetter === match.coverLetter}>
                Save changes
              </Button>
            </div>
          </div>


        </div>
      </div>
    )
  }

  const markApplied = () => {
    startTransition(async () => {
      try {
        await updateMatchStatus(match.matchId, "Applied")
        onStatusChange(match.matchId, "Applied")
        toast.success(`Marked as Applied for ${match.company}`)
      } catch {
        toast.error("Failed to update status")
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Back button + title bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 text-muted-foreground">
          <ChevronLeft data-icon="inline-start" />
          All Matches
        </Button>
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={cn("font-medium", statusStyles[match.status])}
          >
            {match.status}
          </Badge>
          {match.status !== "Applied" && (
            <Button size="sm" variant="outline" onClick={markApplied} disabled={isPending}>
              Mark as Applied
            </Button>
          )}
        </div>
      </div>

      {/* Hero card */}
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-secondary text-lg font-bold text-secondary-foreground">
              {match.company.slice(0, 2)}
            </span>
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold text-foreground">{match.role}</h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Building2 className="size-3.5" />
                  {match.company}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5" />
                  {match.location}
                </span>
                <span className="flex items-center gap-1.5">
                  <Wallet className="size-3.5" />
                  {match.salary}
                </span>
                <span className="flex items-center gap-1.5">
                  <Briefcase className="size-3.5" />
                  {match.workModel}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  {match.postedAgo}
                </span>
              </div>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-xl px-4 py-2 text-2xl font-bold tabular-nums",
              match.score >= 90
                ? "bg-success/15 text-success"
                : match.score >= 85
                  ? "bg-primary/15 text-primary"
                  : "bg-warning/15 text-warning"
            )}
          >
            {match.score}%
          </span>
        </div>

        {match.jobUrl && (
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <button
              onClick={() => window.open(match.jobUrl!, "_blank", "noopener,noreferrer")}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <ExternalLink className="size-4" />
              View job listing
            </button>
            <p className="text-sm text-muted-foreground">Opens the original job listing.</p>
          </div>
        )}
      </Card>

      {/* Job description + inline score breakdown */}
      <Card className="p-6">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Job Description</h3>
        {match.jobReqContent ? (
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {match.jobReqContent}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No job description available.</p>
        )}

        {/* Score breakdown bar */}
        {match.breakdown.length > 0 && (
          <div className="mt-5 border-t border-border pt-5">
            <p className="mb-3 text-xs font-medium text-muted-foreground">Score breakdown</p>
            <div className="flex flex-wrap gap-2">
              {match.breakdown.map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                    item.met
                      ? "border-success/30 bg-success/10 text-success"
                      : "border-warning/30 bg-warning/10 text-warning"
                  )}
                >
                  {item.met
                    ? <CheckCircle2 className="size-3 shrink-0" />
                    : <XCircle className="size-3 shrink-0" />
                  }
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Resume selector + ATS check */}
      <Card className="p-6">
        {editingResume ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Edit Résumé</h3>
              <Button variant="ghost" size="sm" onClick={() => setEditingResume(false)} className="-mr-2">
                <ChevronLeft data-icon="inline-start" /> Back
              </Button>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Résumé name</label>
              <Input
                value={editedResumeLabel}
                onChange={(e) => setEditedResumeLabel(e.target.value)}
                placeholder="e.g. Senior PM — AI"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Résumé text</label>
              <Textarea
                value={editedResumeText}
                onChange={(e) => setEditedResumeText(e.target.value)}
                className="min-h-72 resize-y font-mono text-xs leading-relaxed"
                placeholder="Paste your résumé text here..."
              />
              <p className="text-xs text-muted-foreground tabular-nums">{editedResumeText.length.toLocaleString()} characters</p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
              <Button variant="outline" size="sm" disabled={savingResumeEdit} onClick={() => saveResumeEdit(false)}>
                {savingResumeEdit ? "Saving..." : "Save résumé"}
              </Button>
              <Button size="sm" disabled={savingResumeEdit} onClick={() => saveResumeEdit(true)}>
                {savingResumeEdit ? "Saving..." : "Save and close"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <h3 className="mb-1 text-sm font-semibold text-foreground">Résumé</h3>
              <p className="text-xs text-muted-foreground">Choose which résumé to use for this application. The ATS check below reflects the selected résumé.</p>
            </div>

            {resumes.length > 0 ? (
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <span className="text-xs font-medium text-muted-foreground">Applying with résumé</span>
                <Select value={selectedResumeId} onValueChange={handleResumeChange}>
                  <SelectTrigger className="h-9 min-w-48">
                    <SelectValue placeholder="Choose a résumé..." />
                  </SelectTrigger>
                  <SelectContent>
                    {resumes.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.label || "Untitled résumé"}{r.isDefault ? " (default)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {savingResume && <span className="text-xs text-muted-foreground">Saving...</span>}
                {activeResume && (
                  <Button variant="outline" size="sm" onClick={openResumeEditor}>
                    <PenLine data-icon="inline-start" /> Edit résumé
                  </Button>
                )}
              </div>
            ) : (
              <p className="mb-4 text-xs text-muted-foreground">
                No résumés found. Add one in <span className="font-medium text-foreground">Résumés</span>.
              </p>
            )}

            {activeResume && <AtsChecklist resume={activeResume.text} match={match} />}
          </>
        )}
      </Card>

      {/* Cover letter */}
      <Card className="flex flex-col gap-0 py-0">
        <div className="flex-1 px-5 pt-5 pb-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Cover Letter</h3>
          <div className="line-clamp-6 text-xs text-muted-foreground">
            {coverLetter
              ? coverLetter.split(/\n\n+/).map((para, i) => (
                  <p key={i} className="mb-3 leading-relaxed last:mb-0">{para.replace(/\n/g, ' ')}</p>
                ))
              : <p className="leading-relaxed">No cover letter generated yet.</p>
            }
          </div>
        </div>
        <div className="border-t border-border px-5 py-3">
          <Button size="sm" variant="secondary" className="w-full" onClick={() => setEditingLetter(true)}>
            <PenLine data-icon="inline-start" />
            Open &amp; Edit
          </Button>
        </div>
      </Card>
    </div>
  )
}
