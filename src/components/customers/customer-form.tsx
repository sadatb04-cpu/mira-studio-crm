"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createCustomer, updateCustomer } from "@/app/actions/customers"
import type { CustomerDetail } from "@/types/customer"

type CustomerFormProps = { mode: "create"; customer?: undefined } | { mode: "edit"; customer: CustomerDetail }

export function CustomerForm(props: CustomerFormProps) {
  const { mode, customer } = props

  const [fullName, setFullName] = useState(customer?.full_name ?? "")
  const [email, setEmail] = useState(customer?.email ?? "")
  const [phone, setPhone] = useState(customer?.phone ?? "")
  const [country, setCountry] = useState(customer?.country ?? "")
  const [notes, setNotes] = useState(customer?.notes ?? "")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    const input = {
      full_name: fullName,
      email: email || undefined,
      phone: phone || undefined,
      country: country || undefined,
      notes: notes || undefined,
    }

    startTransition(async () => {
      const result = mode === "create" ? await createCustomer(input) : await updateCustomer(customer.id, input)

      // On success the action redirects server-side, so we only ever reach
      // here when it failed.
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="full_name">
          Full Name<span className="text-destructive">*</span>
        </Label>
        <Input id="full_name" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="country">Country</Label>
        <Input id="country" value={country} onChange={(event) => setCountry(event.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={4}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          placeholder="Optional notes about this customer..."
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving..." : mode === "create" ? "Create Customer" : "Save Changes"}
      </Button>
    </form>
  )
}
