import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoginForm } from "@/app/(auth)/login/login-form"

interface LoginPageProps {
  searchParams: Promise<{ registered?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { registered } = await searchParams

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-lg">Sign in</CardTitle>
        <CardDescription>Sign in to Mira Operations to continue.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm registered={registered === "1"} />
      </CardContent>
    </Card>
  )
}
