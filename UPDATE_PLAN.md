# Node Modules Update Plan

**Date:** 2026-02-22
**Current Bun version:** 1.3.9

---

## Summary

Analysis of all 6 package.json files in the monorepo. Found **28 unique outdated dependencies** across packages.

### Risk Categories

| Risk | Count | Description |
|------|-------|-------------|
| Safe (patch/minor within range) | 20 | Resolved by `bun update`, no package.json changes needed |
| Pinned version bumps | 5 | Require manual package.json edits |
| Major version changes | 3 | Require migration analysis and testing |

---

## Phase 1: Safe Patch/Minor Updates (Low Risk)

These packages have `^` ranges that already cover the latest version. Running `bun update` in each package will resolve them.

### Root (`/`)
| Package | Current | Latest | Type |
|---------|---------|--------|------|
| @types/bun | 1.3.5 | 1.3.9 | dev |

### SDK (`packages/sdk`)
| Package | Current | Latest | Type |
|---------|---------|--------|------|
| ky | 1.14.2 | 1.14.3 | dep |
| @types/bun | 1.3.5 | 1.3.9 | dev |

### Shared (`packages/shared`)
| Package | Current | Latest | Type |
|---------|---------|--------|------|
| ioredis | 5.8.2 | 5.9.3 | dep |
| postgres | 3.4.7 | 3.4.8 | dep |
| @types/bun | 1.3.5 | 1.3.9 | dev |

### Backend (`packages/platform/backend`)
| Package | Current | Latest | Type |
|---------|---------|--------|------|
| better-auth | 1.4.10 | 1.4.18 | dep |
| fast-xml-parser | 5.3.3 | 5.3.7 | dep |
| hono | 4.11.3 | 4.12.1 | dep |
| ioredis | 5.8.2 | 5.9.3 | dep |
| ky | 1.14.2 | 1.14.3 | dep |
| postgres | 3.4.7 | 3.4.8 | dep |
| resend | 6.6.0 | 6.9.2 | dep |
| zod | 4.3.4 | 4.3.6 | dep |
| @types/bun | 1.3.5 | 1.3.9 | dev |
| drizzle-kit | 0.31.8 | 0.31.9 | dev |

### Proxy (`packages/platform/proxy`)
| Package | Current | Latest | Type |
|---------|---------|--------|------|
| fast-xml-parser | 5.3.3 | 5.3.7 | dep |
| hono | 4.11.3 | 4.12.1 | dep |
| ky | 1.14.2 | 1.14.3 | dep |
| zod | 4.3.5 | 4.3.6 | dep |
| @types/bun | 1.3.5 | 1.3.9 | dev |

### Frontend (`packages/platform/frontend`)
| Package | Current | Latest | Type |
|---------|---------|--------|------|
| better-auth | 1.4.10 | 1.4.18 | dep |
| react-hook-form | 7.69.0 | 7.71.2 | dep |
| recharts | 3.6.0 | 3.7.0 | dep |
| tailwind-merge | 3.4.0 | 3.5.0 | dep |
| zod | 4.3.5 | 4.3.6 | dep |
| @playwright/test | 1.57.0 | 1.58.2 | dev |
| @types/react | 19.2.7 | 19.2.14 | dev |
| postgres | 3.4.7 | 3.4.8 | dev |

**Execution:**
```bash
bun update    # from monorepo root - updates all workspaces
```

---

## Phase 2: Pinned Version Bumps (Medium Risk)

These versions are pinned (no `^` prefix) or have constraints that block resolution to latest. Require manual `package.json` edits.

### Frontend (`packages/platform/frontend`)

| Package | Current (pinned) | Target | Notes |
|---------|-----------------|--------|-------|
| next | 16.0.10 | 16.1.6 | Minor release, likely safe |
| react | 19.2.1 | 19.2.4 | Patch release |
| react-dom | 19.2.1 | 19.2.4 | Patch release |
| eslint-config-next | 16.0.10 | 16.1.6 | Must match `next` version |
| lucide-react | ^0.561.0 | ^0.575.0 | Pre-1.0 semver, minor = potentially breaking |

### Frontend CF Deploy (`packages/platform/frontend/.cf-deploy`)

| Package | Current (pinned) | Target | Notes |
|---------|-----------------|--------|-------|
| next | 16.0.10 | 16.1.6 | Must match frontend |
| react | 19.2.1 | 19.2.4 | Must match frontend |
| react-dom | 19.2.1 | 19.2.4 | Must match frontend |

### Tailwind ecosystem (frontend dev)

| Package | Current | Target | Notes |
|---------|---------|--------|-------|
| tailwindcss | ^4 (4.1.18) | 4.2.0 | Within range but 4.2.0 is a significant feature release |
| @tailwindcss/postcss | ^4 (4.1.18) | 4.2.0 | Must stay in sync with tailwindcss |

**Execution:**
```bash
# In packages/platform/frontend/package.json, update:
"next": "16.1.6"
"react": "19.2.4"
"react-dom": "19.2.4"
"eslint-config-next": "16.1.6"
"lucide-react": "^0.575.0"

# In packages/platform/frontend/.cf-deploy/package.json, update:
"next": "16.1.6"
"react": "19.2.4"
"react-dom": "19.2.4"

# Then:
bun install
```

