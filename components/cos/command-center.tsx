'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Sparkles,
  ChevronRight,
  FileEdit,
  Archive,
  TrendingUp,
  RefreshCw,
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
import { agents } from '@/lib/cos-data'
import type { ViewKey } from './app-sidebar'
import { cn } from '@/lib/utils'
import { regenerateMatches, type MatchDoc } from '@/lib/actions'

export function CommandCenter({ onNavigate, onNavigateToMatch, profileName, initialMatches = [] }: { onNavigate: (v: ViewKey) => void; onNavigateToMatch?: (matchId: string) => void; profileName?: string; initialMatches?: MatchDoc[] }) {
  return (
    <div className="flex flex-col gap-6">
      <DailyDigest onNavigate={onNavigate} onNavigateToMatch={onNavigateToMatch} profileName={profileName} initialMatches={initialMatches} />

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
        <Card className="divide-y divide-border py-0">
          {agents.map((agent) => {
            const Icon = agent.icon
            const agentView: ViewKey =
              agent.key === 'thought' ? 'thought-leadership'
              : agent.key === 'scraper' || agent.key === 'scorer' ? 'matches'
              : 'agents'
            // Use real match count for scraper/scorer agents
            const realActivity =
              agent.key === 'scraper' || agent.key === 'scorer'
                ? initialMatches.length
                : agent.activity
            const realLabel =
              agent.key === 'scraper'
                ? 'listings saved'
                : agent.key === 'scorer'
                ? 'roles matched'
                : agent.activityLabel
            return (
              <button
                key={agent.key}
                type="button"
                onClick={() => onNavigate(agentView)}
                className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-accent/40"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{agent.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{agent.role}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-foreground">{realActivity}</p>
                    <p className="text-xs text-muted-foreground">{realLabel}</p>
                  </div>
                  <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                    <span className="relative flex size-1.5">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-70" />
                      <span className="relative inline-flex size-1.5 rounded-full bg-success" />
                    </span>
                    Active
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </button>
            )
          })}
        </Card>
      </section>

    </div>
  )
}

function DailyDigest({ onNavigate, onNavigateToMatch, profileName, initialMatches }: { onNavigate: (v: ViewKey) => void; onNavigateToMatch?: (matchId: string) => void; profileName?: string; initialMatches: MatchDoc[] }) {
  const [regenerating, setRegenerating] = useState(false)
  const [matches, setMatches] = useState<MatchDoc[]>(initialMatches)
  const [today, setToday] = useState('')

  useEffect(() => {
    setToday(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }))
  }, [])

  const firstName = profileName?.split(' ')[0] ?? 'there'
  const topThree = matches.filter((m) => m.status !== "Not a Fit").slice(0, 3)

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      await regenerateMatches()
      toast.success('Matches regenerated', { description: 'Your agents have re-scored all active listings based on your target roles.' })
    } catch {
      toast.error('Failed to regenerate matches')
    } finally {
      setRegenerating(false)
    }
  }

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
            {topThree.length > 0 ? `Top ${topThree.length} Match${topThree.length !== 1 ? 'es' : ''} Found` : 'No Matches Yet'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {matches.length > 0 ? (
            <>
              Good morning, {firstName}. Your agents have found{' '}
              <span className="font-medium text-foreground">{matches.filter((m) => m.status !== 'Not a Fit').length} role{matches.filter((m) => m.status !== 'Not a Fit').length !== 1 ? 's' : ''}</span>{' '}
              that cleared your filters
              {matches.filter((m) => m.status === 'Applied').length > 0 && (
                <>, with <span className="font-medium text-foreground">{matches.filter((m) => m.status === 'Applied').length} applied</span></>
              )}
              {matches.filter((m) => m.status === 'Not a Fit').length > 0 && (
                <> and <span className="font-medium text-muted-foreground">{matches.filter((m) => m.status === 'Not a Fit').length} passed on</span></>
              )}
              . Here are the top matches.
            </>
          ) : (
            <>Good morning, {firstName}. No matches yet — head to Agent Setup to configure your job search criteria, then click Run Now.</>
          )}
        </p>

        <div className="flex flex-col gap-3">
          {topThree.length === 0 ? (
            <p className="text-sm text-muted-foreground">No matches yet — click Regenerate Matches to get started.</p>
          ) : (
            topThree.map((match) => (
              <div
                key={match.matchId}
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
                  {match.status && match.status !== "New" && (
                    <span className={cn(
                      "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
                      match.status === "Applied"      && "bg-success/15 text-success",
                      match.status === "Reviewing"    && "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
                      match.status === "Interviewing" && "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
                      match.status === "Offer"        && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
                      match.status === "Rejected"     && "bg-destructive/10 text-destructive",
                    )}>
                      {match.status}
                    </span>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => onNavigateToMatch ? onNavigateToMatch(match.matchId) : onNavigate('matches')}>
                    View Details
                    <ChevronRight data-icon="inline-end" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 border-t border-border">
        <Button size="sm" onClick={() => onNavigate('matches')}>
          View All Matches
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={regenerating}
          onClick={handleRegenerate}
        >
          <RefreshCw data-icon="inline-start" className={regenerating ? 'animate-spin' : ''} />
          {regenerating ? 'Regenerating...' : 'Regenerate Matches'}
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


