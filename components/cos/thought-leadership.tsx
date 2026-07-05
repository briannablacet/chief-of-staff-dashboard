'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Copy, Check, RefreshCw, PenLine, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

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

  // "a" vs "an" — trim first, also handle common initialisms (AI, ML, API, etc.)
  const article = (s: string) => {
    const w = s.trim()
    // Initialisms starting with vowel sounds: A, E, F, H, I, L, M, N, O, R, S, X
    if (/^(AI|ML|API|NLP|NLU|AR|VR|XR|MR|LLM|NPC)\b/i.test(w)) return 'an'
    return /^[aeiou]/i.test(w) ? 'an' : 'a'
  }

  return [
    {
      id: 'tl-1',
      topic: `${primaryTitle} Strategy`,
      hook: `The hardest part of being ${article(primaryTitle)} ${primaryTitle} isn\u2019t the roadmap.`,
      body: [
        `The hardest part of being ${article(primaryTitle)} ${primaryTitle} isn\u2019t the roadmap.`,
        `It\u2019s the 40 conversations that have to happen before a single line gets written.`,
        `Alignment is the product. The roadmap is just proof you achieved it.`,
        `3 things I do before I touch a planning doc:\n1. Talk to the engineer who\u2019ll build it first\n2. Find the stakeholder most likely to say no \u2014 and go there second\n3. Ask: what would have to be true for this to be obviously wrong?`,
        `What\u2019s your pre-roadmap ritual?`,
      ].join('\n\n'),
    },
    {
      id: 'tl-2',
      topic: 'Career Growth',
      hook: `What nobody tells you about making the jump to ${secondTitle}.`,
      body: [
        `What nobody tells you about making the jump to ${secondTitle}:`,
        `The skills that got you promoted are not the skills that will make you effective in the new role.`,
        `You stop being the person with the best answer. You become the person who creates the conditions for the best answer to emerge.`,
        `The hardest part? Letting go of being right and optimizing for the team being right.`,
        `What was the biggest mindset shift at your last level change?`,
      ].join('\n\n'),
    },
    {
      id: 'tl-3',
      topic: 'Industry Perspective',
      hook: `I\u2019ve interviewed at ${primaryCompany} and ${secondCompany}. Here\u2019s the difference.`,
      body: [
        `I\u2019ve interviewed at ${primaryCompany} and ${secondCompany}. Here\u2019s the real difference between them:`,
        `It\u2019s not the perks or the tech stack. It\u2019s the quality of the questions they ask.`,
        `${primaryCompany} asked: \u201cWalk me through a decision you made with incomplete data.\u201d\n${secondCompany} asked: \u201cWhat\u2019s a product you use every day that you\u2019d redesign?\u201d`,
        `Both are great. But they reveal very different things about what they optimize for.`,
        `The best career signal in any interview: are they curious about how you think, or just what you\u2019ve shipped?`,
        `What\u2019s the best interview question you\u2019ve been asked?`,
      ].join('\n\n'),
    },
    {
      id: 'tl-4',
      topic: 'Leadership',
      hook: 'The meeting that changed how I think about prioritization.',
      body: [
        `The meeting that changed how I think about prioritization:`,
        `We had 14 items on the roadmap. All were \u201ccritical.\u201d I asked the team to stack-rank them.`,
        `We spent 90 minutes going in circles \u2014 everyone protecting their domain.`,
        `Then I asked a different question: \u201cIf we could only ship one thing before the year ended and it had to matter to a customer, what would it be?\u201d`,
        `Silence. Then one answer. Then everyone agreed.`,
        `Sometimes the prioritization problem is actually a framing problem.`,
        `What question unstuck your last planning cycle?`,
      ].join('\n\n'),
    },
    {
      id: 'tl-5',
      topic: 'AI & Product',
      hook: `AI won\u2019t replace ${primaryTitle}s. But it will replace certain habits.`,
      body: [
        `AI won\u2019t replace ${primaryTitle}s. But it will replace certain habits.`,
        `Specifically: the habit of making decisions slowly because synthesis takes time.`,
        `The teams I\u2019m seeing win right now are using AI to compress the time between \u201chere\u2019s the data\u201d and \u201chere\u2019s what we should do\u201d \u2014 not to automate the decision, but to get to the hard conversation faster.`,
        `The ${primaryTitle}\u2019s job isn\u2019t going away. The excuse of \u201cI haven\u2019t had time to analyze it yet\u201d is.`,
        `How are you using AI to change your decision-making process?`,
      ].join('\n\n'),
    },
    {
      id: 'tl-6',
      topic: 'Shipping',
      hook: 'The feature we almost didn\u2019t ship taught me the most.',
      body: [
        `The feature we almost didn\u2019t ship taught me the most.`,
        `It was 80% done for three sprints. Engineers were proud of it. Design had sweated every pixel.`,
        `But every time we reviewed it, something felt off. We kept adding scope to fix a feeling.`,
        `Finally I asked: \u201cIs this a quality problem, or are we afraid of what users will say?\u201d`,
        `It was the second thing.`,
        `We shipped it. Users loved the core. They told us exactly what to fix. We fixed it in two weeks.`,
        `Done and learning beats perfect and waiting every time.`,
        `What\u2019s sitting at 80% on your roadmap right now?`,
      ].join('\n\n'),
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
  // Titles are stored as comma-separated e.g. "Senior PM, Group PM, Principal PM"
  // Split on ", " (comma + space) to avoid breaking role names like "AI Enablement, Platform"
  // that the user may have typed as a single role with a sub-team.
  const rawTitles = Array.isArray(targetTitles)
    ? targetTitles.join(', ')
    : targetTitles ?? 'Product Manager'
  const titles = rawTitles.split(/,\s+/).map((t) => t.trim()).filter(Boolean)

  const companies = targetCompanies?.length ? targetCompanies : ['top tech companies']

  const allIdeas = generatePostIdeas(titles, companies)
  const [displayIdeas, setDisplayIdeas] = useState<PostIdea[]>(allIdeas)
  const [refreshing, setRefreshing] = useState(false)
  const [selected, setSelected] = useState<PostIdea | null>(null)

  const handleRefresh = async () => {
    setRefreshing(true)
    await new Promise((r) => setTimeout(r, 600))
    setDisplayIdeas((prev) => [...prev.slice(1), prev[0]])
    setRefreshing(false)
    toast.success('Post ideas refreshed', { description: 'New angles generated from your target roles.' })
  }

  if (selected) {
    return (
      <PostEditor
        idea={selected}
        onBack={() => setSelected(null)}
        onSave={(updated) => {
          setDisplayIdeas((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
          setSelected(updated)
        }}
      />
    )
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
          <PostIdeaCard key={idea.id} idea={idea} onOpen={() => setSelected(idea)} />
        ))}
      </div>
    </div>
  )
}