**Validation:**
- `cd packages/platform/frontend && bun run build` - verify Next.js build
- `cd packages/platform/frontend && bun run lint` - verify ESLint
- Manual smoke test of the dashboard

---

## Phase 3: Major Version Changes (High Risk)

### 3a. `fast-xml-parser` 4.x → 5.x (`packages/shared`)

| Detail | Value |
|--------|-------|
| Package | `packages/shared` |
| Current constraint | `^4.5.3` (installed: 4.5.3) |
| Target | `^5.3.7` |
| Breaking change | Yes - major version |

**Context:** Backend and proxy already use `fast-xml-parser@^5.3.3`. Only `shared` is still on v4. This creates a version inconsistency in the monorepo.

**Key v5 breaking changes:**
- API changes in parser/builder constructors
- Changed option names
- Different handling of attributes and text nodes

**Action required:**
1. Audit `packages/shared/` for `fast-xml-parser` usage patterns
2. Update imports and API calls to v5 syntax
3. Update `package.json`: `"fast-xml-parser": "^5.3.7"`
4. Run tests to verify XML parsing still works correctly

---

### 3b. `@types/node` 20.x → 22.x+ (root + frontend)

| Detail | Value |
|--------|-------|
| Packages | root, `packages/platform/frontend` |
| Current constraint | `^20.11.0` (root), `^20` (frontend) |
| Installed | 20.19.27 |
| Latest | 25.3.0 |

**Risk assessment:**
- Node.js types v22+ add new APIs and may deprecate/remove some type definitions
- Bun 1.3.x targets Node.js 22 API compatibility
- TypeScript `@types/node` major versions correspond to Node.js LTS releases

**Recommendation:** Update to `^22.0.0` (Node 22 LTS) rather than `^25.0.0` (Node 25 is not LTS and is current/unstable). Node 22 is the current LTS as of 2026.

**Action required:**
1. Update root `package.json`: `"@types/node": "^22.0.0"`
2. Update frontend `package.json`: `"@types/node": "^22"`
3. Run `bun run build` across all packages to check for type errors
4. Fix any type incompatibilities

---

### 3c. `eslint` 9.x → 10.x (frontend)

| Detail | Value |
|--------|-------|
| Package | `packages/platform/frontend` |
| Current constraint | `^9` (installed: 9.39.2) |
| Latest | 10.0.1 |

**Risk assessment:**
- ESLint 10 is a very new major release
- `eslint-config-next` 16.1.6 may not yet support ESLint 10
- Breaking changes in config format, rule APIs, plugin compatibility

**Recommendation:** **DO NOT update to ESLint 10 yet.** Stay on `^9` and update within range to 9.39.3. Wait for `eslint-config-next` to officially support ESLint 10.

**Action:** Update within current range only (already covered by Phase 1).

---

## Phase 4: Already Up-to-Date (No Action)

These packages are already at their latest versions:

| Package | Version | Location |
|---------|---------|----------|
| drizzle-orm | 0.45.1 | root (pinned + override) |
| drizzle-seed | 0.3.1 | backend |
| class-variance-authority | 0.7.1 | frontend |
| clsx | 2.1.1 | frontend |
| date-fns | 4.1.0 | frontend |
| next-themes | 0.4.6 | frontend |
| sonner | 2.0.7 | frontend |
| @hookform/resolvers | 5.2.2 | frontend |
| @radix-ui/* | (all current) | frontend |
| typescript | ^5.3.3 (5.9.3) | all |
| tsup | ^8.0.1 (8.5.1) | root, sdk |

---

## Recommended Execution Order

```
1. Phase 1  →  bun update (safe, all packages)
2. Phase 3a →  fast-xml-parser v4→v5 in shared
3. Phase 2  →  Pinned version bumps (next, react, lucide-react, etc.)
4. Phase 3b →  @types/node 20→22
5. Phase 3c →  SKIP (eslint 10 - wait for ecosystem)
```

After each phase: `bun run build` + `bun test` to validate.

---

## Version Inconsistencies to Fix

| Package | shared | backend | proxy | Issue |
|---------|--------|---------|-------|-------|
| fast-xml-parser | ^4.5.3 | ^5.3.3 | ^5.3.3 | Major version mismatch |

After Phase 3a, all packages will be aligned on fast-xml-parser v5.

---

## Risk Summary

| Update | Risk | Effort | Recommendation |
|--------|------|--------|---------------|
| `bun update` (Phase 1) | Low | Low | Do it |
| next 16.0→16.1 | Low | Low | Do it |
| react 19.2.1→19.2.4 | Low | Low | Do it |
| lucide-react 0.561→0.575 | Low-Medium | Low | Do it, check icon renames |
| fast-xml-parser 4→5 | Medium | Medium | Do it (aligns with backend/proxy) |
| @types/node 20→22 | Medium | Low-Medium | Do it |
| tailwindcss 4.1→4.2 | Low-Medium | Low | Do it |
| eslint 9→10 | High | High | Skip for now |
