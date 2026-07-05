import type { LucideIcon } from 'lucide-react'
import { Globe, Gauge, Users, PenLine } from 'lucide-react'

export type AgentKey = 'scraper' | 'scorer' | 'networking' | 'thought'

export type Agent = {
  key: AgentKey
  name: string
  role: string
  icon: LucideIcon
  currentTask: string
  activity: number
  activityLabel: string
  accuracy: number
  systemPrompt: string
}

export const agents: Agent[] = [
  {
    key: 'scraper',
    name: 'Web Scraper Agent',
    role: 'Scanning LinkedIn & Indeed',
    icon: Globe,
    currentTask: 'Parsing 214 new listings from LinkedIn Jobs',
    activity: 214,
    activityLabel: 'listings scanned today',
    accuracy: 96,
    systemPrompt:
      'You are a tireless market scanner. Continuously crawl LinkedIn, Indeed, Wellfound, and company career pages for roles matching the user\u2019s target titles and locations. Deduplicate postings, extract structured fields (title, comp, location, work model, seniority), and hand qualified candidates to the Resume Scorer Agent within 5 minutes of discovery.',
  },
  {
    key: 'scorer',
    name: 'Resume Scorer Agent',
    role: 'Matching & filtering criteria',
    icon: Gauge,
    currentTask: 'Scoring "Staff PM, Payments" against master resume',
    activity: 38,
    activityLabel: 'roles scored today',
    accuracy: 92,
    systemPrompt:
      'You are a rigorous fit evaluator. Compare each incoming role against the user\u2019s master resume, salary floor, location and work-model preferences, and the Anti-List. Produce a 0\u2013100 match score with an itemized breakdown. Reject anything that trips a dealbreaker. Only surface roles scoring 80+ to the Command Center.',
  },
  {
    key: 'networking',
    name: 'Networking Agent',
    role: 'Checking dream companies',
    icon: Users,
    currentTask: 'Mapping 2nd-degree intros into Stripe & Linear',
    activity: 11,
    activityLabel: 'warm paths found',
    accuracy: 88,
    systemPrompt:
      'You are a relationship strategist. For every dream company, map the user\u2019s 1st and 2nd-degree LinkedIn connections to hiring managers and teams. Identify the warmest intro path, draft a short, specific outreach note, and queue it for review. Never send without explicit approval.',
  },
  {
    key: 'thought',
    name: 'Thought Leadership Agent',
    role: 'Generating LinkedIn post ideas',
    icon: PenLine,
    currentTask: 'Drafting 3 posts on AI product strategy',
    activity: 3,
    activityLabel: 'drafts ready to review',
    accuracy: 90,
    systemPrompt:
      'You are a personal brand ghostwriter. Using the user\u2019s expertise and recent industry news, generate concise, opinionated LinkedIn posts that build authority in their target field. Match their voice, keep hooks strong, and always end with a question or takeaway. Produce 3 fresh ideas each morning.',
  },
]

export type JobMatch = {
  id: string
  company: string
  role: string
  location: string
  workModel: 'Remote' | 'Hybrid' | 'On-site'
  salary: string
  score: number
  status: 'New' | 'Reviewed' | 'Applied'
  postedAgo: string
  breakdown: { label: string; met: boolean; note: string }[]
  coverLetter: string
}

