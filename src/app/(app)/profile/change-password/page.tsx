import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { ChangePasswordForm } from "@/components/profile/change-password-form"

export default function ChangePasswordPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <Link
        href="/profile"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
      >
        <ArrowLeft className="size-3.5" />
        Back to My Profile
      </Link>

      <PageHeader title="Change Password" description="Update the password for your own account." />

      <ChangePasswordForm />
    </div>
  )
}
