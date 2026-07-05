"use client"

import { useState, useTransition } from "react"
import { PenLine, Copy, Check, Trash2, Plus, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  saveCoverLetterToLibrary,
  deleteCoverLetterFromLibrary,
  type CoverLetterEntry,
} from "@/lib/actions"

interface CoverLetterLibraryProps {
  initialLetters: CoverLetterEntry[]
}

export function CoverLetterLibrary({ initialLetters }: CoverLetterLibraryProps) {
  const [letters, setLetters] = useState<CoverLetterEntry[]>(initialLetters)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const editingLetter = letters.find((l) => l.id === editingId) ?? null

  const updateField = (id: string, patch: Partial<CoverLetterEntry>) => {
    setLetters((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  const handleSave = (id: string) => {
    const letter = letters.find((l) => l.id === id)
    if (!letter) return
    startTransition(async () => {
      try {
        await saveCoverLetterToLibrary({ id: letter.id, name: letter.name, text: letter.text, matchId: letter.matchId })
        toast.success("Cover letter saved")
        setEditingId(null)
      } catch {
        toast.error("Failed to save")
      }
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteCoverLetterFromLibrary(id)
        setLetters((prev) => prev.filter((l) => l.id !== id))
        if (editingId === id) setEditingId(null)
        toast.success("Cover letter deleted")
      } catch {
        toast.error("Failed to delete")
      }
    })
  }

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      toast.error("Failed to copy")
    }
  }

  const handleAddNew = () => {
    const id = `cl-${Date.now()}`
    const newEntry: CoverLetterEntry = {
      id,
      userId: "default",
      name: "New Cover Letter",
      text: "",
      updatedAt: new Date(),
    }
    setLetters((prev) => [newEntry, ...prev])
    setEditingId(id)
  }

  // Full editing view
  if (editingId && editingLetter) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setEditingId(null)}>
            <X className="size-4" data-icon="inline-start" /> Cancel
          </Button>
          <Button size="sm" onClick={() => handleSave(editingId)} disabled={isPending}>
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Cover letter name</label>
            <Input
              value={editingLetter.name}
              onChange={(e) => updateField(editingId, { name: e.target.value })}
              placeholder="e.g. Linear Cover Letter, AI Lead — Series B"
              className="font-medium"
            />
          </div>

          <Textarea
            value={editingLetter.text}
            onChange={(e) => updateField(editingId, { text: e.target.value })}
            placeholder="Paste or type your cover letter here..."
            className="min-h-[520px] resize-y font-sans text-sm leading-relaxed"
            autoFocus
          />
          <p className="text-xs text-muted-foreground tabular-nums">{editingLetter.text.length.toLocaleString()} characters</p>
        </div>
      </div>
    )
  }

  // Library list view
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Save cover letters here to reuse across applications. Each one can be named and applied to any match.
        </p>
        <Button size="sm" variant="outline" onClick={handleAddNew}>
          <Plus data-icon="inline-start" /> Add cover letter
        </Button>
      </div>

      {letters.length === 0 && (
        <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-accent">
            <PenLine className="size-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No saved cover letters yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Cover letters are auto-saved here when you edit them on a match, or click &quot;Add cover letter&quot; to start a new one.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={handleAddNew}>
            <Plus data-icon="inline-start" /> Add cover letter
          </Button>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {letters.map((letter) => (
          <Card key={letter.id} className="flex flex-col gap-0 p-0">
            <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="truncate text-sm font-semibold text-foreground">{letter.name || "Untitled"}</p>
                {letter.matchId && (
                  <Badge variant="secondary" className="w-fit text-xs">From match</Badge>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => handleCopy(letter.id, letter.text)}
                >
                  {copiedId === letter.id ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => setEditingId(letter.id)}
                >
                  <PenLine className="size-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(letter.id)}
                  disabled={isPending}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            <div className="border-t border-border px-5 pb-4 pt-3">
              <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                {letter.text || <span className="italic">No content yet — click the edit button to add text.</span>}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
