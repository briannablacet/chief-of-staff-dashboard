"use client"

import { useState, useTransition } from "react"
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { updateMatchStatus, regenerateMatches, saveCoverLetter, type MatchDoc } from "@/lib/actions"

const statusStyles: Record<MatchDoc["status"], string> = {
  "New":        "bg-primary/10 text-primary",
  "Reviewing":  "bg-warning/15 text-warning",
  "Applied":    "bg-success/15 text-success",
  "Archived":   "bg-muted text-muted-foreground",
}

interface MatchesProps {
  initialMatches: MatchDoc[]
  initialSelectedMatchId?: string
  onMatchSelected?: () => void
}

export function Matches({ initialMatches, initialSelectedMatchId, onMatchSelected }: MatchesProps) {
  const [matches, setMatches] = useState<MatchDoc[]>(initialMatches)
  const [selected, setSelected] = useState<MatchDoc | null>(
    initialSelectedMatchId ? (initialMatches.find((m) => m.matchId === initialSelectedMatchId) ?? null) : null
  )
  const [regenerating, setRegenerating] = useState(false)

  const handleStatusChange = (matchId: string, status: MatchDoc["status"]) => {
    setMatches((prev) =>
      prev.map((m) => (m.matchId === matchId ? { ...m, status } : m))
    )
    if (selected?.matchId === matchId) {
      setSelected((prev) => (prev ? { ...prev, status } : prev))
    }
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      await regenerateMatches()
      toast.success("Matches regenerated", {
        description: "Re-scored against your latest target roles.",
      })
      window.location.reload()
    } catch {
      toast.error("Failed to regenerate matches")
    } finally {
      setRegenerating(false)
    }
  }

  if (selected) {
    return (
      <MatchDetail
        match={selected}
        onStatusChange={handleStatusChange}
        onBack={() => setSelected(null)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
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
          <Button
            size="sm"
            variant="outline"
            disabled={regenerating}
            onClick={handleRegenerate}
          >
            <RefreshCw data-icon="inline-start" className={regenerating ? "animate-spin" : ""} />
            {regenerating ? "Regenerating..." : "Regenerate Matches"}
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
          {matches.map((match) => (
            <li key={match.matchId}>
              <button
                type="button"
                onClick={() => setSelected(match)}
                className="grid w-full grid-cols-1 gap-3 px-5 py-4 text-left transition-colors hover:bg-accent/30 md:grid-cols-[1.6fr_0.9fr_1.2fr_0.6fr_auto] md:items-center md:gap-4"
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
                      match.score >= 90
                        ? "bg-success/15 text-success"
                        : match.score >= 85
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
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

function MatchDetail({
  match,
  onStatusChange,
  onBack,
}: {
  match: MatchDoc
  onStatusChange: (matchId: string, status: MatchDoc["status"]) => void
  onBack: () => void
}) {
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

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <a
            href={match.jobUrl ?? `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(match.role)}&company=${encodeURIComponent(match.company)}&f_TPR=r604800`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <ExternalLink className="size-4" />
            Find &amp; apply on LinkedIn
          </a>
          <p className="text-sm text-muted-foreground">
            {match.jobUrl
              ? "Opens the job listing directly."
              : `Searches LinkedIn for this role at ${match.company}. Direct links will be added by the scraper agent.`}
          </p>
        </div>
      </Card>

      {/* Job req content */}
      {match.jobReqContent && (
        <Card className="p-6">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Job Description</h3>
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {match.jobReqContent}
          </p>
        </Card>
      )}

      {/* Two-column content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Score breakdown */}
        <Card className="p-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Score Breakdown</h3>
          <div className="flex flex-col gap-2">
            {match.breakdown.map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-3 rounded-lg border border-border bg-background/40 p-3"
              >
                {item.met ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                ) : (
                  <XCircle className="mt-0.5 size-4 shrink-0 text-warning" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.note}</p>
                </div>
              </div>
            ))}
          </div>
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
    </div>
  )
}
