# Next.js App Template

This is a clean, unopinionated Next.js application template with modern tooling and patterns.

For a **per-module and per-file catalog** of this app (routes, API handlers, server layer, entities, shared components, and scripts), see the maintained reference under [`docs/code-reference/README.md`](docs/code-reference/README.md). Regenerate those pages after large refactors with `pnpm docs:code-reference:generate` from this package; verify coverage with `pnpm docs:code-reference:check`.

## Features

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Zustand** for state management
- **React Query (TanStack Query)** for data fetching
- **Supabase** for authentication and database
- **Shadcn/ui** components
- **ESLint** and **Prettier** for code quality

## Project Structure

```
app/
├── (auth)/           # Authentication routes
│   ├── auth/         # Login page
│   ├── logout/       # Logout page
│   └── layout.tsx    # Auth layout
├── (main)/           # Main application routes
│   ├── home/         # Home page
│   ├── settings/     # Settings page
│   ├── profile/      # Profile page
│   └── layout.tsx    # Main layout with sidebar
├── api/              # API routes
│   └── example/      # Example API endpoint
└── layout.tsx        # Root layout

components/
├── atoms/            # Basic UI components
├── molecules/        # Composite components
└── organisms/        # Complex components

hooks/
├── example/          # Example React Query hooks
└── use-mobile.ts     # Utility hooks

stores/
└── example-store.ts  # Example Zustand store

providers/
└── postgres/         # Database providers (if needed)
```

## Getting Started

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Set up environment variables:**

   ```bash
   cp env.example .env.local
   ```

   Update the environment variables with your Supabase credentials.

3. **Run the development server:**

   ```bash
   pnpm dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Key Patterns

### State Management with Zustand

```typescript
// stores/example-store.ts
import { create } from "zustand";

interface ExampleState {
  count: number;
  increment: () => void;
  decrement: () => void;
}

export const useExampleStore = create<ExampleState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}));
```

### Data Fetching with React Query

```typescript
// hooks/example/use-example.ts
import { useQuery, useMutation } from "@tanstack/react-query";

export const useExampleData = () => {
  return useQuery({
    queryKey: ["example"],
    queryFn: fetchExampleData,
  });
};

export const useCreateExampleData = () => {
  return useMutation({
    mutationFn: createExampleData,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["example"] });
    },
  });
};
```

### API Routes

```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  // Your GET logic here
  return NextResponse.json({ message: "Hello from API!" });
}

export async function POST(request: NextRequest) {
  // Your POST logic here
  const body = await request.json();
  return NextResponse.json(body, { status: 201 });
}
```

### API Client

```typescript
// utils/api-client.ts
import { useApiClient } from "@/utils/api-client";

export function useExampleApi() {
  const apiClient = useApiClient();

  return {
    getItems: () => apiClient.get("items"),
    getItem: (id: string) => apiClient.get("items/[id]", { id }),
    createItem: (data: any) => apiClient.post("items", data),
    updateItem: (id: string, data: any) =>
      apiClient.put("items/[id]", data, { id }),
    deleteItem: (id: string) => apiClient.delete("items/[id]", { id }),
  };
}
```

## Customization

### Adding New Pages

1. Create a new folder in `app/(main)/`
2. Add a `page.tsx` file
3. Update the sidebar navigation in `components/organisms/app-sidebar.tsx`

### Adding New API Routes

1. Create a new folder in `app/api/`
2. Add a `route.ts` file with your HTTP methods

### Adding New Stores

1. Create a new file in `stores/`
2. Follow the Zustand pattern shown in `example-store.ts`

### Adding New Hooks

1. Create a new folder in `hooks/`
2. Follow the React Query pattern shown in `hooks/example/`

## Authentication

This template includes Supabase authentication. The auth flow is handled in the `(auth)` route group.

### Setting Up Supabase Types

1. **Generate types from Supabase CLI:**

   ```bash
   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
   ```

2. **Or copy from Supabase Dashboard:**

   - Go to your Supabase project dashboard
   - Navigate to Settings > API
   - Copy the TypeScript types from the "Database types" section
   - Paste them in `types/supabase.ts`

3. **Uncomment the imports in:**
   - `utils/supabase/client.ts`
   - `utils/supabase/server.ts`
   - `utils/supabase/middleware.ts`

## Styling

The template uses Tailwind CSS with shadcn/ui components. You can customize the theme in `components.json` and add custom styles in `globals.css`.

## Deployment

This template is ready to deploy on Vercel, Netlify, or any other platform that supports Next.js.

## Contributing

Feel free to customize this template for your specific needs. The structure is designed to be scalable and maintainable.
