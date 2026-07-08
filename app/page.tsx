import { getDirectives, getAgentConfigs, getMatches, getCoverLetters } from "@/lib/actions"
import { Dashboard } from "@/components/cos/dashboard"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  const [directives, agentConfigs, matches, coverLetters] = await Promise.all([
    getDirectives(),
    getAgentConfigs(),
    getMatches(),
    getCoverLetters(),
  ])

  // VERCEL_PROJECT_PRODUCTION_URL is always the stable production domain.
  // VERCEL_URL changes per-deployment (preview URLs) — never use it for the bookmarklet.
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://briannasnirvana.com")
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
