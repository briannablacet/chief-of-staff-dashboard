"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import {
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ChevronRight,
  MapPin,
  Wallet,
  ExternalLink,
  RefreshCw,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { updateMatchStatus, regenerateMatches, saveJobUrl, type MatchDoc } from "@/lib/actions"
import { cn } from "@/lib/utils"

const statusStyles: Record<MatchDoc["status"], string> = {
  New: "bg-primary/15 text-primary",
  Reviewed: "bg-warning/15 text-warning",
  Applied: "bg-success/15 text-success",
}

interface MatchesProps {
  initialMatches: MatchDoc[]
}

export function Matches({ initialMatches }: MatchesProps) {
  const [matches, setMatches] = useState<MatchDoc[]>(initialMatches)
  const [selected, setSelected] = useState<MatchDoc | null>(null)
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
        <div className="hidden grid-cols-[1.6fr_1fr_0.9fr_0.7fr_auto] gap-4 border-b border-border bg-secondary/30 px-5 py-3 text-xs font-medium text-muted-foreground md:grid">
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
                className="grid w-full grid-cols-1 gap-3 px-5 py-4 text-left transition-colors hover:bg-accent/30 md:grid-cols-[1.6fr_1fr_0.9fr_0.7fr_auto] md:items-center md:gap-4"
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
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Wallet className="size-3.5 md:hidden" />
                  {match.salary}
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

      <Sheet
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
      >
        <SheetContent className="w-full gap-0 sm:max-w-lg">
          {selected && (
            <MatchDetail match={selected} onStatusChange={handleStatusChange} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function MatchDetail({
  match,
  onStatusChange,
}: {
  match: MatchDoc
  onStatusChange: (matchId: string, status: MatchDoc["status"]) => void
}) {
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [jobUrl, setJobUrl] = useState(match.jobUrl ?? "")
  const [savingUrl, setSavingUrl] = useState(false)

  const copyLetter = async () => {
    try {
      await navigator.clipboard.writeText(match.coverLetter)
      setCopied(true)
      toast.success("Cover letter copied", {
        description: `Tailored for ${match.company}.`,
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Could not copy to clipboard")
    }
  }

  const markReviewed = () => {
    if (match.status !== "New") return
    startTransition(async () => {
      try {
        await updateMatchStatus(match.matchId, "Reviewed")
        onStatusChange(match.matchId, "Reviewed")
      } catch {
        // non-critical, ignore silently
      }
    })
  }

  // Mark as Reviewed when the panel is opened and status is New
  useState(() => {
    if (match.status === "New") markReviewed()
  })

  return (
    <>
      <SheetHeader className="gap-3 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-xl bg-secondary text-sm font-semibold text-secondary-foreground">
            {match.company.slice(0, 2)}
          </span>
          <div>
            <SheetTitle className="text-base">{match.role}</SheetTitle>
            <SheetDescription>
              {match.company} &bull; {match.location}
            </SheetDescription>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-md px-2.5 py-1 text-sm font-semibold tabular-nums",
              match.score >= 90
                ? "bg-success/15 text-success"
                : "bg-primary/15 text-primary"
            )}
          >
            {match.score}% Match
          </span>
          <Badge variant="outline" className="text-muted-foreground">
            {match.workModel}
          </Badge>
          <Badge variant="outline" className="text-muted-foreground">
            {match.salary}
          </Badge>
        </div>
      </SheetHeader>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-6 p-4">
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-medium text-muted-foreground">
              Score breakdown
            </h3>
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
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      {item.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.note}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium text-muted-foreground">
                Pre-written cover letter
              </h3>
              <Button size="sm" variant="ghost" onClick={copyLetter}>
                {copied ? (
                  <Check data-icon="inline-start" />
                ) : (
                  <Copy data-icon="inline-start" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="rounded-lg border border-border bg-background/40 p-4 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
              {match.coverLetter}
            </p>
          </section>
        </div>
      </ScrollArea>

      <SheetFooter className="flex-col gap-3 border-t border-border">
        <div className="flex w-full items-center gap-2">
          <Input
            placeholder="Paste job listing URL..."
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            className="flex-1 text-sm"
          />
          <Button
            variant="outline"
            size="sm"
            disabled={savingUrl || jobUrl === (match.jobUrl ?? "")}
            onClick={async () => {
              setSavingUrl(true)
              try {
                await saveJobUrl(match.matchId, jobUrl)
                toast.success("Job link saved")
              } catch {
                toast.error("Failed to save link")
              } finally {
                setSavingUrl(false)
              }
            }}
          >
            {savingUrl ? "Saving..." : "Save"}
          </Button>
        </div>
        <div className="flex w-full gap-2">
          <Button className="flex-1" asChild disabled={!jobUrl}>
            <a
              href={jobUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => { if (!jobUrl) e.preventDefault() }}
            >
              <ExternalLink data-icon="inline-start" />
              Apply for this role
            </a>
          </Button>
          <Button variant="outline" onClick={copyLetter}>
            {copied ? (
              <Check data-icon="inline-start" />
            ) : (
              <Copy data-icon="inline-start" />
            )}
            Copy letter
          </Button>
        </div>
      </SheetFooter>
    </>
  )
}
