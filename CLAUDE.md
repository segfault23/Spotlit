# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Spotlit is a SvelteKit 5 web app for tabletop RPG game masters — a combat tracker and campaign management tool. It serves two audiences via two domains:

- **spotlit.online** — GM view: encounter tracker, campaign/character management, content catalogue
- **player.spotlit.online** — Player view: character sheet display and play

## Commands

```bash
# Local dev (Vite HMR)
npm run dev

# Production build (outputs to build/, copies lambda.mjs)
npm run build

# Lint (ESLint + svelte plugin)
npm run lint

# CDK infrastructure (from cdk/)
cd cdk && npx cdk deploy SpotlitCdkStack --require-approval never
```

There is no test suite for the SvelteKit frontend. The CDK package has Jest tests (`cdk/jest.config.js`), run via `cd cdk && npm test`.

## Local Development Setup

Copy `.env.example` to `.env` and set:

- `DEV_USER=dev-local-001:dev@local:Dev User` — bypasses Cognito entirely; the `sub` value is the DynamoDB partition key, so keep it consistent across sessions
- `CONTENT_TABLE` — DynamoDB table name from CDK output `SpotlitCdkStack.ContentTableName`
- AWS credentials via `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` or `AWS_PROFILE`

When `DEV_USER` is set, `hooks.server.js` short-circuits all JWT verification and sets `locals.user` directly.

### Testing Auth-Protected Routes

`DEV_USER` only works in local dev — it is never set in the production Lambda environment, so `spotlit.online` always runs full Cognito JWT verification. There is no way to bypass auth on the deployed site without a real `id_token` cookie from an actual Cognito/Google login.

With `DEV_USER` set locally, all auth guards pass automatically. The following routes require auth:

- `/characters`, `/characters/[id]`, `/characters/[id]/play`
- `/campaigns/[id]`, `/campaigns/[id]/characters/*`
- `/player/*` (guarded in `src/routes/player/+layout.server.js`)
- `/profile`, `/profile/adversaries/*`, `/profile/features/*`
- `/join/[code]`
- All `/api/*` endpoints

**Testing the player subdomain locally:**

Player subdomain detection reads `x-forwarded-host` (set by CloudFront Functions in production) and falls back to `event.url.hostname`. Locally that resolves to `localhost`, so `locals.isPlayerDomain` is always `false`.

Two options:

1. **Direct URL** — navigate to `http://localhost:5173/player`; routes work without the subdomain flag. Only the auto-redirect from `/` and any UI conditioned on `isPlayerDomain` won't fire.
2. **Full simulation** — add `127.0.0.1 player.localhost` to `/etc/hosts`, then visit `http://player.localhost:5173`. This makes `event.url.hostname` start with `player.` so full subdomain behaviour activates.

**Testing the deployed site while authenticated:** if you log in via a browser and pass the `id_token` cookie value, it can be attached as a `Cookie` header in `WebFetch` calls to hit authenticated endpoints on `spotlit.online` for the token's ~1 hour validity.

## Architecture

### Runtime Stack

SvelteKit (adapter-node) built to `build/`, then deployed as an **AWS Lambda Function URL** via `lambda.mjs` — a custom handler (not serverless-http) that serves static assets from `build/client/`, prerendered pages from `build/prerendered/`, and SSR via SvelteKit's `Server.respond`. CloudFront sits in front with caching disabled for all routes except `/_app/immutable/*`.

A CloudFront Functions snippet copies the `host` header to `x-forwarded-host` before forwarding to Lambda (CloudFront strips `host`). `hooks.server.js` reads `x-forwarded-host` to detect the player subdomain.

Lambda runtime deps are minimal: only `aws-jwt-verify` is needed (AWS SDK v3 is provided by the Lambda runtime). `lambda-deps.json` is copied to `build/package.json` and installed during CI.

### Database — Single DynamoDB Table

Everything lives in one table (`CONTENT_TABLE`). Key shapes:

