'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Target,
  Ban,
  Building2,
  FileText,
  Link2,
  MapPin,
  Plus,
  X,
  UploadCloud,
  Briefcase,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

export function Directives() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Directives &amp; Criteria</h1>
        <p className="text-sm text-muted-foreground">
          Tell your Chief of Staff exactly what to look for and what to avoid.
        </p>
      </div>

      <Tabs defaultValue="targets" className="gap-6">
        <TabsList className="w-full max-w-xl">
          <TabsTrigger value="targets">
            <Target data-icon="inline-start" />
            Job Targets
          </TabsTrigger>
          <TabsTrigger value="dealbreakers">
            <Ban data-icon="inline-start" />
            Dealbreakers
          </TabsTrigger>
          <TabsTrigger value="resume">
            <FileText data-icon="inline-start" />
            Resume &amp; Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="targets">
          <JobTargetsTab />
        </TabsContent>
        <TabsContent value="dealbreakers">
          <DealbreakersTab />
        </TabsContent>
        <TabsContent value="resume">
          <ResumeTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function JobTargetsTab() {
  const [salary, setSalary] = useState<number[]>([190, 270])

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
            <Input
              id="titles"
              defaultValue="Senior Product Manager, Group PM, Principal PM"
            />
            <FieldDescription>Separate multiple titles with commas.</FieldDescription>
          </Field>

          <Field>
            <FieldLabel>
              Target salary range
              <Badge variant="secondary" className="ml-2 tabular-nums text-primary">
                {`$${salary[0]}k – $${salary[1]}k`}
              </Badge>
            </FieldLabel>
            <div className="px-1 pt-3 pb-1">
              <Slider
                value={salary}
                onValueChange={(v) => setSalary(v as number[])}
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
            <FieldDescription>
              Roles below your floor are auto-rejected by the Resume Scorer Agent.
            </FieldDescription>
          </Field>

          <Separator />

          <Field>
            <FieldLabel htmlFor="location">Location preferences</FieldLabel>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="location"
                className="pl-9"
                defaultValue="Remote (US), New York, San Francisco"
              />
            </div>
            <FieldDescription>Add cities or &quot;Remote&quot; regions.</FieldDescription>
          </Field>

          <Field orientation="horizontal">
            <Button onClick={() => toast.success('Job targets saved')}>Save targets</Button>
            <Button variant="ghost" className="text-muted-foreground">
              Reset
            </Button>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

function DealbreakersTab() {
  const [dream, setDream] = useState<string[]>([
    'Linear',
    'Vercel',
    'Stripe',
    'Notion',
    'Figma',
  ])
  const [anti, setAnti] = useState<string[]>([
    'Exclude Fintech',
    'No strict RTO',
    'No pre-seed startups',
  ])

  return (
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
          <TagInput
            tags={dream}
            onChange={setDream}
            placeholder="Add a company..."
            tone="primary"
            icon={Briefcase}
          />
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
          <TagInput
            tags={anti}
            onChange={setAnti}
            placeholder="Add a dealbreaker..."
            tone="destructive"
            icon={X}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function TagInput({
  tags,
  onChange,
  placeholder,
  tone,
  icon: Icon,
}: {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder: string
  tone: 'primary' | 'destructive'
  icon: typeof X
}) {
  const [value, setValue] = useState('')

  const add = () => {
    const v = value.trim()
    if (!v || tags.includes(v)) {
      setValue('')
      return
    }
    onChange([...tags, v])
    setValue('')
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault()
              add()
            }
          }}
          placeholder={placeholder}
        />
        <Button
          type="button"
          size="icon"
          variant={tone === 'destructive' ? 'outline' : 'default'}
          onClick={add}
          aria-label="Add"
        >
          <Plus />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.length === 0 && (
          <p className="text-xs text-muted-foreground">Nothing added yet.</p>
        )}
        {tags.map((tag) => (
          <span
            key={tag}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium',
              tone === 'destructive'
                ? 'border-destructive/30 bg-destructive/10 text-destructive'
                : 'border-primary/30 bg-primary/10 text-primary',
            )}
          >
            <Icon className="size-3" />
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              aria-label={`Remove ${tag}`}
              className="ml-0.5 rounded-full opacity-60 transition-opacity hover:opacity-100"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}

function ResumeTab() {
  const [fileName, setFileName] = useState<string | null>('alex-rivera-resume-2026.pdf')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Resume &amp; Profile</CardTitle>
        <CardDescription>
          Your master resume trains the Resume Scorer Agent&apos;s matching.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="resume-upload">Master resume</FieldLabel>
            <label
              htmlFor="resume-upload"
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-background/40 px-6 py-10 text-center transition-colors hover:border-primary/50 hover:bg-accent/30"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-accent text-primary">
                <UploadCloud className="size-6" />
              </span>
              <span className="text-sm font-medium text-foreground">
                Drag &amp; drop your resume, or click to browse
              </span>
              <span className="text-xs text-muted-foreground">PDF or DOCX, up to 10MB</span>
              <input
                id="resume-upload"
                type="file"
                accept=".pdf,.doc,.docx"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) {
                    setFileName(f.name)
                    toast.success('Resume uploaded', { description: f.name })
                  }
                }}
              />
            </label>
            {fileName && (
              <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2.5">
                <span className="flex items-center gap-2 text-sm text-foreground">
                  <FileText className="size-4 text-primary" />
                  {fileName}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  aria-label="Remove resume"
                  onClick={() => setFileName(null)}
                >
                  <X />
                </Button>
              </div>
            )}
          </Field>

          <Separator />

          <Field>
            <FieldLabel htmlFor="linkedin">LinkedIn profile</FieldLabel>
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="linkedin" className="pl-9" defaultValue="linkedin.com/in/alexrivera" />
            </div>
          </Field>

          <Field>
            <FieldLabel htmlFor="portfolio">Portfolio / website</FieldLabel>
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="portfolio" className="pl-9" defaultValue="alexrivera.dev" />
            </div>
          </Field>

          <Field orientation="horizontal">
            <Button onClick={() => toast.success('Profile saved')}>Save profile</Button>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
