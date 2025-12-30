# S4Kit Frontend - AI Assistant Guide

## Package Overview

The frontend is a Next.js 16 admin dashboard for managing the S4Kit platform. It provides UI for user authentication, configuring SAP systems, instances, services, API keys, and viewing request logs.

## Architecture

```
Next.js App Router Structure:
app/
├── layout.tsx          # Root layout (fonts, toaster)
├── globals.css         # Global styles (Tailwind)
├── (auth)/             # Auth route group (login, signup)
│   ├── layout.tsx      # Auth layout (centered)
│   ├── login/          # Login page
│   ├── signup/         # Signup page
│   └── forgot-password/ # Password reset
└── (dashboard)/        # Dashboard route group
    ├── layout.tsx      # Sidebar + main content
    ├── page.tsx        # Dashboard home
    ├── systems/        # System management
    ├── services/       # Global services
    ├── api-keys/       # API key management
    ├── logs/           # Request logs
    └── settings/       # User/org settings
```

## File Structure

```
app/
├── layout.tsx                    # Root layout
├── globals.css                   # Tailwind global styles
├── icon.svg                      # Favicon
├── apple-icon.svg                # Apple touch icon
├── (auth)/
│   ├── layout.tsx                # Auth layout
│   ├── login/page.tsx            # Login page
│   ├── signup/page.tsx           # Signup page
│   └── forgot-password/page.tsx  # Password reset
└── (dashboard)/
    ├── layout.tsx                # Dashboard layout with sidebar
    ├── page.tsx                  # Dashboard home page
    ├── loading.tsx               # Loading skeleton
    ├── systems/
    │   ├── page.tsx              # Systems list
    │   ├── loading.tsx
    │   └── [id]/
    │       ├── page.tsx          # System detail
    │       ├── loading.tsx
    │       ├── services/[serviceId]/page.tsx
    │       └── instance-services/[instanceServiceId]/page.tsx
    ├── services/
    │   ├── page.tsx              # Global services
    │   └── loading.tsx
    ├── api-keys/
    │   ├── page.tsx              # API keys list
    │   ├── loading.tsx
    │   ├── new/page.tsx          # Create API key
    │   └── [id]/
    │       ├── page.tsx          # API key detail
    │       └── edit/page.tsx     # Edit API key
    ├── logs/
    │   ├── page.tsx              # Request logs
    │   └── loading.tsx
    └── settings/
        ├── layout.tsx            # Settings layout
        ├── page.tsx              # Settings index (redirect)
        ├── profile/page.tsx      # User profile
        ├── security/page.tsx     # Password, sessions
        └── organization/page.tsx # Organization settings

components/
├── ui/                           # Shadcn UI components
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── form.tsx
│   ├── input.tsx
│   ├── select.tsx
│   ├── table.tsx
│   ├── data-table.tsx
│   ├── skeleton.tsx
│   ├── configurable-table/       # Advanced table component
│   └── ... (more UI primitives)
├── common/                       # Shared components
│   ├── page-header.tsx
│   ├── stats-card.tsx
│   └── empty-state.tsx
├── nav/
│   └── sidebar.tsx               # Navigation sidebar
├── systems/                      # System-related components
│   ├── systems-table.tsx
│   ├── system-details.tsx
│   ├── create-system-dialog.tsx
│   ├── edit-system-dialog.tsx
│   ├── create-instance-dialog.tsx
│   ├── edit-instance-dialog.tsx
│   ├── create-service-dialog.tsx
│   ├── instance-service-config-dialog.tsx
│   ├── instance-service-details.tsx
│   └── api-test-tab.tsx
├── services/                     # Service components
│   └── services-table.tsx
├── api-keys/                     # API key components
│   ├── api-key-form-page.tsx
│   ├── api-key-view-page.tsx
│   ├── instance-service-selector.tsx
│   ├── revoke-key-dialog.tsx
│   └── rotate-key-dialog.tsx
├── logs/                         # Log components
│   ├── logs-table.tsx
│   ├── logs-filters.tsx
│   └── request-logs-table.tsx
└── dashboard/
    └── request-volume-chart.tsx  # Dashboard chart

lib/
├── api.ts                        # Backend API client
├── auth-client.ts                # better-auth client
├── environment.ts                # Environment config
└── utils.ts                      # Utility functions (cn)

e2e/                              # Playwright E2E tests
├── seed-test-user.ts             # Test data seeding
└── *.spec.ts                     # Test files
```

## Development Commands

```bash
bun install           # Install dependencies
bun run dev           # Start dev server (port 3001)
bun run build         # Production build
bun run start         # Start production server
bun run lint          # Run ESLint

# E2E Testing
bun run test:e2e      # Run Playwright tests
bun run test:e2e:ui   # Interactive UI mode
bun run test:e2e:headed # Run with browser visible
bun run test:e2e:debug # Debug mode
bun run e2e:seed      # Seed test user
```

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.0.10 | React framework (App Router) |
| React | 19.2.1 | UI library |
| Tailwind CSS | 4 | Utility CSS |
| Shadcn/ui | latest | Component library |
| better-auth | 1.4.7 | Authentication client |
| React Hook Form | 7.68 | Form handling |
| Zod | 4.2 | Schema validation |
| Recharts | 3.6 | Charts |
| Lucide React | 0.561 | Icons |
| Sonner | 2.0.7 | Toast notifications |
| date-fns | 4.1 | Date formatting |
| Playwright | 1.57 | E2E testing |

## UI Component Library

Using **Shadcn/ui** with configuration in `components.json`:
- Style: `new-york`
- Base color: `neutral`
- CSS Variables: enabled
- Icons: `lucide`

