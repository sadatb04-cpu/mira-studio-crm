import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { LoginForm } from "@/app/(auth)/login/login-form"
import { LoginBrandMark, LoginHeading } from "@/app/(auth)/login/login-brand"

export default function LoginPage() {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6">
      <LoginBrandMark />

      <Card className="w-full">
        <CardHeader className="text-center sm:text-center">
          <LoginHeading />
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  )
}
