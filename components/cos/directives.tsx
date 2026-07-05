"use client"

import { useState, useTransition } from "react"
import { Target, Ban, FileText, Building2, MapPin, Link2, Plus, X, UploadCloud, User, Terminal } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { saveDirectives, saveAgentConfig } from "@/lib/actions"
import type { DirectivesDoc, AgentDoc, ResumeEntry } from "@/lib/actions"
import { agents, type AgentKey } from "@/lib/cos-data"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

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
  resumes: ResumeEntry[]
  linkedinUrl: string
  defaultCoverLetter: string
  dailyMatchLimit: number
  dailyCoverLetterLimit: number
  minMatchScore: number
}

interface DirectivesProps {
  initialDirectives: DirectivesDoc | null
  initialAgentConfigs: AgentDoc[]
  defaultTab?: string
}

export function Directives({ initialDirectives, initialAgentConfigs, defaultTab }: DirectivesProps) {
  const d = initialDirectives
  const [activeTab, setActiveTab] = useState(defaultTab ?? "resume")

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
    resumes: d?.resumes?.length
      ? d.resumes
      : d?.resumeText
        ? [{ id: "default", label: "My Résumé", text: d.resumeText, fileName: d.resumeFileName ?? "", isDefault: true }]
        : [],
    linkedinUrl: d?.linkedinUrl ?? "",
    defaultCoverLetter: d?.defaultCoverLetter ?? "",
    dailyMatchLimit: d?.dailyMatchLimit ?? 10,
    dailyCoverLetterLimit: d?.dailyCoverLetterLimit ?? 5,
    minMatchScore: d?.minMatchScore ?? 80,
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
    resumeText: state.resumes.find((r) => r.isDefault)?.text ?? state.resumeText,
    resumeFileName: state.resumes.find((r) => r.isDefault)?.fileName ?? state.resumeFileName,
    resumes: state.resumes,
    linkedinUrl: state.linkedinUrl,
    defaultCoverLetter: state.defaultCoverLetter,
    dailyMatchLimit: state.dailyMatchLimit,
    dailyCoverLetterLimit: state.dailyCoverLetterLimit,
    minMatchScore: state.minMatchScore,
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-2xl font-semibold text-foreground">Configure your job search.</p>
        <p className="text-base text-muted-foreground">
          Set up your profile, target roles, dream companies, and dealbreakers. Configure agents in Agent Setup.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-6">
        <TabsList className="w-full max-w-4xl">
          <TabsTrigger value="resume">
            <User data-icon="inline-start" />
            Profile
          </TabsTrigger>

          <TabsTrigger value="targets">
            <Target data-icon="inline-start" />
            Target Roles
          </TabsTrigger>
          <TabsTrigger value="companies">
            <Building2 data-icon="inline-start" />
            Dream Companies
          </TabsTrigger>
          <TabsTrigger value="dealbreakers">
            <Ban data-icon="inline-start" />
            Dealbreakers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resume">
          <ResumeTab state={state} set={set} buildPayload={buildPayload} />
        </TabsContent>

        <TabsContent value="targets">
          <JobTargetsTab state={state} set={set} buildPayload={buildPayload} />
        </TabsContent>
        <TabsContent value="companies">
          <DreamCompaniesTab state={state} set={set} buildPayload={buildPayload} />
        </TabsContent>
        <TabsContent value="dealbreakers">
          <DealbreakersTab state={state} set={set} buildPayload={buildPayload} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface TabProps {
  state: DirectivesState
  set: <K extends keyof DirectivesState>(key: K, value: DirectivesState[K]) => void
  buildPayload: () => Omit<DirectivesDoc, "_id" | "userId" | "updatedAt">
}

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
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Target Roles</CardTitle>
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
              <FieldLabel htmlFor="location">Location preferences</FieldLabel>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="location" className="pl-9" value={state.locations} onChange={(e) => set("locations", e.target.value)} />
              </div>
              <FieldDescription>Add cities or &quot;Remote&quot; regions.</FieldDescription>
            </Field>

            <Separator />

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
              <FieldDescription>Roles below your floor are auto-rejected by the Résumé Scorer Agent.</FieldDescription>
            </Field>

            <Field orientation="horizontal">
              <Button onClick={save} disabled={isPending}>
                {isPending ? "Saving..." : "Save match settings"}
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Match Preferences</CardTitle>
          <CardDescription>Control the quality bar and daily volume of your matches.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel>
                Minimum match score
                <Badge variant="secondary" className="ml-2 tabular-nums text-primary">
                  {state.minMatchScore}%
                </Badge>
              </FieldLabel>
              <div className="px-1 pt-3 pb-1">
                <Slider
                  value={[state.minMatchScore]}
                  onValueChange={(v) => set("minMatchScore", v[0])}
                  min={50}
                  max={100}
                  step={1}
                  aria-label="Minimum match score"
                />
                <div className="mt-2 flex justify-between text-xs text-muted-foreground tabular-nums">
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
              <FieldDescription>Only show matches that score at or above this threshold. Higher means fewer but better matches.</FieldDescription>
            </Field>

            <Separator />

            <Field>
              <FieldLabel>
                Matches to surface per day
                <Badge variant="secondary" className="ml-2 tabular-nums text-primary">
                  {state.dailyMatchLimit}
                </Badge>
              </FieldLabel>
              <div className="px-1 pt-3 pb-1">
                <Slider
                  value={[state.dailyMatchLimit]}
                  onValueChange={(v) => set("dailyMatchLimit", v[0])}
                  min={1}
                  max={50}
                  step={1}
                  aria-label="Daily match limit"
                />
                <div className="mt-2 flex justify-between text-xs text-muted-foreground tabular-nums">
                  <span>1</span>
                  <span>50</span>
                </div>
              </div>
              <FieldDescription>Your Résumé Scorer Agent will surface up to this many roles in your daily digest.</FieldDescription>
            </Field>

            <Separator />

            <Field>
              <FieldLabel>
                Cover letters to generate per day
                <Badge variant="secondary" className="ml-2 tabular-nums text-primary">
                  {state.dailyCoverLetterLimit}
                </Badge>
              </FieldLabel>
              <div className="px-1 pt-3 pb-1">
                <Slider
                  value={[state.dailyCoverLetterLimit]}
                  onValueChange={(v) => set("dailyCoverLetterLimit", v[0])}
                  min={1}
                  max={20}
                  step={1}
                  aria-label="Daily cover letter limit"
                />
                <div className="mt-2 flex justify-between text-xs text-muted-foreground tabular-nums">
                  <span>1</span>
                  <span>20</span>
                </div>
              </div>
              <FieldDescription>Your Ghostwriter Agent will draft cover letters for your top matches up to this limit.</FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
    </div>
  )
}

