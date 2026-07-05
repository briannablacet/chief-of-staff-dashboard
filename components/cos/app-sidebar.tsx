'use client'

import {
  LayoutDashboard,
  UsersRound,
  SlidersHorizontal,
  Inbox,
  Sparkles,
  PenLine,
  Bot,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export type ViewKey = 'command' | 'staff' | 'directives' | 'matches' | 'thought-leadership' | 'agents' | 'resumes'

const NAV: { key: ViewKey; label: string; sub: string; icon: typeof Inbox }[] = [
  { key: 'command',            label: 'Dashboard',              sub: 'Daily digest',          icon: LayoutDashboard },
  { key: 'matches',            label: 'Matches & Cover Letters', sub: 'Output archive',        icon: Inbox },
  { key: 'thought-leadership', label: 'Thought Leadership',     sub: 'LinkedIn post ideas',   icon: PenLine },
  { key: 'resumes',            label: 'Resumes',                sub: 'Manage your resumes',   icon: FileText },
  { key: 'directives',         label: 'Settings',               sub: 'Profile & preferences', icon: SlidersHorizontal },
  { key: 'agents',             label: 'Agent Setup',            sub: 'Configure your agents', icon: Bot },
]

export function AppSidebar({
  active,
  onNavigate,
  profileName,
  profileHeadline,
  onProfileClick,
  onNavigateToAgents,
}: {
  active: ViewKey
  onNavigate: (v: ViewKey) => void
  profileName?: string
  profileHeadline?: string
  onProfileClick?: () => void
}) {
  return (
    <nav
      aria-label="Primary"
      className="flex h-full w-full flex-col gap-6 bg-sidebar p-4"
    >
      <div className="flex items-center gap-3 px-2 pt-2">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="size-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-sidebar-foreground">Chief of Staff</p>
          <p className="text-xs text-muted-foreground">AI Career Operating System</p>
        </div>
      </div>

      <ul className="flex flex-1 flex-col gap-1">
        {NAV.map((item) => {
          const Icon = item.icon
          const isActive = active === item.key
          return (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => onNavigate(item.key)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                )}
              >
                <Icon
                  className={cn(
                    'size-5 shrink-0',
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-sidebar-foreground',
                  )}
                />
                <span className="flex flex-col">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-xs text-muted-foreground">{item.sub}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onProfileClick}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent/50"
        >
          <Avatar className="size-8 shrink-0">
            <AvatarFallback className="bg-secondary text-xs text-secondary-foreground">
              {profileName
                ? profileName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
                : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {profileName || "Set up your profile"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {profileHeadline || "Click to add details"}
            </p>
          </div>
        </button>
      </div>
    </nav>
  )
}
