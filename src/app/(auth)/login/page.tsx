import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoginForm } from "@/app/(auth)/login/login-form"

export default function LoginPage() {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-brand-secondary text-lg font-bold text-primary-foreground shadow-lg shadow-primary/30">
        M
      </div>

      <Card className="w-full">
        <CardHeader className="text-center sm:text-center">
          <CardTitle className="text-xl">Sign in to Mira Operations</CardTitle>
          <CardDescription>Enter your credentials to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  )
}