| Entity | pk | sk | gsi1pk | gsi1sk |
|---|---|---|---|---|
| Pre-made feature | `FEATURE#<slug>` | `META` | `feature` | display name |
| Pre-made creature | `CREATURE#<slug>` | `META` | `creature` | display name |
| Pre-made item | `ITEM#<slug>` | `META` | `item` | display name |
| Ancestry/Community/Subclass/Domain | `<TYPE>#<slug>` | `META` | entity type | display name |
| Encounter | `USER#<sub>` | `ENCOUNTER#<iso>#<uuid8>` | — | — |
| Campaign | `USER#<gmSub>` | `CAMPAIGN#<iso>#<uuid8>` | `JOINCODE#<code>` | `META` |
| Character | `USER#<sub>` | `CHARACTER#<iso>#<uuid8>` | `CAMPAIGN#<code>` (if in campaign) | char name |
| Custom creature | `USER#<sub>` | `CUSTOM_CREATURE#<slug>` | — | — |
| Custom feature | `USER#<sub>` | `CUSTOM_FEATURE#<slug>` | — | — |
| Custom item | `USER#<sub>` | `CUSTOM_ITEM#<slug>` | — | — |
| Roster | `USER#<sub>` | `PROFILE#ROSTER` | — | — |

`gsi1` (partition: `gsi1pk`, sort: `gsi1sk`) is used to: list all pre-made content by entity type alphabetically; look up campaigns by join code; list all characters in a campaign.

### Server-Side Data Layer

Two separate modules under `src/lib/server/` (never bundled to the client):

- **`content.js`** — Read-only access to pre-made content (features, creatures, ancestries, etc.). Uses module-level promise caching so warm Lambda instances skip DynamoDB entirely after the first request. Each entity type has a `list*()` function and optionally a `get*(slug)` function.
- **`user.js`** — Per-user mutable data (encounters, campaigns, characters, custom creatures/features/items, roster). All functions take `sub` (Cognito user ID) as the first argument. Slugification is name-based: renaming an entity deletes the old key and creates a new one.

### Catalog Loading Pattern

`src/routes/+layout.server.js` fetches the full pre-made catalogue plus any user-specific custom content on every request. It merges them into two maps:

- `featuresByName` — keyed by display name; custom items shadow pre-made items on name collision
- `presetsByName` — same pattern for adversary presets

Child `+page.server.js` files call `await parent()` to access these merged maps without re-querying DynamoDB.

These maps are seeded into Svelte stores (`src/lib/stores/catalog.js`) from `+layout.svelte` via `$effect()`, making them available to all components.

### Inventory & Items

