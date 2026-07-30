import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

// Per-request memoization: auth.getUser() re-validates the session against
// Supabase's Auth server on every call, so calling it more than once per
// request (layout + page guard + every requireXPermission check, etc.) used
// to mean that many redundant round trips. cache() collapses all of them
// into one - same pattern as getCachedBranding() in branding.ts. Creates its
// own client internally rather than accepting one as an argument, since
// cache() keys on argument identity and every call site otherwise builds a
// different client instance (createClient() has no cache of its own).
export const getCachedUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});