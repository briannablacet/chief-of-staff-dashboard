"use client"

import { useState, useTransition, useMemo } from "react"
import { Plus, X, FileText, UploadCloud, Loader2, Sparkles, ChevronDown, ChevronUp, Download } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { saveDirectives, type DirectivesDoc, type ResumeEntry } from "@/lib/actions"
import { parseResumeFile } from "@/lib/parse-resume"
import { runResumeAtsChecks } from "@/lib/ats-checker"
import { downloadResumeAsDocx } from "@/lib/export-resume"

interface ResumesProps {
  initialDirectives: DirectivesDoc | null
}

export function Resumes({ initialDirectives }: ResumesProps) {
  const d = initialDirectives

  const [resumes, setResumes] = useState<ResumeEntry[]>(() => {
    if (d?.resumes?.length) return d.resumes
    if (d?.resumeText) return [{ id: "default", label: "My Résumé", text: d.resumeText, fileName: d.resumeFileName ?? "", isDefault: true }]
    return []
  })

  const [isPending, startTransition] = useTransition()
  const [parsing, setParsing] = useState<string | null>(null)
  const [optimizing, setOptimizing] = useState<string | null>(null)
  const [expandedChecks, setExpandedChecks] = useState<Set<string>>(new Set())

  const handleOptimize = async (id: string, text: string) => {
    const report = runResumeAtsChecks(text)
    const issues = report.checks.filter((c) => !c.pass).map((c) => c.detail)
    setOptimizing(id)
    try {
      const res = await fetch("/api/resume/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: text, issues }),
      })
      if (!res.ok) throw new Error("Optimization failed")
      const { optimizedText } = await res.json()
      setResumes((prev) => prev.map((r) => r.id === id ? { ...r, text: optimizedText } : r))
      toast.success("Résumé optimized for ATS")
    } catch {
      toast.error("Could not optimize résumé")
    } finally {
      setOptimizing(null)
    }
  }

  const toggleChecks = (id: string) => {
    setExpandedChecks((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleFileUpload = async (id: string, file: File) => {
    setParsing(id)
    try {
      const text = await parseResumeFile(file)
      setResumes((prev) => prev.map((r) => r.id === id ? { ...r, text, fileName: file.name } : r))
      toast.success("Résumé extracted", { description: file.name })
    } catch (err) {
      toast.error("Could not read file", { description: err instanceof Error ? err.message : "Unknown error" })
    } finally {
      setParsing(null)
    }
  }

  const save = (updated: ResumeEntry[]) => {
    startTransition(async () => {
      try {
        const defaultEntry = updated.find((r) => r.isDefault) ?? updated[0]
        await saveDirectives({
          name: d?.name ?? "",
          headline: d?.headline ?? "",
          titles: d?.titles ?? [],
          locations: d?.locations ?? [],
          salaryMin: d?.salaryMin ?? 0,
          salaryMax: d?.salaryMax ?? 0,
          remoteOnly: d?.remoteOnly ?? false,
          dreamCompanies: d?.dreamCompanies ?? [],
          dealbreakers: d?.dealbreakers ?? [],
          linkedinUrl: d?.linkedinUrl ?? "",
          defaultCoverLetter: d?.defaultCoverLetter ?? "",
          dailyMatchLimit: d?.dailyMatchLimit ?? 10,
          dailyCoverLetterLimit: d?.dailyCoverLetterLimit ?? 5,
          minMatchScore: d?.minMatchScore ?? 70,
          resumeText: defaultEntry?.text ?? d?.resumeText ?? "",
          resumeFileName: defaultEntry?.fileName ?? d?.resumeFileName ?? "",
          resumes: updated,
        })
        toast.success("Résumés saved")
      } catch (err) {
        console.error("[v0] save résumés failed:", err)
        toast.error("Failed to save résumés")
      }
    })
  }

  const addResume = () => {
    const newEntry: ResumeEntry = {
      id: `resume-${Date.now()}`,
      label: "",
      text: "",
      fileName: "",
      isDefault: resumes.length === 0,
    }
    setResumes((prev) => [...prev, newEntry])
  }

  const updateResume = (id: string, patch: Partial<ResumeEntry>) => {
    setResumes((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r))
  }

  const setDefault = (id: string) => {
    setResumes((prev) => prev.map((r) => ({ ...r, isDefault: r.id === id })))
  }

  const removeResume = (id: string) => {
    setResumes((prev) => {
      const wasDefault = prev.find((r) => r.id === id)?.isDefault ?? false
      const filtered = prev.filter((r) => r.id !== id)
      if (wasDefault && filtered.length > 0) filtered[0].isDefault = true
      return filtered
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Your Résumés</CardTitle>
              <CardDescription>
                Name each résumé by the role type it targets. The default is used for new matches; you can choose a different one per application on the match detail page.
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={addResume}>
              <Plus data-icon="inline-start" /> Add résumé
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {resumes.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-accent">
                <FileText className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">No résumés yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Click &quot;Add résumé&quot; to paste in your first one.</p>
              </div>
              <Button size="sm" variant="outline" onClick={addResume}>
                <Plus data-icon="inline-start" /> Add résumé
              </Button>
            </div>
          )}

          {resumes.map((resume) => (
            <div key={resume.id} className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4">
              <div className="flex items-center gap-3">
                <Input
                  value={resume.label}
                  onChange={(e) => updateResume(resume.id, { label: e.target.value })}
                  placeholder="Name this résumé, e.g. Senior PM — AI, Head of Product"
                  className="flex-1 font-medium"
                />
                <div className="flex shrink-0 items-center gap-2">
                  {resume.isDefault ? (
                    <Badge variant="secondary" className="bg-success/15 text-success">Default</Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-muted-foreground"
                      onClick={() => setDefault(resume.id)}
                    >
                      Set as default
                    </Button>
                  )}
                  {resume.text.trim().length > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Download as .docx"
                      title="Download as .docx"
                      onClick={() => downloadResumeAsDocx(resume.text, resume.label || "resume")}
                    >
                      <Download />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remove résumé"
                    onClick={() => removeResume(resume.id)}
                  >
                    <X />
                  </Button>
                </div>
              </div>
              {/* Upload zone */}
              <label
                htmlFor={`resume-upload-${resume.id}`}
                className="flex cursor-pointer items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-accent/30 px-4 py-4 text-sm transition-colors hover:border-primary/50 hover:bg-accent/50"
              >
                {parsing === resume.id ? (
                  <>
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground">Extracting text...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="size-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {resume.fileName
                        ? <><span className="font-medium text-foreground">{resume.fileName}</span> — click to replace</>
                        : "Upload résumé — PDF, DOCX, or TXT"}
                    </span>
                  </>
                )}
                <input
                  id={`resume-upload-${resume.id}`}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  className="sr-only"
                  disabled={parsing === resume.id}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(resume.id, file)
                    e.target.value = ""
                  }}
                />
              </label>

              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">or paste below</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <Textarea
                value={resume.text}
                onChange={(e) => updateResume(resume.id, { text: e.target.value })}
                placeholder="Paste your résumé text here..."
                className="min-h-56 resize-y font-mono text-xs leading-relaxed"
              />
              <p className="text-xs text-muted-foreground tabular-nums">{resume.text.length.toLocaleString()} characters</p>

              {/* ATS score row */}
              {resume.text.trim().length > 0 && (() => {
                const report = runResumeAtsChecks(resume.text)
                const failCount = report.checks.filter((c) => !c.pass).length
                const scoreColor = report.score >= 80 ? "text-success" : report.score >= 50 ? "text-warning" : "text-destructive"
                const isExpanded = expandedChecks.has(resume.id)
                return (
                  <div className="flex flex-col gap-2 rounded-lg border border-border bg-accent/20 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-muted-foreground">ATS Score</span>
                        <span className={`text-sm font-bold tabular-nums ${scoreColor}`}>{report.score}/100</span>
                        {failCount > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleChecks(resume.id)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          >
                            {failCount} issue{failCount !== 1 ? "s" : ""}
                            {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                          </button>
                        )}
                        {failCount === 0 && <span className="text-xs text-success">All checks passed</span>}
                      </div>
                      {failCount > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={optimizing === resume.id}
                          onClick={() => handleOptimize(resume.id, resume.text)}
                        >
                          {optimizing === resume.id
                            ? <><Loader2 className="size-3 animate-spin" data-icon="inline-start" />Optimizing...</>
                            : <><Sparkles className="size-3" data-icon="inline-start" />Optimize for ATS</>
                          }
                        </Button>
                      )}
                    </div>
                    {isExpanded && (
                      <ul className="flex flex-col gap-1.5 pt-1">
                        {report.checks.filter((c) => !c.pass).map((c) => (
                          <li key={c.id} className="flex gap-2 text-xs text-muted-foreground">
                            <span className={c.severity === "error" ? "text-destructive" : "text-warning"}>
                              {c.severity === "error" ? "✗" : "!"}
                            </span>
                            <span><span className="font-medium text-foreground">{c.label}:</span> {c.detail}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })()}
            </div>
          ))}

          {resumes.length > 0 && (
            <div className="flex justify-end">
              <Button onClick={() => save(resumes)} disabled={isPending}>
                {isPending ? "Saving..." : "Save résumés"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
