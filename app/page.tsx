import { getDirectives, getAgentConfigs, getMatches } from "@/lib/actions"
import { Dashboard } from "@/components/cos/dashboard"

export default async function Page() {
  const [directives, agentConfigs, matches] = await Promise.all([
    getDirectives(),
    getAgentConfigs(),
    getMatches(),
  ])

  return (
    <Dashboard
      initialDirectives={directives}
      initialAgentConfigs={agentConfigs}
      initialMatches={matches}
    />
  )
}
