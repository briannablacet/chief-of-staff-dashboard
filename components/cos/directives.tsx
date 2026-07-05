"use client"

import { useState, useTransition } from "react"
import { Target, Ban, FileText, Building2, MapPin, Link2, Plus, X, UploadCloud, User } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { saveDirectives } from "@/lib/actions"
import type { DirectivesDoc } from "@/lib/actions"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DirectivesState {
  name: string
  headline: string
  titles: string
  locations: string
  salary: number[]
  remoteOnly: boolean
  dreamCompanies: string[]
  dealbreakers: string[]
  resumeText: string
  resumeFileName: string
  linkedinUrl: string
  defaultCoverLetter: string
}

interface DirectivesProps {
  initialDirectives: DirectivesDoc | null
  defaultTab?: string
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

export function Directives({ initialDirectives, defaultTab }: DirectivesProps) {
  const d = initialDirectives
  const [activeTab, setActiveTab] = useState(defaultTab ?? "targets")

  const [state, setState] = useState<DirectivesState>({
    name: d?.name ?? "",
    headline: d?.headline ?? "",
    titles: d?.titles?.join(", ") ?? "Senior Product Manager, Group PM, Principal PM",
    locations: d?.locations?.join(", ") ?? "Remote (US), New York, San Francisco",
    salary: [d?.salaryMin ?? 190, d?.salaryMax ?? 270],
    remoteOnly: d?.remoteOnly ?? false,
    dreamCompanies: d?.dreamCompanies ?? [],
    dealbreakers: d?.dealbreakers ?? [],
    resumeText: d?.resumeText ?? "",
    resumeFileName: d?.resumeFileName ?? "",
    linkedinUrl: d?.linkedinUrl ?? "",
    defaultCoverLetter: d?.defaultCoverLetter ?? "",
  })

  const set = <K extends keyof DirectivesState>(key: K, value: DirectivesState[K]) =>
    setState((prev) => ({ ...prev, [key]: value }))

  const buildPayload = () => ({
    name: state.name,
    headline: state.headline,
    titles: state.titles.split(",").map((t) => t.trim()).filter(Boolean),
    locations: state.locations.split(",").map((l) => l.trim()).filter(Boolean),
    salaryMin: state.salary[0],
    salaryMax: state.salary[1],
    remoteOnly: state.remoteOnly,
    dreamCompanies: state.dreamCompanies,
    dealbreakers: state.dealbreakers,
    resumeText: state.resumeText,
    resumeFileName: state.resumeFileName,
    linkedinUrl: state.linkedinUrl,
    defaultCoverLetter: state.defaultCoverLetter,
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Directives &amp; Criteria</h1>
        <p className="text-sm text-muted-foreground">
          Configure your job search criteria, target companies, and profile for your agents.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-6">
        <TabsList className="w-full max-w-xl">
          <TabsTrigger value="targets">
            <Target data-icon="inline-start" />
            Job Targets
          </TabsTrigger>
          <TabsTrigger value="dealbreakers">
            <Ban data-icon="inline-start" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="resume">
            <FileText data-icon="inline-start" />
            Resume &amp; Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="targets">
          <JobTargetsTab state={state} set={set} buildPayload={buildPayload} />
        </TabsContent>
        <TabsContent value="dealbreakers">
          <DealbreakersTab state={state} set={set} buildPayload={buildPayload} />
        </TabsContent>
        <TabsContent value="resume">
          <ResumeTab state={state} set={set} buildPayload={buildPayload} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared tab props
// ---------------------------------------------------------------------------

interface TabProps {
  state: DirectivesState
  set: <K extends keyof DirectivesState>(key: K, value: DirectivesState[K]) => void
  buildPayload: () => Omit<DirectivesDoc, "_id" | "userId" | "updatedAt">
}

// ---------------------------------------------------------------------------
// Job Targets tab
// ---------------------------------------------------------------------------

function JobTargetsTab({ state, set, buildPayload }: TabProps) {
  const [isPending, startTransition] = useTransition()

  const save = () => {
    startTransition(async () => {
      try {
        await saveDirectives(buildPayload())
        toast.success("Job targets saved")
      } catch {
        toast.error("Failed to save")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Job Targets</CardTitle>
        <CardDescription>Define the roles worth your Chief of Staff&apos;s attention.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="titles">Target job titles</FieldLabel>
            <Input id="titles" value={state.titles} onChange={(e) => set("titles", e.target.value)} />
            <FieldDescription>Separate multiple titles with commas.</FieldDescription>
          </Field>

          <Field>
            <FieldLabel>
              Target salary range
              <Badge variant="secondary" className="ml-2 tabular-nums text-primary">
                {`$${state.salary[0]}k – $${state.salary[1]}k`}
              </Badge>
            </FieldLabel>
            <div className="px-1 pt-3 pb-1">
              <Slider
                value={state.salary}
                onValueChange={(v) => set("salary", v as number[])}
                min={80}
                max={400}
                step={5}
                aria-label="Salary range"
              />
              <div className="mt-2 flex justify-between text-xs text-muted-foreground tabular-nums">
                <span>$80k</span>
                <span>$400k</span>
              </div>
            </div>
            <FieldDescription>Roles below your floor are auto-rejected by the Resume Scorer Agent.</FieldDescription>
          </Field>

          <Separator />

          <Field>
            <FieldLabel htmlFor="location">Location preferences</FieldLabel>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="location" className="pl-9" value={state.locations} onChange={(e) => set("locations", e.target.value)} />
            </div>
            <FieldDescription>Add cities or &quot;Remote&quot; regions.</FieldDescription>
          </Field>

          <Field orientation="horizontal">
            <Button onClick={save} disabled={isPending}>
              {isPending ? "Saving..." : "Save targets"}
            </Button>
            <Button variant="ghost" className="text-muted-foreground" onClick={() => {
              set("titles", "Senior Product Manager, Group PM, Principal PM")
              set("locations", "Remote (US), New York, San Francisco")
              set("salary", [190, 270])
            }}>
              Reset
            </Button>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Settings tab (companies + dealbreakers)
// ---------------------------------------------------------------------------

function DealbreakersTab({ state, set, buildPayload }: TabProps) {
  const [isPending, startTransition] = useTransition()

  const save = () => {
    startTransition(async () => {
      try {
        await saveDirectives(buildPayload())
        toast.success("Settings saved")
      } catch {
        toast.error("Failed to save")
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Building2 className="size-4" />
              </span>
              <div>
                <CardTitle className="text-base">Dream Companies</CardTitle>
                <CardDescription>Your Networking Agent prioritizes these.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <TagInput tags={state.dreamCompanies} onChange={(tags) => set("dreamCompanies", tags)} placeholder="Add a company..." tone="primary" icon={Building2} />
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-destructive/15 text-destructive">
                <Ban className="size-4" />
              </span>
              <div>
                <CardTitle className="text-base">Anti-List / Dealbreakers</CardTitle>
                <CardDescription>Any match tripping these is auto-rejected.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <TagInput tags={state.dealbreakers} onChange={(tags) => set("dealbreakers", tags)} placeholder="Add a dealbreaker..." tone="destructive" icon={X} />
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button onClick={save} disabled={isPending}>
          {isPending ? "Saving..." : "Save target companies and dealbreakers"}
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Resume & Profile tab
// ---------------------------------------------------------------------------

function ResumeTab({ state, set, buildPayload }: TabProps) {
  const [isPending, startTransition] = useTransition()

  const save = () => {
    startTransition(async () => {
      try {
        await saveDirectives(buildPayload())
        toast.success("Profile saved")
      } catch {
        toast.error("Failed to save")
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <User className="size-4" />
            </span>
            <div>
              <CardTitle className="text-base">Your Profile</CardTitle>
              <CardDescription>Used in cover letters and outreach messages generated by your agents.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Full name</FieldLabel>
              <Input id="name" placeholder="e.g. Brianna Blacet" value={state.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="headline">Professional headline</FieldLabel>
              <Input id="headline" placeholder="e.g. Senior Product Manager · 8 years · B2B SaaS" value={state.headline} onChange={(e) => set("headline", e.target.value)} />
              <FieldDescription>Your agents use this as a one-line summary when reaching out to hiring managers.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="linkedin">LinkedIn profile URL</FieldLabel>
              <div className="relative">
                <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="linkedin" className="pl-9" placeholder="linkedin.com/in/yourprofile" value={state.linkedinUrl} onChange={(e) => set("linkedinUrl", e.target.value)} />
              </div>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Master Resume</CardTitle>
          <CardDescription>Your resume trains the Resume Scorer Agent&apos;s matching logic.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="resume-upload">Upload resume</FieldLabel>
              <label htmlFor="resume-upload" className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-background/40 px-6 py-10 text-center transition-colors hover:border-primary/50 hover:bg-accent/30">
                <span className="flex size-12 items-center justify-center rounded-full bg-accent text-primary">
                  <UploadCloud className="size-6" />
                </span>
                <span className="text-sm font-medium text-foreground">Drag &amp; drop your resume, or click to browse</span>
                <span className="text-xs text-muted-foreground">PDF or DOCX, up to 10MB</span>
                <input id="resume-upload" type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) { set("resumeFileName", f.name); toast.success("Resume ready to save", { description: f.name }) }
                }} />
              </label>
              {state.resumeFileName && (
                <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2.5">
                  <span className="flex items-center gap-2 text-sm text-foreground">
                    <FileText className="size-4 text-primary" />
                    {state.resumeFileName}
                  </span>
                  <Button variant="ghost" size="icon" className="text-muted-foreground" aria-label="Remove resume" onClick={() => set("resumeFileName", "")}>
                    <X />
                  </Button>
                </div>
              )}
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <FileText className="size-4" />
            </span>
            <div>
              <CardTitle className="text-base">Default Cover Letter</CardTitle>
              <CardDescription>Your Ghostwriter Agent uses this as the base template, then tailors each variation to the specific role, company, and hiring manager.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="cover-letter">Base template</FieldLabel>
              <Textarea
                id="cover-letter"
                placeholder={"Dear Hiring Manager,\n\nI'm excited to apply for the [Role] position at [Company]...\n\nWrite your base letter here. Your agents will substitute [Role], [Company], and [Hiring Manager] automatically."}
                className="min-h-72 resize-y font-mono text-sm leading-relaxed"
                value={state.defaultCoverLetter}
                onChange={(e) => set("defaultCoverLetter", e.target.value)}
              />
              <FieldDescription className="flex items-center justify-between">
                <span>
                  Use <code className="rounded bg-accent px-1 py-0.5 text-xs">[Role]</code>,{" "}
                  <code className="rounded bg-accent px-1 py-0.5 text-xs">[Company]</code>, and{" "}
                  <code className="rounded bg-accent px-1 py-0.5 text-xs">[Hiring Manager]</code>{" "}
                  as placeholders.
                </span>
                <span className="ml-4 shrink-0 tabular-nums text-muted-foreground">{state.defaultCoverLetter.length} chars</span>
              </FieldDescription>
            </Field>
            <Field orientation="horizontal">
              <Button onClick={save} disabled={isPending}>
                {isPending ? "Saving..." : "Save profile"}
              </Button>
              {state.defaultCoverLetter.length > 0 && (
                <Button variant="ghost" className="text-muted-foreground" onClick={() => set("defaultCoverLetter", "")}>Clear</Button>
              )}
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TagInput
// ---------------------------------------------------------------------------

function TagInput({ tags, onChange, placeholder, tone, icon: Icon }: {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder: string
  tone: "primary" | "destructive"
  icon: typeof X
}) {
  const [value, setValue] = useState("")

  const add = () => {
    const v = value.trim()
    if (!v || tags.includes(v)) { setValue(""); return }
    onChange([...tags, v])
    setValue("")
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); add() }
        }} placeholder={placeholder} />
        <Button type="button" size="icon" variant={tone === "destructive" ? "outline" : "default"} onClick={add} aria-label="Add">
          <Plus />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.length === 0 && <p className="text-xs text-muted-foreground">Nothing added yet.</p>}
        {tags.map((tag) => (
          <span key={tag} className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium",
            tone === "destructive" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-primary/30 bg-primary/10 text-primary"
          )}>
            <Icon className="size-3" />
            {tag}
            <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))} aria-label={`Remove ${tag}`} className="ml-0.5 rounded-full opacity-60 transition-opacity hover:opacity-100">
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}
