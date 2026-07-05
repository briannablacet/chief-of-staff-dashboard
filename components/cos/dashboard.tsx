"use client"

import { useState } from "react"
import { Menu, Bell, Search } from "lucide-react"
import { AppSidebar, type ViewKey } from "@/components/cos/app-sidebar"
import { CommandCenter } from "@/components/cos/command-center"
import { StaffOrganization } from "@/components/cos/staff-organization"
import { Directives } from "@/components/cos/directives"
import { Matches } from "@/components/cos/matches"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import type { DirectivesDoc, AgentDoc, MatchDoc } from "@/lib/actions"

const TITLES: Record<ViewKey, string> = {
  command: "Command Center",
  staff: "Staff Organization",
  directives: "Directives & Criteria",
  matches: "Matches & Outreach",
}

interface DashboardProps {
  initialDirectives: DirectivesDoc | null
  initialAgentConfigs: AgentDoc[]
  initialMatches: MatchDoc[]
}

export function Dashboard({ initialDirectives, initialAgentConfigs, initialMatches }: DashboardProps) {
  const [view, setView] = useState<ViewKey>("command")
  const [mobileNav, setMobileNav] = useState(false)
  const [directivesTab, setDirectivesTab] = useState<string | undefined>(undefined)

  const navigate = (v: ViewKey) => {
    setView(v)
    setMobileNav(false)
  }

  const goToProfile = () => {
    setDirectivesTab("resume")
    setView("directives")
    setMobileNav(false)
  }

  return (
    <div className="flex min-h-svh bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-svh w-72 shrink-0 border-r border-sidebar-border lg:block">
        <AppSidebar
          active={view}
          onNavigate={navigate}
          profileName={initialDirectives?.name}
          profileHeadline={initialDirectives?.headline}
          onProfileClick={goToProfile}
        />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileNav} onOpenChange={setMobileNav}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <AppSidebar
            active={view}
            onNavigate={navigate}
            profileName={initialDirectives?.name}
            profileHeadline={initialDirectives?.headline}
            onProfileClick={goToProfile}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation"
            onClick={() => setMobileNav(true)}
          >
            <Menu />
          </Button>
          <h1 className="text-sm font-semibold text-foreground md:text-base">
            {TITLES[view]}
          </h1>
          <div className="ml-auto flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Search"
              className="text-muted-foreground"
            >
              <Search />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Notifications"
              className="relative text-muted-foreground"
            >
              <Bell />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-primary ring-2 ring-background" />
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6">
          {view === "command" && <CommandCenter onNavigate={navigate} />}
          {view === "staff" && (
            <StaffOrganization initialAgentConfigs={initialAgentConfigs} />
          )}
          {view === "directives" && (
            <Directives
              initialDirectives={initialDirectives}
              defaultTab={directivesTab}
            />
          )}
          {view === "matches" && <Matches initialMatches={initialMatches} />}
        </main>
      </div>
    </div>
  )
}
