import { getDirectives, getAgentConfigs, getMatches, getCoverLetters } from "@/lib/actions"
import { Dashboard } from "@/components/cos/dashboard"
import { LandingPage } from "@/components/cos/landing-page"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export const dynamic = "force-dynamic"

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return <LandingPage />
  }

  const [directives, agentConfigs, matches, coverLetters] = await Promise.all([
    getDirectives(),
    getAgentConfigs(),
    getMatches(),
    getCoverLetters(),
  ])

  // The bookmarklet must point at the origin the user is signed in on: /capture
  // needs this origin's session cookie, and briannasnirvana.com is the portfolio
  // site (no /capture route), so a stale env var there produces a 404.
  // Prefer the request's own host; env vars are only a fallback.
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https")
  const appUrl = host
    ? `${proto}://${host}`
    : (process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "https://chief.briannasnirvana.com"))
  const bookmarkletSecret = process.env.BOOKMARKLET_SECRET ?? "cos-import"

  return (
    <Dashboard
      initialDirectives={directives}
      initialAgentConfigs={agentConfigs}
      initialMatches={matches}
      initialCoverLetters={coverLetters}
      appUrl={appUrl}
      bookmarkletSecret={bookmarkletSecret}
      user={{ name: session.user.name, email: session.user.email }}
    />
  )
}