The item catalogue (SRD weapons/armor/consumables/utility + a user's custom items) lives in DynamoDB and is read via `content.js` `listItems()` (catalogue) and `user.js` `listCustomItems()` (custom). The `/api/items` endpoint returns the merged, filterable list; `/api/items/[slug]` does CRUD on custom items.

- **`src/lib/items.js`** is the shared, client-safe inventory module (categories, equip rules, and the schema). A character stores a self-contained snapshot of each owned item in `character.items[]` (like domain cards), so views never re-join against the catalogue. `normalizeItem()` tolerates the legacy free-text shape (`type`/`damage`).
- **Categories:** `weapon` (primary/secondary slots, two-handed occupies both), `armor` (one active at a time), `consumable` (quantity + "Use"), `utility`.
- **Auto-apply via derivation:** `deriveStats(char)` folds equipped gear into effective Evasion, Armor Score, damage thresholds (armor base + level), trait totals, and attack profiles. Stored `evasion`/`armorSlots`/`thresholds` remain the manual base; gear adds on top. The character sheet, play view, and player view all display derived values; `setEquipped()` enforces the slot rules.
- **`InventoryManager.svelte`** is the shared editor (catalogue browser + custom add + equip toggles + derived summary), used by both the creation wizard's Equipment step and the sheet's Equipment tab.

Seed the catalogue with `node cdk/scripts/seed-items.mjs`. It reads `cdk/scripts/seed-items.local.mjs` (gitignored — your private copy of the SRD tables) and falls back to the committed `seed-items.example.mjs` sample. Generate the local file from the SRD markdown with `node cdk/scripts/items-from-srd.mjs <compendium.md>`.

### Authentication

Cognito OAuth 2.0 authorization code grant with Google as identity provider. The client secret is **never** in env vars — Lambda fetches it once from `cognito-idp:DescribeUserPoolClient` and caches it in `auth.js` for process lifetime.

OAuth state uses HMAC-signed tokens instead of cookies (CloudFront's cache policy was stripping `Set-Cookie` headers during the login flow).

`hooks.server.js` validates the `id_token` cookie on every request and silently refreshes via `refresh_token` when the ID token has expired. On failure, both cookies are cleared.

`locals.user` shape: `{ sub, email, name }` — or `null` when unauthenticated.

### Svelte Stores

| Store | Location | Purpose |
|---|---|---|
| `encounter` | `stores/encounter.js` | Full encounter state + autosave logic. Autosaves 1.2s after changes, serializes in-flight saves. |
| `saveStatus` | `stores/encounter.js` | `'idle' \| 'saving' \| 'saved' \| 'error'` — displayed in the encounter header. |
| `featuresByName` | `stores/catalog.js` | Merged pre-made + custom feature catalogue. |
| `presetsByName` | `stores/catalog.js` | Merged pre-made + custom adversary presets. |
| `user` | `stores/user.js` | Auth state `{ sub, email, name } \| null`. |
| `activeModal` | `stores/modal.js` | Which modal is open (string key or null). |
| `theme` | `stores/theme.js` | Current theme key; applied as `theme-<key>` class on `body`. |
| `roster` | `stores/roster.js` | Saved characters list fetched from `/api/roster`. |

### Route Structure

```
/                          GM combat tracker (main encounter view)
/campaigns                 Campaign list and creation
/campaigns/[id]            Campaign detail (GM view, character list)
/campaigns/[id]/characters/new   Create character in campaign context
/campaigns/[id]/characters/[charId]  Edit character in campaign
/characters                Standalone character list
/characters/[id]           Character sheet (edit)
/characters/[id]/play      Play view (read-optimized)
/characters/new            Create standalone character
/join/[code]               Player joins a campaign via code
/player                    Player landing (player subdomain only)
/player/[id]               Player's character view
/profile                   User profile + custom content management
/profile/adversaries/new   Create custom adversary
/profile/adversaries/[slug]  Edit custom adversary
/profile/features/new      Create custom feature
/profile/features/[slug]   Edit custom feature
/auth/login                Redirects to Cognito hosted UI
/auth/callback             Exchanges OAuth code for tokens
/auth/logout               Clears auth cookies
/api/...                   REST API endpoints (all require auth)
```

### Svelte 5 Runes

The codebase uses Svelte 5 runes syntax throughout: `$props()`, `$state()`, `$effect()`, `$derived()`. Do not use the legacy `export let` / reactive statement syntax.

## Git Workflow

This is a solo project — commit directly to `main` and push. No feature branching.

```bash
git add <files>
git commit -m "description"
git push origin main
```

Pushing to `main` triggers the GitHub Actions deploy workflow (`.github/workflows/deploy.yml`), which builds the SvelteKit app, installs Lambda deps, and runs `cdk deploy` for both stacks. The full deploy takes a few minutes.

### Verifying a Deploy

GitHub Actions workflow run results cannot be inspected directly from within this environment (no CLI or MCP tool for it). To confirm a deploy succeeded, use `WebFetch` on the live site:

- `https://spotlit.online` — GM view (should load the encounter tracker)
- `https://player.spotlit.online` — Player view (should redirect to `/player`)

A working response from either URL confirms the Lambda and CloudFront distribution are serving correctly. A 5xx or timeout indicates the deploy may have failed or the Lambda cold-started with an error.

## Tooling

- **ESLint** (`eslint.config.js`): flat config with `eslint-plugin-svelte`. `_`-prefixed variables are allowed as intentionally unused. `tracker-data.js` and `Combat Tracker.html` (legacy standalone files) are ignored.
- **Prettier** (`.prettierrc`): 2-space indent, single quotes, trailing commas, 100-char width, `prettier-plugin-svelte`.
- **Husky pre-commit**: runs `lint-staged`, which auto-fixes ESLint issues on staged `.js` and `.svelte` files.

## Infrastructure (CDK)

`cdk/` is a separate TypeScript package. Two stacks:

- **`CertStack`** (us-east-1) — ACM certificate for `spotlit.online` and `*.spotlit.online` (must be in us-east-1 for CloudFront)
- **`SpotlitCdkStack`** (eu-west-2) — Lambda, DynamoDB, Cognito User Pool, CloudFront distribution, Route 53 records

Deployment is fully automated on push to `main` via `.github/workflows/deploy.yml`. To seed pre-made content into DynamoDB after first deploy: `node cdk/scripts/seed.mjs`.

The `build/` directory must exist (i.e., `npm run build` must run first) before CDK can deploy, because the Lambda code asset comes from `build/`.

Seed scripts (run after a deploy; each discovers the table from the CloudFormation output and reads SRD data from a gitignored local file):

- `node cdk/scripts/seed.mjs` — features + creatures (from `seed-data.local.mjs`)
- `node cdk/scripts/seed-cards.mjs --data-dir <dir>` — ancestries/communities/subclasses/domains
- `node cdk/scripts/seed-items.mjs` — items (from `seed-items.local.mjs`, generated by `items-from-srd.mjs`; falls back to the committed `seed-items.example.mjs`)
