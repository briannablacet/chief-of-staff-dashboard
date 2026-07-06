import { getDirectives, getAgentConfigs, getMatches, getCoverLetters } from "@/lib/actions"
import { Dashboard } from "@/components/cos/dashboard"

export const dynamic = "force-dynamic"

export default async function Page() {
  const [directives, agentConfigs, matches, coverLetters] = await Promise.all([
    getDirectives(),
    getAgentConfigs(),
    getMatches(),
    getCoverLetters(),
  ])

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  const bookmarkletSecret = process.env.BOOKMARKLET_SECRET ?? "cos-import"

  return (
    <Dashboard
      initialDirectives={directives}
      initialAgentConfigs={agentConfigs}
      initialMatches={matches}
      initialCoverLetters={coverLetters}
      appUrl={appUrl}
      bookmarkletSecret={bookmarkletSecret}
    />
  )
}
