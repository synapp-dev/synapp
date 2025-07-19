# SynApp Monorepo

A modern monorepo with Next.js, shadcn/ui, and a clean application template.

## Structure

```
synapp/
├── apps/
│   ├── template/     # Clean, unopinionated Next.js template
│   ├── portal/       # Your main application
│   └── web/          # Web application
├── packages/
│   ├── ui/           # Shared UI components (shadcn/ui)
│   ├── eslint-config/ # Shared ESLint configuration
│   └── typescript-config/ # Shared TypeScript configuration
└── create-app.js     # Script to create new apps from template
```

## Creating New Apps

Use the template to quickly create new applications:

```bash
# Create a new app from the template
node create-app.js my-new-app

# Navigate to your new app
cd apps/my-new-app

# Set up environment variables
cp env.example .env.local

# Install dependencies (if needed)
pnpm install

# Start development server
pnpm dev
```

## Template Features

The template includes:

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Zustand** for state management
- **React Query (TanStack Query)** for data fetching
- **Supabase** for authentication and database
- **Shadcn/ui** components
- **React Hook Form** with Zod validation
- **ESLint** and **Prettier** for code quality

## Adding Components

To add components to your app, run the following command at the root of your app:

```bash
pnpm dlx shadcn@latest add button -c apps/your-app-name
```

This will place the ui components in the `packages/ui/src/components` directory.

## Using Components

To use the components in your app, import them from the `ui` package:

```tsx
import { Button } from "@workspace/ui/components/button";
```

## Development

```bash
# Install dependencies
pnpm install

# Start all apps in development mode
pnpm dev

# Build all apps
pnpm build

# Lint all apps
pnpm lint
```

## Template Customization

The template is designed to be unopinionated. You can:

1. **Set up Supabase types** using the instructions in `types/supabase.ts`
2. **Uncomment auth logic** in the components when ready
3. **Replace example endpoints** in the API client with real ones
4. **Customize the UI** and add your specific business logic

See the template's README (`apps/template/README.md`) for detailed documentation.
