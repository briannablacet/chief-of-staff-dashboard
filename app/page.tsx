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

  return (
    <Dashboard
      initialDirectives={directives}
      initialAgentConfigs={agentConfigs}
      initialMatches={matches}
      initialCoverLetters={coverLetters}
    />
  )
}
