import type { NextRequest } from "next/server"

import { updateSession } from "@/lib/supabase/middleware"

// Next.js 16 renamed the `middleware.ts` file convention to `proxy.ts` (the
// `middleware` export/name is deprecated); this project's session-refresh
// logic already existed in lib/supabase/middleware.ts but was never wired
// into an actual entry point, so it never ran. This file is that entry
// point. Runs on every request except static assets/images/favicon - see
// the matcher below.
export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, and common static asset extensions
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
