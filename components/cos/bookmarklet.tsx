"use client"

import { useState } from "react"
import { Check, Copy, Bookmark, MousePointerClick, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface BookmarkletProps {
  appUrl: string
  secret: string
}

export function Bookmarklet({ appUrl, secret }: BookmarkletProps) {
  const [copied, setCopied] = useState(false)

  // Single-line script — do NOT use encodeURIComponent, Chrome silently drops
  // bookmarks with encoded javascript: URLs. Keep it as a plain one-liner.
  const bookmarkletHref = `javascript:(function(){var t=document.title,u=window.location.href,s=window.getSelection?window.getSelection().toString():'';if(!s){var b=document.body;s=b?b.innerText.slice(0,5000):'';}var d=JSON.stringify({url:u,title:t,text:s,secret:'${secret}'});var e='${appUrl}/api/import-job';fetch(e,{method:'POST',headers:{'Content-Type':'application/json'},body:d}).then(function(r){if(!r.ok){return r.text().then(function(t){throw new Error('HTTP '+r.status+': '+t.slice(0,200));});}return r.json();}).then(function(j){if(j.ok){alert('Saved: '+j.role+(j.company?' at '+j.company:''));}else{alert('Error: '+j.error);}}).catch(function(err){alert('Failed: '+err.message);});})()`

  function copyScript() {
    // navigator.clipboard is blocked in iframes — fall back to execCommand
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(bookmarkletHref).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }).catch(() => execCommandCopy())
    } else {
      execCommandCopy()
    }
  }

  function execCommandCopy() {
    const ta = document.createElement("textarea")
    ta.value = bookmarkletHref
    ta.style.position = "fixed"
    ta.style.opacity = "0"
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    try {
      document.execCommand("copy")
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } finally {
      document.body.removeChild(ta)
    }
  }

  const isLocalhost = appUrl.includes("localhost") || appUrl.includes("127.0.0.1")

  return (
    <div className="mx-auto max-w-2xl space-y-8">

      {/* Localhost warning — bookmarklet can't reach localhost from other tabs */}
      {isLocalhost && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <strong>Heads up:</strong> This bookmarklet is pointing to{" "}
          <code className="font-mono text-xs">{appUrl}</code>, which only works on this
          machine. Deploy to Vercel and set{" "}
          <code className="font-mono text-xs">NEXT_PUBLIC_APP_URL</code> to your production
          URL so the bookmarklet works from any browser.
        </div>
      )}

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Bookmark className="size-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Job Capture Bookmarklet</h2>
          <Badge variant="secondary">Beta</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          One click on any job page — LinkedIn, company sites, job boards — sends it straight to your Application Tracker. No copy-paste required.
        </p>
        <p className="text-xs text-muted-foreground">
          Bookmarklet target:{" "}
          <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">{appUrl}</code>
          {" "}— if this looks wrong, set <code className="font-mono text-xs">NEXT_PUBLIC_APP_URL</code> in your project vars.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {/* Step 1 */}
        <div className="flex gap-4 rounded-xl border border-border bg-card p-5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            1
          </div>
          <div className="flex-1 space-y-3">
            <p className="font-medium text-foreground">Copy the bookmarklet code</p>
            <p className="text-sm text-muted-foreground">
              Click the button below to copy the bookmarklet to your clipboard.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={copyScript}
              className="gap-2"
            >
              {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
              {copied ? "Copied!" : "Copy bookmarklet code"}
            </Button>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex gap-4 rounded-xl border border-border bg-card p-5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            2
          </div>
          <div className="flex-1 space-y-2">
            <p className="font-medium text-foreground">Create a new bookmark manually</p>
            <p className="text-sm text-muted-foreground">
              In your browser, right-click the bookmarks bar and choose <strong>Add page</strong> or <strong>Add bookmark</strong>. Give it any name (e.g. "Save to CoS"), then paste the copied code into the <strong>URL</strong> field.
            </p>
            <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground space-y-1">
              <p><strong>Chrome / Edge:</strong> Bookmarks bar → right-click → "Add page..." → paste in URL field</p>
              <p><strong>Safari:</strong> Bookmarks menu → "Add Bookmark" → edit URL after saving</p>
              <p><strong>Firefox:</strong> Bookmarks bar → right-click → "Add Bookmark" → paste in Location field</p>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex gap-4 rounded-xl border border-border bg-card p-5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            3
          </div>
          <div className="flex-1 space-y-2">
            <p className="font-medium text-foreground">Browse to any job posting</p>
            <p className="text-sm text-muted-foreground">
              Works on LinkedIn, Indeed, company career pages, Greenhouse, Lever, Workday — anywhere.
              For LinkedIn, open the full job detail page first.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {["LinkedIn", "Indeed", "Greenhouse", "Lever", "Workday", "Any site"].map((s) => (
                <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="flex gap-4 rounded-xl border border-border bg-card p-5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            4
          </div>
          <div className="flex-1 space-y-2">
            <p className="font-medium text-foreground">Click the bookmark</p>
            <p className="text-sm text-muted-foreground">
              The bookmarklet grabs the page title, URL, and visible text, then sends it here.
              AI automatically extracts the role, company, location, and salary before saving.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Sparkles className="size-4 text-primary" />
              <span className="text-sm text-muted-foreground">AI parses the job details for you</span>
            </div>
          </div>
        </div>

        {/* Step 5 */}
        <div className="flex gap-4 rounded-xl border border-border bg-card p-5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            5
          </div>
          <div className="flex-1 space-y-2">
            <p className="font-medium text-foreground">Find it in your Application Tracker</p>
            <p className="text-sm text-muted-foreground">
              The job appears instantly in Application Tracker with status "New". Edit the details, add notes, and track it through your pipeline.
            </p>
            <div className="flex items-center gap-1.5 pt-1">
              <MousePointerClick className="size-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">A browser alert confirms when it&apos;s saved.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fallback copy */}
      <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-3">
        <p className="text-sm font-medium text-foreground">Can&apos;t drag? Copy the bookmarklet code instead</p>
        <p className="text-xs text-muted-foreground">
          In your browser, create a new bookmark manually, paste this as the URL, and name it "Save to Chief of Staff".
        </p>
        <div className="flex items-start gap-2">
          <code className="flex-1 break-all rounded-lg bg-background border border-border px-3 py-2 text-xs text-muted-foreground font-mono leading-relaxed">
            {bookmarkletHref.slice(0, 120)}…
          </code>
          <Button
            size="sm"
            variant="outline"
            onClick={copyScript}
            className="shrink-0"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>

    </div>
  )
}