### Adding new Shadcn components
```bash
bunx shadcn@latest add <component-name>
```

Components are copied to `components/ui/` and can be customized.

## Authentication

Uses better-auth client for session-based authentication:

```typescript
import { authClient } from '@/lib/auth-client';

// Sign in
await authClient.signIn.email({ email, password });

// Sign out
await authClient.signOut();

// Get session
const session = await authClient.getSession();
```

## API Client

All backend communication goes through `lib/api.ts`:

```typescript
import { api } from '@/lib/api';

// Systems
await api.systems.list();
await api.systems.get(id);
await api.systems.create({ name, type, description });
await api.systems.update(id, { name });
await api.systems.delete(id);

// Instances
await api.instances.list(systemId);
await api.instances.create({ systemId, environment, baseUrl, authType, ... });

// System Services
await api.systemServices.list(systemId);
await api.systemServices.getPredefined(systemType);

// Instance Services
await api.instanceServices.list({ instanceId });
await api.instanceServices.refreshEntities(id);

// API Keys
await api.apiKeys.list();
await api.apiKeys.create({ name, accessGrants: [...] });
await api.apiKeys.getAccess(id);

// Logs
await api.logs.list({ apiKeyId, from, to });
```

## Key Patterns

### Server Components (default)
Pages are server components by default. Use `async` functions for data fetching:

```typescript
export default async function SystemsPage() {
  const systems = await api.systems.list();
  return <SystemsTable systems={systems} />;
}
```

### Client Components
Interactive components use `'use client'` directive:

```typescript
'use client';
import { useState } from 'react';
export function CreateSystemDialog() { ... }
```

### Loading States
Each page has a `loading.tsx` with skeleton:

```typescript
export default function Loading() {
  return <TableSkeleton />;
}
```

### Form Handling
React Hook Form + Zod for type-safe forms:

```typescript
const formSchema = z.object({
  name: z.string().min(1, 'Name required'),
  type: z.enum(['s4_public', 's4_private', 'btp', 'other']),
});

const form = useForm<z.infer<typeof formSchema>>({
  resolver: zodResolver(formSchema),
});
```

### Toast Notifications
Using Sonner for toasts:

```typescript
import { toast } from 'sonner';
toast.success('System created');
toast.error('Failed to create system');
```

### Dialog Pattern
Dialogs use Shadcn Dialog with controlled state:

```typescript
const [open, setOpen] = useState(false);
<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild><Button>Open</Button></DialogTrigger>
  <DialogContent>...</DialogContent>
</Dialog>
```

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3000  # Backend URL
```

## Code Conventions

### File Naming
- kebab-case for files: `create-system-dialog.tsx`
- PascalCase for components: `CreateSystemDialog`

### Component Structure
```typescript
'use client';

import { ... } from 'react';
import { ... } from '@/components/ui/...';
import { api } from '@/lib/api';

interface Props { ... }

export function ComponentName({ prop1, prop2 }: Props) {
  // State
  const [loading, setLoading] = useState(false);

  // Handlers
  const handleSubmit = async () => { ... };

  // Render
  return ( ... );
}
```

### Imports Order
1. React/Next.js
2. Third-party libraries
3. UI components (`@/components/ui/`)
4. Feature components
5. Lib/utils (`@/lib/`)
6. Types

### Styling
- Use Tailwind utility classes
- Use `cn()` helper for conditional classes:
  ```typescript
  import { cn } from '@/lib/utils';
  <div className={cn('base-class', condition && 'conditional-class')} />
  ```

## Common Tasks

### Adding a new page
1. Create folder in `app/(dashboard)/`
2. Add `page.tsx` (server component for data fetching)
3. Add `loading.tsx` (skeleton)
4. Update sidebar navigation in `components/nav/sidebar.tsx`

### Adding a new dialog
1. Create component in `components/<feature>/`
2. Use `'use client'` directive
3. Import Shadcn Dialog primitives
4. Use React Hook Form for forms
5. Call `api.*` methods for backend

### Adding API types
1. Add interface to `lib/api.ts`
2. Add API methods to `api` object

### Adding a new Shadcn component
```bash
bunx shadcn@latest add button  # or any component name
```

### Writing E2E tests
1. Create test file in `e2e/` directory
2. Use Playwright test utilities
3. Run with `bun run test:e2e`

## Type Definitions

Key types from `lib/api.ts`:

```typescript
type SystemType = 's4_public' | 's4_private' | 'btp' | 'other';
type InstanceEnvironment = 'sandbox' | 'dev' | 'quality' | 'preprod' | 'production';

interface System { id, name, type, description, organizationId, ... }
interface Instance { id, systemId, environment, baseUrl, authType, ... }
interface SystemService { id, systemId, name, alias, servicePath, entities, ... }
interface InstanceService { id, instanceId, systemServiceId, entities, ... }
interface ApiKey { id, name, displayKey, rateLimitPerMinute, ... }
```

## Dependencies

| Package | Purpose |
|---------|---------|
| next | React framework |
| react, react-dom | UI library |
| tailwindcss | CSS framework |
| @radix-ui/* | Headless UI primitives |
| better-auth | Auth client |
| react-hook-form | Form handling |
| @hookform/resolvers | Form validation |
| zod | Schema validation |
| recharts | Charts |
| lucide-react | Icons |
| sonner | Toast notifications |
| date-fns | Date formatting |
| clsx, tailwind-merge | Class utilities |
| next-themes | Theme switching |
| @playwright/test | E2E testing |

## Bun-Specific Notes

- Use `bun run dev` for development server
- Use `bunx` instead of `npx` for CLI tools
- Bun is used as package manager (see `bun.lock`)