export const topMatches: JobMatch[] = [
  {
    id: 'm1',
    company: 'Linear',
    role: 'Senior Product Manager, Platform',
    location: 'Remote (US)',
    workModel: 'Remote',
    salary: '$205k \u2013 $240k + equity',
    score: 94,
    status: 'New',
    postedAgo: '3h ago',
    breakdown: [
      { label: 'Compensation', met: true, note: 'Above $190k floor' },
      { label: 'Work model', met: true, note: 'Fully remote' },
      { label: 'Domain fit', met: true, note: 'Dev-tools & platform experience' },
      { label: 'Anti-List', met: true, note: 'Not fintech, no strict RTO' },
      { label: 'Seniority', met: true, note: 'Senior IC track available' },
    ],
    coverLetter:
      'Dear Linear Hiring Team,\n\nI\u2019ve spent the last five years shipping platform products that developers actually love \u2014 shaving latency, killing toil, and turning internal tools into flagship experiences. Linear\u2019s obsession with craft and speed is exactly the environment where I do my best work.\n\nAt my current role I led the platform roadmap that grew API adoption 3x and cut onboarding time in half. I\u2019d bring that same rigor to Linear\u2019s platform surface, partnering closely with engineering to keep the bar absurdly high.\n\nI\u2019d love to talk about where you\u2019re taking the platform next.\n\nBest,\nAlex Rivera',
  },
  {
    id: 'm2',
    company: 'Ramp',
    role: 'Group Product Manager, Growth',
    location: 'New York, NY',
    workModel: 'Hybrid',
    salary: '$220k \u2013 $260k + equity',
    score: 91,
    status: 'New',
    postedAgo: '5h ago',
    breakdown: [
      { label: 'Compensation', met: true, note: 'Well above floor' },
      { label: 'Work model', met: true, note: '3 days hybrid \u2014 acceptable' },
      { label: 'Domain fit', met: true, note: 'Growth & activation expertise' },
      { label: 'Anti-List', met: true, note: 'Spend management, not consumer fintech' },
      { label: 'Seniority', met: false, note: 'Manages a team of 4 (stretch)' },
    ],
    coverLetter:
      'Dear Ramp Team,\n\nGrowth at a company moving as fast as Ramp is a rare opportunity. I\u2019ve built and led growth pods that owned activation and expansion, lifting net revenue retention by 14 points in a year.\n\nI\u2019m drawn to Ramp\u2019s data-driven culture and would relish the chance to scale a growth team while keeping experimentation velocity high.\n\nWarm regards,\nAlex Rivera',
  },
  {
    id: 'm3',
    company: 'Vercel',
    role: 'Principal PM, Developer Experience',
    location: 'Remote (Global)',
    workModel: 'Remote',
    salary: '$230k \u2013 $270k + equity',
    score: 89,
    status: 'New',
    postedAgo: '8h ago',
    breakdown: [
      { label: 'Compensation', met: true, note: 'Top of range' },
      { label: 'Work model', met: true, note: 'Fully remote, async-first' },
      { label: 'Domain fit', met: true, note: 'DX & frontend tooling' },
      { label: 'Anti-List', met: true, note: 'No dealbreakers triggered' },
      { label: 'Seniority', met: true, note: 'Principal IC \u2014 ideal' },
    ],
    coverLetter:
      'Dear Vercel Team,\n\nDeveloper experience is where product craft and empathy collide, and it\u2019s the work I care about most. I\u2019ve shipped DX improvements that measurably reduced time-to-first-deploy and turned skeptics into advocates.\n\nVercel sets the standard here, and I\u2019d be thrilled to help push it further.\n\nBest,\nAlex Rivera',
  },
]