function PostIdeaCard({ idea, onOpen }: { idea: PostIdea; onOpen: () => void }) {
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
        <p className="line-clamp-5 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
          {idea.body}
        </p>
      </CardContent>
      <CardFooter className="border-t border-border px-4 py-3">
        <Button size="sm" variant="secondary" className="w-full" onClick={onOpen}>
          <PenLine data-icon="inline-start" />
          Open &amp; Edit
        </Button>
      </CardFooter>
    </Card>
  )
}

function PostEditor({
  idea,
  onBack,
  onSave,
}: {
  idea: PostIdea
  onBack: () => void
  onSave: (updated: PostIdea) => void
}) {
  const [body, setBody] = useState(idea.body)
  const [hook, setHook] = useState(idea.hook)
  const [copied, setCopied] = useState(false)
  const isDirty = body !== idea.body || hook !== idea.hook

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(body)
      setCopied(true)
      toast.success('Copied to clipboard', { description: 'Post is ready to paste into LinkedIn.' })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy to clipboard')
    }
  }

  const handleSave = () => {
    onSave({ ...idea, hook, body })
    toast.success('Post saved')
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft data-icon="inline-start" />
          All post ideas
        </Button>
        <Badge variant="outline" className="text-muted-foreground">{idea.topic}</Badge>
      </div>

      {/* Hook line */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Opening hook</p>
        <Textarea
          value={hook}
          onChange={(e) => setHook(e.target.value)}
          className="resize-none text-base font-semibold leading-snug"
          rows={2}
          placeholder="Your opening hook..."
        />
      </div>

      {/* Full post body */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Post body</p>
          <p className="text-xs text-muted-foreground tabular-nums">{body.length} chars</p>
        </div>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-96 resize-y text-sm leading-relaxed"
          placeholder="Your full post..."
        />
        <div className="flex gap-2 pt-1">
          <Button onClick={handleSave} disabled={!isDirty}>
            Save changes
          </Button>
          <Button variant="outline" onClick={handleCopy}>
            {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
            {copied ? 'Copied' : 'Copy to clipboard'}
          </Button>
        </div>
      </div>

      {/* Tips — live checklist */}
      <div className="rounded-lg border border-border bg-secondary/40 p-4">
        <p className="mb-3 text-xs font-medium text-foreground">LinkedIn post tips</p>
        <ul className="flex flex-col gap-2">
          {[
            {
              label: `Character count: ${body.length} / 1,300`,
              pass: body.length <= 1300,
              failNote: `${body.length - 1300} chars over — trim for maximum reach.`,
              passNote: 'Good length for maximum reach.',
            },
            {
              label: 'Has line breaks for white space',
              pass: (body.match(/\n/g) ?? []).length >= 3,
              failNote: 'Add more line breaks — white space increases engagement.',
              passNote: 'Good use of white space.',
            },
            {
              label: 'Ends with a question',
              pass: /\?\s*$/.test(body.trim()),
              failNote: 'End with a question to drive comments.',
              passNote: 'Ends with a question — great for comments.',
            },
            {
              label: 'Best posting window: Tue–Thu, 8–10am',
              pass: null,
              failNote: '',
              passNote: '',
            },
          ].map(({ label, pass, failNote, passNote }) => (
            <li key={label} className="flex items-start gap-2 text-xs">
              {pass === null ? (
                <span className="mt-0.5 size-4 shrink-0 rounded-full border border-border" />
              ) : pass ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
              ) : (
                <XCircle className="mt-0.5 size-4 shrink-0 text-warning" />
              )}
              <span className={pass === null ? 'text-muted-foreground' : pass ? 'text-success' : 'text-warning'}>
                {pass === null ? label : pass ? passNote : failNote}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
