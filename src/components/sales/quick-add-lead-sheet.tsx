"use client"

import { useRef, useState } from "react"
import { Plus, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { LEAD_SOURCES, LEAD_SOURCE_LABELS } from "@/types/lead"
import type { LeadSource } from "@/types/lead"
import type { CreateLeadInput } from "@/lib/validations/lead"

const EMPTY_FORM = { fullName: "", phone: "", email: "", source: "none" as LeadSource | "none", notes: "" }

interface QuickAddLeadSheetProps {
  // Deliberately synchronous and fire-and-forget from this component's own
  // perspective - it hands the input to the parent and immediately resets
  // for the next row. It never awaits the save, never shows a loading
  // state, and never closes itself on submit - the parent (LeadsWorkspace)
  // owns the optimistic row / retry / error lifecycle, which is what
  // renders in the list, not here. This is the one piece of the "stay open,
  // reset instantly, keep capturing" requirement that lives in this file.
  onSubmit: (input: CreateLeadInput) => void
}

export function QuickAddLeadSheet({ onSubmit }: QuickAddLeadSheetProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  function update<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit() {
    setError(null)

    if (form.fullName.trim() === "") {
      setError("Name is required.")
      return
    }
    if (form.phone.trim() === "") {
      setError("Phone / WhatsApp is required.")
      return
    }

    onSubmit({
      full_name: form.fullName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      source: form.source === "none" ? undefined : form.source,
      notes: form.notes.trim() || undefined,
    })

    // Reset and refocus immediately - do not wait for the save to resolve.
    // The next lead can be typed before this one has even reached the
    // server.
    setForm(EMPTY_FORM)
    nameInputRef.current?.focus()
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    // Enter submits from any field except the notes textarea, where Enter
    // should insert a newline - matches spreadsheet-style rapid entry
    // (type, Enter, type, Enter...) without requiring a mouse click on
    // every row.
    if (event.key === "Enter" && (event.target as HTMLElement).tagName !== "TEXTAREA") {
      event.preventDefault()
      handleSubmit()
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">
          <Plus className="size-3.5" data-icon="inline-start" />
          Add Lead
        </Button>
      </SheetTrigger>

      <SheetContent onKeyDown={handleKeyDown}>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <UserPlus className="size-4 text-primary" />
            Add Lead
          </SheetTitle>
          <SheetDescription>
            Capture the minimum you need to identify and contact this lead. Everything else can be filled in later.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lead-name">
              Name<span className="text-destructive">*</span>
            </Label>
            <Input
              id="lead-name"
              ref={nameInputRef}
              autoFocus
              value={form.fullName}
              onChange={(event) => update("fullName", event.target.value)}
              placeholder="e.g. Priya Sharma"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lead-phone">
              Phone / WhatsApp<span className="text-destructive">*</span>
            </Label>
            <Input id="lead-phone" value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+1 555 123 4567" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lead-email">Email</Label>
            <Input id="lead-email" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lead-source">Source</Label>
            <Select value={form.source} onValueChange={(value) => update("source", value as LeadSource | "none")}>
              <SelectTrigger id="lead-source">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unspecified</SelectItem>
                {LEAD_SOURCES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {LEAD_SOURCE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lead-notes">Notes</Label>
            <textarea
              id="lead-notes"
              value={form.notes}
              onChange={(event) => update("notes", event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-input backdrop-blur-sm px-3 py-2 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              placeholder="Optional"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Done
          </Button>
          <Button type="button" onClick={handleSubmit}>
            Add Lead
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
