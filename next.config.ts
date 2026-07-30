import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // (app)/layout.tsx reads cookies()/the auth session, which makes every
    // route under it a "dynamic" segment - the client Router Cache's default
    // staleTime for dynamic segments is 0s, meaning the shared layout (and
    // its auth/profile/permissions fetch) was being re-requested on every
    // single in-app navigation, not just the first load. This does not weaken
    // auth: server actions and page guards still re-check permissions fresh
    // on the server on every request/mutation regardless of this setting -
    // it only lets the client reuse an already-rendered layout for a short
    // window instead of asking the server to re-render it on every click.
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
