"use client"

import { useState } from "react"
import { mutate } from "swr"
import { Loader2, ClipboardPaste } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export function PasteJob() {
  const [url, setUrl] = useState("")
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setError(null)
    setSaved(null)
    try {
      const res = await fetch("/api/jobs/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, text }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.ok) {
        setError(j.error ?? "Something went wrong. Try again.")
        return
      }
      setSaved(`Saved: ${j.role}${j.company ? ` at ${j.company}` : ""}${j.hasCoverLetter ? " — cover letter drafted." : "."}`)
      setUrl("")
      setText("")
      mutate("/api/matches")
    } catch {
      setError("Couldn't reach the server. Try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <ClipboardPaste className="size-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Add a job</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Paste a link, or paste the job description itself. Chief of Staff pulls out the role, company, location and
          salary, drafts a cover letter, and adds it to your Application Tracker.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="job-url">Job link</Label>
        <Input id="job-url" type="url" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} disabled={busy} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="job-text">Job description <span className="font-normal text-muted-foreground">(optional if the link works, best for LinkedIn)</span></Label>
        <Textarea id="job-text" rows={8} placeholder="Paste the full job posting here…" value={text} onChange={(e) => setText(e.target.value)} disabled={busy} />
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={submit} disabled={busy || (!url.trim() && !text.trim())}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          {busy ? "Adding…" : "Add job"}
        </Button>
        {busy && <span className="text-xs text-muted-foreground">This takes up to a minute while the cover letter is drafted.</span>}
      </div>

      {error && <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
      {saved && <p className="rounded-lg border border-green-600/30 bg-green-600/5 p-3 text-sm text-green-700 dark:text-green-400">{saved}</p>}
    </div>
  )
}
