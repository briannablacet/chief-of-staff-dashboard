"use client"

import { useState, useTransition } from "react"
import { Plus, X, FileText, UploadCloud, Loader2, Sparkles, ChevronDown, ChevronUp, Download, ArrowLeft, Pencil } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { saveDirectives, type DirectivesDoc, type ResumeEntry } from "@/lib/actions"
import { parseResumeFile } from "@/lib/parse-resume"
import { runResumeAtsChecks } from "@/lib/ats-checker"
import { downloadResumeAsDocx } from "@/lib/export-resume"

interface ResumesProps {
  initialDirectives: DirectivesDoc | null
}

function initResumes(d: DirectivesDoc | null): ResumeEntry[] {
  if (d?.resumes?.length) return d.resumes
  if (d?.resumeText) return [{ id: "default", label: "My Résumé", text: d.resumeText, fileName: d.resumeFileName ?? "", isDefault: true }]
  return []
}

export function Resumes({ initialDirectives }: ResumesProps) {
  const d = initialDirectives
  const [resumes, setResumes] = useState<ResumeEntry[]>(() => initResumes(d))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [parsing, setParsing] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [expandedChecks, setExpandedChecks] = useState(false)

  const editingResume = resumes.find((r) => r.id === editingId) ?? null

  // ── Persist ──────────────────────────────────────────────────────────────

  const persist = (updated: ResumeEntry[], onSuccess?: () => void) => {
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
        toast.success("Résumé saved")
        onSuccess?.()
      } catch (err) {
        console.error("[v0] save résumé failed:", err)
        toast.error("Failed to save résumé")
      }
    })
  }

  // ── List actions ─────────────────────────────────────────────────────────

  const addResume = () => {
    const newEntry: ResumeEntry = {
      id: `resume-${Date.now()}`,
      label: "",
      text: "",
      fileName: "",
      isDefault: resumes.length === 0,
    }
    setResumes((prev) => [...prev, newEntry])
    setEditingId(newEntry.id)
    setExpandedChecks(false)
  }

  const removeResume = (id: string) => {
    setResumes((prev) => {
      const wasDefault = prev.find((r) => r.id === id)?.isDefault ?? false
      const filtered = prev.filter((r) => r.id !== id)
      if (wasDefault && filtered.length > 0) filtered[0].isDefault = true
      persist(filtered)
      return filtered
    })
  }

  const setDefault = (id: string) => {
    setResumes((prev) => {
      const updated = prev.map((r) => ({ ...r, isDefault: r.id === id }))
      persist(updated)
      return updated
    })
  }

  // ── Edit-view actions ────────────────────────────────────────────────────

  const updateEditing = (patch: Partial<ResumeEntry>) => {
    if (!editingId) return
    setResumes((prev) => prev.map((r) => r.id === editingId ? { ...r, ...patch } : r))
  }

  const handleFileUpload = async (file: File) => {
    setParsing(true)
    try {
      const text = await parseResumeFile(file)
      updateEditing({ text, fileName: file.name })
      toast.success("Résumé extracted", { description: file.name })
    } catch (err) {
      toast.error("Could not read file", { description: err instanceof Error ? err.message : "Unknown error" })
    } finally {
      setParsing(false)
    }
  }

  const handleOptimize = async () => {
    if (!editingResume) return
    const report = runResumeAtsChecks(editingResume.text)
    const issues = report.checks.filter((c) => !c.pass).map((c) => c.detail)
    setOptimizing(true)
    try {
      const res = await fetch("/api/resume/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: editingResume.text, issues }),
      })
      if (!res.ok) throw new Error("Optimization failed")
      const { optimizedText } = await res.json()
      updateEditing({ text: optimizedText })
      toast.success("Résumé optimized for ATS")
    } catch {
      toast.error("Could not optimize résumé")
    } finally {
      setOptimizing(false)
    }
  }

  const handleSave = () => {
    persist(resumes)
  }

  const handleSaveAndClose = () => {
    persist(resumes, () => setEditingId(null))
  }

  // ── Edit view ────────────────────────────────────────────────────────────

  if (editingId && editingResume) {
    const report = editingResume.text.trim().length > 0 ? runResumeAtsChecks(editingResume.text) : null
    const failCount = report ? report.checks.filter((c) => !c.pass).length : 0
    const scoreColor = !report ? "" : report.score >= 80 ? "text-success" : report.score >= 50 ? "text-warning" : "text-destructive"

    return (
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
            <ArrowLeft className="size-4" data-icon="inline-start" /> Back to résumés
          </Button>
        </div>

        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            {/* Name + controls row */}
            <div className="flex items-center gap-3">
              <Input
                value={editingResume.label}
                onChange={(e) => updateEditing({ label: e.target.value })}
                placeholder="Name this résumé, e.g. Senior PM — AI, Head of Product"
                className="flex-1 font-medium"
              />
              <div className="flex shrink-0 items-center gap-2">
                {editingResume.isDefault ? (
                  <Badge variant="secondary" className="bg-success/15 text-success">Default</Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-muted-foreground"
                    onClick={() => setDefault(editingResume.id)}
                  >
                    Set as default
                  </Button>
                )}
                {editingResume.text.trim().length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Download as .docx"
                    title="Download as .docx"
                    onClick={() => downloadResumeAsDocx(editingResume.text, editingResume.label || "resume")}
                  >
                    <Download className="size-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Upload zone */}
            <label
              htmlFor="resume-upload"
              className="group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 px-6 py-8 text-sm transition-colors hover:border-primary/70 hover:bg-primary/10"
            >
              {parsing ? (
                <>
                  <Loader2 className="size-6 animate-spin text-primary" />
                  <span className="font-medium text-foreground">Extracting text...</span>
                  <span className="text-xs text-muted-foreground">This may take a moment</span>
                </>
              ) : (
                <>
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <UploadCloud className="size-6 text-primary" />
                  </div>
                  {editingResume.fileName ? (
                    <>
                      <span className="font-semibold text-foreground">{editingResume.fileName}</span>
                      <span className="text-xs text-muted-foreground">Click to replace</span>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-foreground">Upload your résumé</span>
                      <span className="text-xs text-muted-foreground">PDF, DOCX, or TXT — click to browse</span>
                    </>
                  )}
                </>
              )}
              <input
                id="resume-upload"
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                className="sr-only"
                disabled={parsing}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileUpload(file)
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
              value={editingResume.text}
              onChange={(e) => updateEditing({ text: e.target.value })}
              placeholder="Paste your résumé text here..."
              className="min-h-64 resize-y font-mono text-xs leading-relaxed"
            />
            <p className="text-xs text-muted-foreground tabular-nums">{editingResume.text.length.toLocaleString()} characters</p>

            {/* ATS score panel */}
            {report && (
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-accent/20 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-muted-foreground">ATS Score</span>
                    <span className={`text-sm font-bold tabular-nums ${scoreColor}`}>{report.score}/100</span>
                    {failCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => setExpandedChecks((v) => !v)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {failCount} issue{failCount !== 1 ? "s" : ""}
                        {expandedChecks ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                      </button>
                    ) : (
                      <span className="text-xs text-success">All checks passed</span>
                    )}
                  </div>
                  {failCount > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={optimizing}
                      onClick={handleOptimize}
                    >
                      {optimizing
                        ? <><Loader2 className="size-3 animate-spin" data-icon="inline-start" />Optimizing...</>
                        : <><Sparkles className="size-3" data-icon="inline-start" />Optimize for ATS</>
                      }
                    </Button>
                  )}
                </div>
                {expandedChecks && (
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
            )}

          </CardContent>
          <CardFooter className="flex items-center justify-end gap-2 border-t border-border">
            <Button variant="outline" onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving..." : "Save résumé"}
            </Button>
            <Button onClick={handleSaveAndClose} disabled={isPending}>
              {isPending ? "Saving..." : "Save and close"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // ── List view ────────────────────────────────────────────────────────────

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
        <CardContent className="flex flex-col gap-3">
          {resumes.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-accent">
                <FileText className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">No résumés yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Click &quot;Add résumé&quot; to get started.</p>
              </div>
              <Button size="sm" variant="outline" onClick={addResume}>
                <Plus data-icon="inline-start" /> Add résumé
              </Button>
            </div>
          ) : (
            resumes.map((resume) => {
              const report = resume.text.trim().length > 0 ? runResumeAtsChecks(resume.text) : null
              const scoreColor = !report ? "text-muted-foreground" : report.score >= 80 ? "text-success" : report.score >= 50 ? "text-warning" : "text-destructive"
              return (
                <div
                  key={resume.id}
                  className="flex items-center gap-4 rounded-lg border border-border bg-background px-4 py-3"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {resume.label || <span className="text-muted-foreground italic">Untitled résumé</span>}
                      </span>
                      {resume.isDefault && (
                        <Badge variant="secondary" className="bg-success/15 text-success shrink-0">Default</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {report ? (
                        <span className={`font-medium ${scoreColor}`}>ATS {report.score}/100</span>
                      ) : (
                        <span>No content yet</span>
                      )}
                      {resume.fileName && (
                        <span className="truncate">{resume.fileName}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {!resume.isDefault && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-muted-foreground"
                        onClick={() => setDefault(resume.id)}
                      >
                        Set default
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
                        <Download className="size-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Edit résumé"
                      onClick={() => { setEditingId(resume.id); setExpandedChecks(false) }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Remove résumé"
                      onClick={() => removeResume(resume.id)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
