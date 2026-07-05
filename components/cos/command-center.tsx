'use client'

import { useState } from 'react'
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
import { Separator } from '@/components/ui/separator'
import { agents } from '@/lib/cos-data'
import type { ViewKey } from './app-sidebar'
import { cn } from '@/lib/utils'
import { regenerateMatches, type MatchDoc } from '@/lib/actions'

const today = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

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

    </div>
  )
}

function DailyDigest({ onNavigate, onNavigateToMatch, profileName, initialMatches }: { onNavigate: (v: ViewKey) => void; onNavigateToMatch?: (matchId: string) => void; profileName?: string; initialMatches: MatchDoc[] }) {
  const [regenerating, setRegenerating] = useState(false)
  const [matches, setMatches] = useState<MatchDoc[]>(initialMatches)

  const firstName = profileName?.split(' ')[0] ?? 'there'
  const topThree = matches.slice(0, 3)

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
          Good morning, {firstName}. Overnight your staff scanned{' '}
          <span className="font-medium text-foreground">214 new roles</span>, scored 38 against your
          criteria, and mapped 11 warm intro paths into your dream companies. Here are the three
          highest-conviction matches that cleared every filter.
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