export const archiveMatches: JobMatch[] = [
  ...topMatches,
  {
    id: 'm4',
    company: 'Notion',
    role: 'Senior PM, AI',
    location: 'San Francisco, CA',
    workModel: 'Hybrid',
    salary: '$210k \u2013 $250k + equity',
    score: 87,
    status: 'Reviewed',
    postedAgo: '1d ago',
    breakdown: [
      { label: 'Compensation', met: true, note: 'Above floor' },
      { label: 'Work model', met: true, note: '2 days hybrid' },
      { label: 'Domain fit', met: true, note: 'AI product surface' },
      { label: 'Anti-List', met: true, note: 'No dealbreakers' },
      { label: 'Seniority', met: true, note: 'Senior IC' },
    ],
    coverLetter:
      'Dear Notion Team,\n\nAI inside a tool millions rely on daily is a design challenge I find irresistible. I\u2019ve shipped AI features that respected user trust and actually got used, not ignored.\n\nI\u2019d love to help Notion make AI feel native, not bolted on.\n\nBest,\nAlex Rivera',
  },
  {
    id: 'm5',
    company: 'Figma',
    role: 'Product Manager, Platform APIs',
    location: 'Remote (US)',
    workModel: 'Remote',
    salary: '$195k \u2013 $225k + equity',
    score: 85,
    status: 'Applied',
    postedAgo: '2d ago',
    breakdown: [
      { label: 'Compensation', met: true, note: 'Just above floor' },
      { label: 'Work model', met: true, note: 'Fully remote' },
      { label: 'Domain fit', met: true, note: 'Platform & APIs' },
      { label: 'Anti-List', met: true, note: 'No dealbreakers' },
      { label: 'Seniority', met: false, note: 'Mid-senior (slight step)' },
    ],
    coverLetter:
      'Dear Figma Team,\n\nOpening a creative tool up through great APIs multiplies its value, and that leverage is what excites me about this role. I\u2019ve grown developer ecosystems from zero to thriving.\n\nI\u2019d welcome the chance to expand Figma\u2019s platform surface.\n\nBest,\nAlex Rivera',
  },
  {
    id: 'm6',
    company: 'Anthropic',
    role: 'Product Manager, Developer Platform',
    location: 'Remote (US)',
    workModel: 'Remote',
    salary: '$240k \u2013 $290k + equity',
    score: 83,
    status: 'Reviewed',
    postedAgo: '3d ago',
    breakdown: [
      { label: 'Compensation', met: true, note: 'Top of market' },
      { label: 'Work model', met: true, note: 'Remote friendly' },
      { label: 'Domain fit', met: true, note: 'AI dev platform' },
      { label: 'Anti-List', met: true, note: 'No dealbreakers' },
      { label: 'Seniority', met: false, note: 'Heavy on-call expectation' },
    ],
    coverLetter:
      'Dear Anthropic Team,\n\nBuilding the platform that lets developers safely harness frontier models is some of the most important product work today. I bring deep developer-platform experience and a strong point of view on responsible rollout.\n\nI\u2019d be honored to contribute.\n\nBest,\nAlex Rivera',
  },
]

export type PostIdea = {
  id: string
  hook: string
  body: string
  topic: string
}

export const postIdeas: PostIdea[] = [
  {
    id: 'p1',
    topic: 'AI Product Strategy',
    hook: 'Most AI features fail for the same boring reason.',
    body: 'Most AI features fail for the same boring reason: they solve a demo, not a workflow.\n\nThe teams winning right now aren\u2019t shipping the flashiest model \u2014 they\u2019re shipping the smallest reliable loop inside an existing habit.\n\n3 questions I ask before greenlighting any AI feature:\n1. What decision does this remove?\n2. What happens when it\u2019s wrong?\n3. Would a user still open the app without it?\n\nWhat\u2019s a workflow you\u2019d never trust to AI yet?',
  },
  {
    id: 'p2',
    topic: 'Career Growth',
    hook: 'The best PMs I know are ruthless about one thing.',
    body: 'The best PMs I know are ruthless about one thing: killing their own ideas early.\n\nEarly in my career I fell in love with roadmaps. Now I fall in love with the problem and stay suspicious of every solution \u2014 including mine.\n\nThe fastest way to grow isn\u2019t more output. It\u2019s a shorter distance between "I believe" and "I checked."\n\nHow do you pressure-test your own ideas?',
  },
  {
    id: 'p3',
    topic: 'Leadership',
    hook: 'Your team doesn\u2019t need more meetings. It needs sharper defaults.',
    body: 'Your team doesn\u2019t need more meetings. It needs sharper defaults.\n\nEvery recurring sync is a tax on focus. Before I add one, I ask: could a written default replace this entirely?\n\nThe teams that ship fastest have fewer decisions in flight \u2014 not because they decide less, but because they decided once and wrote it down.\n\nWhat\u2019s one meeting you could replace with a doc this week?',
  },
]
