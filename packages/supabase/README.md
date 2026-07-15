# @workspace/supabase

Workspace-shared Supabase glue (ARCHITECTURE.md section 3.2). Presentation-free:
client factories, cookie plumbing, and service-role helpers only. Product policy
(route protection, redirects, scoping) stays in each app.

## Exports

- `@workspace/supabase/client`: `createSupabaseBrowserClient<Database>()`
- `@workspace/supabase/server`: `createSupabaseServerClient<Database>(options?)`
- `@workspace/supabase/admin`: `createSupabaseAdminClient<Database>(key?)`, `resolveSupabaseServiceRoleKey()`
- `@workspace/supabase/middleware`: `createSupabaseMiddlewareClient<Database>(request)`, `copySessionCookies(source, target)`

## Usage pattern

Each app keeps thin shims in `utils/supabase/` that bind its own generated
`Database` type and preserve its established export names, so app call sites
never import this package directly for the common paths:

```ts
// apps/<product>/utils/supabase/server.ts
import { createSupabaseServerClient } from "@workspace/supabase/server";
import type { Database } from "@/types/supabase";

export async function createServerClient() {
  return createSupabaseServerClient<Database>();
}
```

Required env vars: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`, and for admin clients
`SUPABASE_ADMIN_KEY` or `SUPABASE_SERVICE_ROLE_KEY`.
