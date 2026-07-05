'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Copy, Check, RefreshCw, PenLine } from 'lucide-react'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface PostIdea {
  id: string
  hook: string
  body: string
  topic: string
}

function generatePostIdeas(titles: string[], companies: string[]): PostIdea[] {
  const primaryTitle = titles[0] ?? 'Product Manager'
  const secondTitle = titles[1] ?? titles[0] ?? 'Senior PM'
  const primaryCompany = companies[0] ?? 'top tech companies'
  const secondCompany = companies[1] ?? companies[0] ?? 'fast-growing startups'
  const roleShort = primaryTitle.replace(/^(Senior |Staff |Principal |Group |Lead )/, '')

  return [
    {
      id: 'tl-1',
      topic: `${roleShort} Strategy`,
      hook: `The hardest part of being a ${primaryTitle} isn\u2019t the roadmap.`,
      body: `The hardest part of being a ${primaryTitle} isn\u2019t the roadmap.\n\nIt\u2019s the 40 conversations that have to happen before a single line gets written.\n\nAlignment is the product. The roadmap is just proof you achieved it.\n\n3 things I do before I touch a planning doc:\n1. Talk to the engineer who\u2019ll build it first\n2. Find the stakeholder most likely to say no \u2014 and go there second\n3. Ask: what would have to be true for this to be obviously wrong?\n\nWhat\u2019s your pre-roadmap ritual?`,
    },
    {
      id: 'tl-2',
      topic: 'Career Growth',
      hook: `What nobody tells you about making the jump to ${secondTitle}.`,
      body: `What nobody tells you about making the jump to ${secondTitle}:\n\nThe skills that got you promoted are not the skills that will make you effective in the new role.\n\nYou stop being the person with the best answer. You become the person who creates the conditions for the best answer to emerge.\n\nThe hardest part? Letting go of being right and optimizing for the team being right.\n\nWhat was the biggest mindset shift at your last level change?`,
    },
    {
      id: 'tl-3',
      topic: 'Industry Perspective',
      hook: `I\u2019ve interviewed at ${primaryCompany} and ${secondCompany}. Here\u2019s the difference.`,
      body: `I\u2019ve interviewed at ${primaryCompany} and ${secondCompany}. Here\u2019s the real difference between them:\n\nIt\u2019s not the perks or the tech stack. It\u2019s the quality of the questions they ask.\n\n${primaryCompany} asked: \u201cWalk me through a decision you made with incomplete data.\u201d\n${secondCompany} asked: \u201cWhat\u2019s a product you use every day that you\u2019d redesign?\u201d\n\nBoth are great. But they reveal very different things about what they optimize for.\n\nThe best career signal in any interview: are they curious about how you think, or just what you\u2019ve shipped?\n\nWhat\u2019s the best interview question you\u2019ve been asked?`,
    },
    {
      id: 'tl-4',
      topic: 'Leadership',
      hook: 'The meeting that changed how I think about prioritization.',
      body: `The meeting that changed how I think about prioritization:\n\nWe had 14 items on the roadmap. All were \u201ccritical.\u201d I asked the team to stack-rank them.\n\nWe spent 90 minutes going in circles \u2014 everyone protecting their domain.\n\nThen I asked a different question: \u201cIf we could only ship one thing before the year ended and it had to matter to a customer, what would it be?\u201d\n\nSilence. Then one answer. Then everyone agreed.\n\nSometimes the prioritization problem is actually a framing problem.\n\nWhat question unstuck your last planning cycle?`,
    },
    {
      id: 'tl-5',
      topic: 'AI & Product',
      hook: `AI won\u2019t replace ${roleShort}s. But it will replace certain habits.`,
      body: `AI won\u2019t replace ${roleShort}s. But it will replace certain habits.\n\nSpecifically: the habit of making decisions slowly because synthesis takes time.\n\nThe teams I\u2019m seeing win right now are using AI to compress the time between \u201chere\u2019s the data\u201d and \u201chere\u2019s what we should do\u201d \u2014 not to automate the decision, but to get to the hard conversation faster.\n\nThe ${roleShort}\u2019s job isn\u2019t going away. The excuse of \u201cI haven\u2019t had time to analyze it yet\u201d is.\n\nHow are you using AI to change your decision-making process?`,
    },
    {
      id: 'tl-6',
      topic: 'Shipping',
      hook: 'The feature we almost didn\u2019t ship taught me the most.',
      body: `The feature we almost didn\u2019t ship taught me the most.\n\nIt was 80% done for three sprints. Engineers were proud of it. Design had sweated every pixel.\n\nBut every time we reviewed it, something felt off. We kept adding scope to fix a feeling.\n\nFinally I asked: \u201cIs this a quality problem, or are we afraid of what users will say?\u201d\n\nIt was the second thing.\n\nWe shipped it. Users loved the core. They told us exactly what to fix. We fixed it in two weeks.\n\nDone and learning beats perfect and waiting every time.\n\nWhat\u2019s sitting at 80% on your roadmap right now?`,
    },
  ]
}

export function ThoughtLeadership({
  targetTitles,
  targetCompanies,
}: {
  targetTitles?: string | string[]
  targetCompanies?: string[]
}) {
  // targetTitles may come in as a comma-separated string or already as an array
  const titles = Array.isArray(targetTitles)
    ? targetTitles.flatMap((t) => t.split(',').map((s) => s.trim())).filter(Boolean)
    : targetTitles
    ? targetTitles.split(',').map((t) => t.trim()).filter(Boolean)
    : ['Product Manager']

  const companies = targetCompanies?.length ? targetCompanies : ['top tech companies']

  const allIdeas = generatePostIdeas(titles, companies)
  const [displayIdeas, setDisplayIdeas] = useState<PostIdea[]>(allIdeas)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await new Promise((r) => setTimeout(r, 600))
    setDisplayIdeas((prev) => [...prev.slice(1), prev[0]])
    setRefreshing(false)
    toast.success('Post ideas refreshed', { description: 'New angles generated from your target roles.' })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold text-foreground">Build your presence.</p>
          <p className="text-base text-muted-foreground">
            Post ideas tailored to your target roles: {titles.slice(0, 2).join(', ')}.
          </p>
        </div>
        <Button variant="outline" size="sm" disabled={refreshing} onClick={handleRefresh}>
          <RefreshCw data-icon="inline-start" className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh Ideas'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {displayIdeas.map((idea) => (
          <PostIdeaCard key={idea.id} idea={idea} />
        ))}
      </div>
    </div>
  )
}

function PostIdeaCard({ idea }: { idea: PostIdea }) {
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
    <Card className="flex flex-col gap-0 py-0">
      <CardHeader className="gap-2 px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <PenLine className="size-3.5 text-muted-foreground" />
          <Badge variant="outline" className="w-fit text-muted-foreground">
            {idea.topic}
          </Badge>
        </div>
        <CardTitle className="text-sm leading-snug text-balance">{idea.hook}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 px-4 pb-3">
        <p className="line-clamp-6 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
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
