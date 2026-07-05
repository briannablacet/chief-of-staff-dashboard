"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Terminal, Target } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { agents, type AgentKey } from "@/lib/cos-data"
import { saveAgentConfig, type AgentDoc } from "@/lib/actions"

interface StaffOrganizationProps {
  initialAgentConfigs: AgentDoc[]
}

export function StaffOrganization({ initialAgentConfigs }: StaffOrganizationProps) {
  // Build initial enabled state: prefer DB value, fall back to true (active)
  const [paused, setPaused] = useState<Record<AgentKey, boolean>>(() => {
    const map: Record<string, boolean> = {}
    for (const cfg of initialAgentConfigs) {
      map[cfg.agentId] = !cfg.enabled
    }
    return {
      scraper: map["scraper"] ?? false,
      scorer: map["scorer"] ?? false,
      networking: map["networking"] ?? false,
      thought: map["thought"] ?? false,
    }
  })

  const [pending, startTransition] = useTransition()

  const toggle = (key: AgentKey, name: string) => {
    const nextPaused = !paused[key]
    setPaused((prev) => ({ ...prev, [key]: nextPaused }))

    startTransition(async () => {
      try {
        await saveAgentConfig(key, { enabled: !nextPaused })
        toast(nextPaused ? `${name} paused` : `${name} resumed`, {
          description: nextPaused
            ? "This agent has stopped taking new actions."
            : "This agent is back to work.",
        })
      } catch {
        // Roll back optimistic update
        setPaused((prev) => ({ ...prev, [key]: !nextPaused }))
        toast.error("Failed to save — check your MongoDB connection")
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Staff Organization</h1>
        <p className="text-sm text-muted-foreground">
          Manage your four sub-agents, review their instructions, and tune
          performance.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {agents.map((agent) => {
          const Icon = agent.icon
          const isPaused = paused[agent.key]
          return (
            <Card key={agent.key}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <CardTitle className="text-base">{agent.name}</CardTitle>
                      <CardDescription>{agent.role}</CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={isPaused ? "gap-1.5 text-warning" : "gap-1.5 text-success"}
                  >
                    <span className="relative flex size-2">
                      {!isPaused && (
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-70" />
                      )}
                      <span
                        className={
                          isPaused
                            ? "relative inline-flex size-2 rounded-full bg-warning"
                            : "relative inline-flex size-2 rounded-full bg-success"
                        }
                      />
                    </span>
                    {isPaused ? "Paused" : "Active"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Terminal className="size-3.5" />
                    System Instructions
                  </div>
                  <p className="rounded-lg border border-border bg-background/50 p-3 font-mono text-xs leading-relaxed text-muted-foreground">
                    {agent.systemPrompt}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                      <Target className="size-3.5" />
                      Accuracy score
                    </span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {agent.accuracy}%
                    </span>
                  </div>
                  <Progress value={agent.accuracy} />
                </div>

                <Separator />

                <div className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2.5">
                  <Label
                    htmlFor={`toggle-${agent.key}`}
                    className="flex flex-col gap-0.5"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {isPaused ? "Resume Agent" : "Pause Agent"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {isPaused ? "Currently idle" : "Running autonomously"}
                    </span>
                  </Label>
                  <Switch
                    id={`toggle-${agent.key}`}
                    checked={!isPaused}
                    disabled={pending}
                    onCheckedChange={() => toggle(agent.key, agent.name)}
                  />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