function DreamCompaniesTab({ state, set, buildPayload }: TabProps) {
  const [isPending, startTransition] = useTransition()

  const save = () => {
    startTransition(async () => {
      try {
        await saveDirectives(buildPayload())
        toast.success("Dream companies saved")
      } catch {
        toast.error("Failed to save")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Building2 className="size-4" />
          </span>
          <div>
            <CardTitle className="text-base">Dream Companies</CardTitle>
            <CardDescription>Your Networking Agent prioritizes outreach to these companies. Add any you&apos;d love to work at.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <TagInput tags={state.dreamCompanies} onChange={(tags) => set("dreamCompanies", tags)} placeholder="Add a company..." tone="primary" icon={Building2} />
          </Field>
          <Field orientation="horizontal">
            <Button onClick={save} disabled={isPending}>
              {isPending ? "Saving..." : "Save dream companies"}
            </Button>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

function DealbreakersTab({ state, set, buildPayload }: TabProps) {
  const [isPending, startTransition] = useTransition()

  const save = () => {
    startTransition(async () => {
      try {
        await saveDirectives(buildPayload())
        toast.success("Dealbreakers saved")
      } catch {
        toast.error("Failed to save")
      }
    })
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-destructive/15 text-destructive">
            <Ban className="size-4" />
          </span>
          <div>
            <CardTitle className="text-base">Dealbreakers</CardTitle>
            <CardDescription>Any match that trips one of these is auto-rejected by the Résumé Scorer Agent.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <TagInput tags={state.dealbreakers} onChange={(tags) => set("dealbreakers", tags)} placeholder="Add a dealbreaker..." tone="destructive" icon={X} />
          </Field>
          <Field orientation="horizontal">
            <Button onClick={save} disabled={isPending}>
              {isPending ? "Saving..." : "Save dealbreakers"}
            </Button>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

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
                placeholder={`Dear [Company] Hiring Team,\n\nI am writing to apply for the [Role] position on your [Team] team.\n\nAs [Headline], I have spent my career building products that create real, measurable impact — and everything I know about [Company] suggests this is exactly the environment where that work thrives.\n\nI bring deep experience in [Team] product work, and I would love to bring that to [Company].\n\nThank you for your consideration.\n\nBest regards,\n[Name]`}
                className="min-h-96 resize-y font-mono text-sm leading-relaxed"
                value={state.defaultCoverLetter}
                onChange={(e) => set("defaultCoverLetter", e.target.value)}
              />
              <FieldDescription className="flex items-center justify-between">
                <span>
                  Placeholders:{" "}
                  {["[Company]", "[Role]", "[Team]", "[RoleFull]", "[Headline]", "[Name]"].map((p) => (
                    <code key={p} className="mr-1 rounded bg-accent px-1 py-0.5 text-xs">{p}</code>
                  ))}
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

function ResumesTab({ state, set, buildPayload }: TabProps) {
  const [isPending, startTransition] = useTransition()

  const save = () => {
    startTransition(async () => {
      try {
        await saveDirectives(buildPayload())
        toast.success("Resumes saved")
      } catch {
        toast.error("Failed to save")
      }
    })
  }

  const addResume = () => {
    const id = `resume-${Date.now()}`
    const newResume: ResumeEntry = {
      id,
      label: "",
      text: "",
      fileName: "",
      isDefault: state.resumes.length === 0,
    }
    set("resumes", [...state.resumes, newResume])
  }

  const updateResume = (id: string, patch: Partial<ResumeEntry>) => {
    set("resumes", state.resumes.map((r) => r.id === id ? { ...r, ...patch } : r))
  }

  const setDefault = (id: string) => {
    set("resumes", state.resumes.map((r) => ({ ...r, isDefault: r.id === id })))
  }

  const removeResume = (id: string) => {
    const wasDefault = state.resumes.find((r) => r.id === id)?.isDefault ?? false
    const filtered = state.resumes.filter((r) => r.id !== id)
    if (wasDefault && filtered.length > 0) filtered[0].isDefault = true
    set("resumes", filtered)
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Your Resumes</CardTitle>
              <CardDescription>
                Name each resume by the role type it targets. The default is used for new matches; you can choose a different one per application on the match detail page.
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={addResume}>
              <Plus data-icon="inline-start" /> Add resume
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {state.resumes.length === 0 && (
            <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center">
              <p className="text-sm font-medium text-foreground">No resumes yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Click &quot;Add resume&quot; to paste in your first one.</p>
            </div>
          )}
          {state.resumes.map((resume) => (
            <div key={resume.id} className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4">
              {/* Name row */}
              <div className="flex items-center gap-3">
                <Input
                  value={resume.label}
                  onChange={(e) => updateResume(resume.id, { label: e.target.value })}
                  placeholder="Name this resume, e.g. Senior PM — AI, Head of Product"
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remove resume"
                    onClick={() => removeResume(resume.id)}
                  >
                    <X />
                  </Button>
                </div>
              </div>
              {/* Body */}
              <Textarea
                value={resume.text}
                onChange={(e) => updateResume(resume.id, { text: e.target.value })}
                placeholder="Paste your resume text here..."
                className="min-h-56 resize-y font-mono text-xs leading-relaxed"
              />
              <p className="text-xs text-muted-foreground tabular-nums">{resume.text.length.toLocaleString()} characters</p>
            </div>
          ))}

          {state.resumes.length > 0 && (
            <div className="flex justify-end">
              <Button onClick={save} disabled={isPending}>
                {isPending ? "Saving..." : "Save resumes"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function AgentsTab({ initialAgentConfigs }: { initialAgentConfigs: AgentDoc[] }) {
  const [paused, setPaused] = useState<Record<AgentKey, boolean>>(() => {
    const map: Record<string, boolean> = {}
    for (const cfg of initialAgentConfigs) map[cfg.agentId] = !cfg.enabled
    return {
      scraper: map["scraper"] ?? false,
      scorer: map["scorer"] ?? false,
      networking: map["networking"] ?? false,
      thought: map["thought"] ?? false,
    }
  })
  const [pending, startTransition] = useTransition()

  const toggle = (key: AgentKey, name: string) => {
    const nextPaused = !paused[key]
    setPaused((prev) => ({ ...prev, [key]: nextPaused }))
    startTransition(async () => {
      try {
        await saveAgentConfig(key, { enabled: !nextPaused })
        toast(nextPaused ? `${name} paused` : `${name} resumed`)
      } catch {
        setPaused((prev) => ({ ...prev, [key]: !nextPaused }))
        toast.error("Failed to save agent config")
      }
    })
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {agents.map((agent) => {
        const Icon = agent.icon
        const isPaused = paused[agent.key]
        return (
          <Card key={agent.key}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <CardTitle className="text-base">{agent.name}</CardTitle>
                    <CardDescription>{agent.role}</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className={isPaused ? "gap-1.5 text-warning" : "gap-1.5 text-success"}>
                  <span className="relative flex size-2">
                    {!isPaused && <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-70" />}
                    <span className={isPaused ? "relative inline-flex size-2 rounded-full bg-warning" : "relative inline-flex size-2 rounded-full bg-success"} />
                  </span>
                  {isPaused ? "Paused" : "Active"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Terminal className="size-3.5" />
                  System Instructions
                </div>
                <p className="rounded-lg border border-border bg-background/50 p-3 font-mono text-xs leading-relaxed text-muted-foreground">
                  {agent.systemPrompt}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                    <Target className="size-3.5" />
                    Accuracy score
                  </span>
                  <span className="font-semibold tabular-nums text-foreground">{agent.accuracy}%</span>
                </div>
                <Progress value={agent.accuracy} />
              </div>
              <Separator />
              <div className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2.5">
                <Label htmlFor={`toggle-${agent.key}`} className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">{isPaused ? "Resume Agent" : "Pause Agent"}</span>
                  <span className="text-xs text-muted-foreground">{isPaused ? "Currently idle" : "Running autonomously"}</span>
                </Label>
                <Switch
                  id={`toggle-${agent.key}`}
                  checked={!isPaused}
                  disabled={pending}
                  onCheckedChange={() => toggle(agent.key, agent.name)}
                />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function TagInput({ tags, onChange, placeholder, tone, icon: Icon }: {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder: string
  tone: "primary" | "destructive"
  icon: React.ElementType
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
