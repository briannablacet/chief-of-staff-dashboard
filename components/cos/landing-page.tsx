import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  Briefcase,
  FileText,
  Gauge,
  Globe,
  Layers,
  Network,
  PenLine,
  Users,
} from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const capabilities = [
  {
    title: 'Market scanning',
    description:
      'Agents continuously pull roles from job boards and career pages, then dedupe and structure them for scoring.',
    icon: Globe,
  },
  {
    title: 'Fit scoring & cover letters',
    description:
      'Each role is scored against your résumé, preferences, and dealbreakers — with draft cover letters ready to edit.',
    icon: Gauge,
  },
  {
    title: 'Application pipeline',
    description:
      'Track matches, mark applied, manage résumé versions, and keep ATS-ready materials in one place.',
    icon: Briefcase,
  },
  {
    title: 'Network & brand',
    description:
      'Surface warm intro paths at dream companies and generate LinkedIn posts that build visibility while you search.',
    icon: Network,
  },
]

const architecture = [
  {
    title: 'Orchestration layer',
    description:
      'A daily command center plus scheduled jobs coordinate what each agent works on and what surfaces for review.',
  },
  {
    title: 'Specialist agents',
    description:
      'Scraper, Scorer, Networking, and Thought Leadership agents each own a narrow job — scan, score, connect, or draft.',
  },
  {
    title: 'Human-in-the-loop',
    description:
      'Agents prepare work product; you approve outreach, edit cover letters, and decide what to apply to.',
  },
  {
    title: 'Persistent memory',
    description:
      'Matches, directives, résumés, and drafts live in a durable store so the system improves across runs.',
  },
]

const agents = [
  {
    name: 'Web Scraper Agent',
    role: 'Scanning LinkedIn, Indeed, and career pages',
    detail: 'Finds and structures new listings matched to your target titles and locations.',
    icon: Globe,
  },
  {
    name: 'Resume Scorer Agent',
    role: 'Matching & filtering criteria',
    detail: 'Scores each role 0–100 against your résumé, salary floor, work model, and anti-list.',
    icon: Gauge,
  },
  {
    name: 'Networking Agent',
    role: 'Checking dream companies',
    detail: 'Maps warm intro paths and drafts outreach notes for your approval.',
    icon: Users,
  },
  {
    name: 'Thought Leadership Agent',
    role: 'Generating LinkedIn post ideas',
    detail: 'Produces concise, opinionated drafts that build authority in your target field.',
    icon: PenLine,
  },
]

function LaunchButton({ className }: { className?: string }) {
  return (
    <Link
      href="/sign-in"
      className={cn(buttonVariants({ size: 'lg' }), 'h-10 px-4 text-sm', className)}
    >
      Launch App
      <ArrowRight className="size-4" />
    </Link>
  )
}

export function LandingPage() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b border-border/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Layers className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">Chief of Staff</p>
              <p className="text-[11px] text-muted-foreground">AI Career Operating System</p>
            </div>
          </div>
          <LaunchButton />
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-6 pb-16 pt-14 md:pt-20">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Agentic career platform
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-balance md:text-5xl">
            Chief of Staff
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            An autonomous AI chief of staff for your job search — agents scan the market, score
            matches, draft cover letters, map warm intros, and queue thought leadership while you
            stay in control.
          </p>
          <div className="mt-8">
            <LaunchButton />
          </div>
        </section>

        <section id="what-it-does" className="border-t border-border/80 bg-card/40">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              What it does
            </h2>
            <p className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight text-balance">
              A daily operating system for finding, evaluating, and applying to the right roles.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {capabilities.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-border bg-background/60 p-5"
                >
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary">
                    <item.icon className="size-4" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="architecture" className="border-t border-border/80">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Architecture
            </h2>
            <p className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight text-balance">
              Multi-agent workflow with a human review loop.
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Specialist agents run on a schedule, write results into shared state, and hand off
              only the work worth your attention — matches to review, letters to edit, intros to
              approve.
            </p>
            <ol className="mt-10 grid gap-4 md:grid-cols-2">
              {architecture.map((step, index) => (
                <li
                  key={step.title}
                  className="rounded-xl border border-border bg-card/50 p-5"
                >
                  <span className="font-mono text-xs text-primary">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-2 text-base font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="screenshots" className="border-t border-border/80 bg-card/40">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Screenshots
            </h2>
            <p className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight text-balance">
              Your command center.
            </p>

            <figure className="mt-10 overflow-hidden rounded-xl border border-border bg-background shadow-2xl shadow-black/30">
              <Image
                src="/landing/dashboard.png"
                alt="Chief of Staff dashboard with daily digest and agent status"
                width={1600}
                height={1000}
                className="h-auto w-full"
                priority
              />
              <figcaption className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
                Dashboard — daily digest of scored matches plus live agent status.
              </figcaption>
            </figure>

            <figure className="mt-6 overflow-hidden rounded-xl border border-border bg-background shadow-2xl shadow-black/30">
              <Image
                src="/landing/match-detail.png"
                alt="Match detail with score breakdown, ATS score, and generated cover letter"
                width={1600}
                height={1000}
                className="h-auto w-full"
              />
              <figcaption className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
                Match detail — score breakdown, ATS compatibility, and editable cover letter.
              </figcaption>
            </figure>
          </div>
        </section>

        <section id="agents" className="border-t border-border/80">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              The agents
            </h2>
            <p className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight text-balance">
              Four specialists, one operating system.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {agents.map((agent) => (
                <div
                  key={agent.name}
                  className="rounded-xl border border-border bg-card/50 p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                      <agent.icon className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">{agent.name}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">{agent.role}</p>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {agent.detail}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border/80 bg-card/40">
          <div className="mx-auto flex max-w-5xl flex-col items-start gap-6 px-6 py-16 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Ready to open the app?</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Sign in to run agents, review matches, and manage your application pipeline.
              </p>
            </div>
            <LaunchButton />
          </div>
        </section>
      </main>

      <footer className="border-t border-border/80">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-sm text-muted-foreground">
          <p>Chief of Staff — built by Brianna Blacet</p>
          <div className="flex items-center gap-4">
            <Link href="https://www.briannasnirvana.com" className="hover:text-foreground">
              Portfolio
            </Link>
            <Link href="/sign-in" className="inline-flex items-center gap-1 hover:text-foreground">
              <FileText className="size-3.5" />
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
