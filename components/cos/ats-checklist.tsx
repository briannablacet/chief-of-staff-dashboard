"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, XCircle, Info, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { runAtsChecks, type AtsReport } from "@/lib/ats-checker"
import type { MatchDoc } from "@/lib/actions"

interface AtsChecklistProps {
  coverLetter: string
  match: MatchDoc
}

function scoreColor(score: number) {
  if (score >= 80) return "text-success"
  if (score >= 50) return "text-warning"
  return "text-destructive"
}

function scoreBg(score: number) {
  if (score >= 80) return "bg-success/10 border-success/20"
  if (score >= 50) return "bg-warning/10 border-warning/20"
  return "bg-destructive/10 border-destructive/20"
}

export function AtsChecklist({ coverLetter, match }: AtsChecklistProps) {
  const [expanded, setExpanded] = useState(false)

  const report: AtsReport = useMemo(
    () => runAtsChecks(coverLetter, match),
    [coverLetter, match]
  )

  const failed = report.checks.filter((c) => !c.pass)
  const passed = report.checks.filter((c) => c.pass)

  return (
    <div className={cn("rounded-lg border p-4", scoreBg(report.score))}>
      {/* Header row — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-2.5">
          <ShieldCheck className={cn("size-4 shrink-0", scoreColor(report.score))} />
          <span className="text-sm font-medium text-foreground">ATS Compatibility</span>
          <span className={cn("text-sm font-semibold tabular-nums", scoreColor(report.score))}>
            {report.score}%
          </span>
          {failed.length > 0 && (
            <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
              {failed.length} {failed.length === 1 ? "issue" : "issues"}
            </span>
          )}
        </div>
        <span className="text-muted-foreground">
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </span>
      </button>

      {/* Expandable checklist */}
      {expanded && (
        <div className="mt-4 flex flex-col gap-2">
          {/* Failed checks first */}
          {failed.map((check) => (
            <div key={check.id} className="flex items-start gap-2.5">
              <XCircle className={cn(
                "mt-0.5 size-4 shrink-0",
                check.severity === "error" ? "text-destructive" : "text-warning"
              )} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">{check.label}</p>
                <p className="text-xs text-muted-foreground">{check.detail}</p>
              </div>
            </div>
          ))}

          {/* Divider if there are both */}
          {failed.length > 0 && passed.length > 0 && (
            <div className="my-1 border-t border-border/50" />
          )}

          {/* Passed checks */}
          {passed.map((check) => (
            <div key={check.id} className="flex items-start gap-2.5">
              {check.severity === "info" ? (
                <Info className="mt-0.5 size-4 shrink-0 text-success" />
              ) : (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">{check.label}</p>
                <p className="text-xs text-muted-foreground">{check.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
