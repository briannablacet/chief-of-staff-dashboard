'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Sparkles,
  ChevronRight,
  FileEdit,
  Archive,
  Copy,
  Check,
  TrendingUp,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { agents, topMatches, postIdeas } from '@/lib/cos-data'
import type { ViewKey } from './app-sidebar'
import { cn } from '@/lib/utils'

const today = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

export function CommandCenter({ onNavigate }: { onNavigate: (v: ViewKey) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <DailyDigest onNavigate={onNavigate} />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Agent Status</h2>
          <Badge variant="outline" className="gap-1.5 text-muted-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            Live
          </Badge>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {agents.map((agent) => {
            const Icon = agent.icon
            return (
              <Card key={agent.key} className="gap-0 py-0">
                <CardHeader className="flex-row items-center gap-3 px-4 pt-4 pb-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary">
                    <Icon className="size-4" />
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <CardTitle className="truncate text-sm">{agent.name}</CardTitle>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="relative flex size-2">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-70" />
                        <span className="relative inline-flex size-2 rounded-full bg-success" />
                      </span>
                      {agent.role}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="line-clamp-2 min-h-9 text-xs leading-relaxed text-muted-foreground">
                    {agent.currentTask}
                  </p>
                  <Separator className="my-3" />
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-semibold tabular-nums text-foreground">
                      {agent.activity}
                    </span>
                    <span className="text-xs text-muted-foreground">{agent.activityLabel}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <PostIdeasList />
    </div>
  )
}

function DailyDigest({ onNavigate }: { onNavigate: (v: ViewKey) => void }) {
  return (
    <Card className="overflow-hidden border-primary/25 bg-gradient-to-b from-accent/40 to-card">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="size-5" />
            </span>
            <div>
              <CardTitle className="text-lg">Daily Digest</CardTitle>
              <CardDescription>{today}</CardDescription>
            </div>
          </div>
          <Badge className="gap-1 bg-primary/15 text-primary" variant="secondary">
            <TrendingUp className="size-3.5" />
            Top 3 Job Matches Found Today
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Good morning, Alex. Overnight your staff scanned{' '}
          <span className="font-medium text-foreground">214 new roles</span>, scored 38 against your
          criteria, and mapped 11 warm intro paths into your dream companies. Here are the three
          highest-conviction matches that cleared every filter.
        </p>

        <div className="flex flex-col gap-3">
          {topMatches.map((match) => (
            <div
              key={match.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-background/40 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground">
                  {match.company.slice(0, 2)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{match.role}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {match.company} &bull; {match.location} &bull; {match.salary}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MatchScore score={match.score} />
                <Button size="sm" variant="ghost" onClick={() => onNavigate('matches')}>
                  View Details
                  <ChevronRight data-icon="inline-end" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 border-t border-border">
        <Button size="sm" onClick={() => onNavigate('matches')}>
          View Details
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => toast('Draft cover letter opened', { description: 'Editing draft for Linear \u2014 Senior PM.' })}
        >
          <FileEdit data-icon="inline-start" />
          Edit Draft Cover Letter
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground"
          onClick={() => toast('Digest archived', { description: 'Today\u2019s digest moved to your archive.' })}
        >
          <Archive data-icon="inline-start" />
          Archive
        </Button>
      </CardFooter>
    </Card>
  )
}

export function MatchScore({ score }: { score: number }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold tabular-nums',
        score >= 90
          ? 'bg-success/15 text-success'
          : score >= 85
            ? 'bg-primary/15 text-primary'
            : 'bg-warning/15 text-warning',
      )}
    >
      {score}% match
    </span>
  )
}

function PostIdeasList() {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-medium text-muted-foreground">
          Today&apos;s LinkedIn Post Ideas
        </h2>
        <p className="text-xs text-muted-foreground/70">
          Generated by your Thought Leadership Agent
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {postIdeas.map((idea) => (
          <PostIdeaCard key={idea.id} idea={idea} />
        ))}
      </div>
    </section>
  )
}

function PostIdeaCard({ idea }: { idea: (typeof postIdeas)[number] }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(idea.body)
      setCopied(true)
      toast.success('Copied to clipboard', { description: 'Post is ready to paste into LinkedIn.' })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy to clipboard')
    }
  }

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="gap-2 px-4 pt-4 pb-3">
        <Badge variant="outline" className="w-fit text-muted-foreground">
          {idea.topic}
        </Badge>
        <CardTitle className="text-sm leading-snug text-balance">{idea.hook}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <p className="line-clamp-4 text-xs leading-relaxed whitespace-pre-line text-muted-foreground">
          {idea.body}
        </p>
      </CardContent>
      <CardFooter className="border-t border-border px-4 py-3">
        <Button size="sm" variant="secondary" className="w-full" onClick={handleCopy}>
          {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
          {copied ? 'Copied' : 'Copy to Clipboard'}
        </Button>
      </CardFooter>
    </Card>
  )
}
