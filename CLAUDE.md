# Sulod

Personal expense and savings tracker (PHP ₱) for a student/part-time earner. AI turns casual text like "jollibee 180 gcash" into a categorized entry.

Full scope, data model, AI rules and design direction live in PROJECT_CONTEXT.md, which is the source of truth:
@PROJECT_CONTEXT.md
@AGENTS.md

## Stack
- Next.js 16 App Router, TypeScript strict, Cache Components on. Route protection is `src/proxy.ts` (Next 16 renamed middleware to proxy). Check `node_modules/next/dist/docs/` before using Next APIs; this version differs from older training data.
- Tailwind CSS v4, tokens in `@theme` in `src/app/globals.css`
- Supabase (Postgres + RLS + magic-link Auth); migrations in `supabase/migrations/`
- Vercel AI SDK through AI Gateway (`src/lib/ai/models.ts`), Zod for every boundary
- Vitest for pure logic; hosted on Vercel (deploys from `main`)

## Commands
- `npm run dev` - dev server at http://localhost:3000
- `npm run lint` - ESLint
- `npm run typecheck` - `tsc --noEmit`
- `npm test` - Vitest (tests sit next to the code as `*.test.ts` in `src/lib/`)
- `npm run eval:quick-add` - quick-add evals (needs `AI_GATEWAY_API_KEY` in `.env.local`)

Run lint, typecheck and test before finishing any change.

## Where things go
- Reads: server components calling `src/lib/data.ts`
- Mutations: Server Actions in `src/app/actions.ts` (login actions in `src/app/login/actions.ts`)
- Pure logic (money, dates, safe-to-spend, afford, goals, insights): `src/lib/`, with unit tests
- Shared UI: `src/components/`; route-specific forms live next to their page in `src/app/(app)/<route>/`
- Env access: `src/lib/env.ts`; new variables also go in `.env.example`

## Rules that are easy to break
- Money is integer centavos everywhere. Format only at the UI edge with `src/lib/money.ts`. Postgres bigint arrives as a string: convert with `Number()` in the data layer.
- Dates are stored as UTC `timestamptz` and shown in Asia/Manila (`src/lib/dates.ts`). Weeks start Monday 00:00 Manila.
- Pages that read "now" or user data call `await connection()` and have a `loading.tsx`.
- The AI only parses and explains. Every number and verdict is computed in code. AI entries always go through a confirm card; never save silently.
- RLS on every table (`user_id = auth.uid()`). Schema changes go in a new migration; never edit an applied one.
- Never store card or account numbers.

## Design system
Receipt-slip look. Tokens (from `globals.css`): `paper` #F3EDE2 (background), `slip` #FFFBF4 (cards), `ink` #1E1A16, `ink-soft`, `muted` #6B6157, `rule`, `sand`, `fog`, `mango` #F2B33D, `chili` #C4421A, `dagat` #0E5A57 (sea teal), `dagat-soft`.
- Fonts: `font-display` Bricolage Grotesque (headings, amounts), `font-sans` Figtree (body), `font-mono` JetBrains Mono (labels, typed input).
- Primary inputs/buttons: 2px ink border + hard offset shadow (`shadow-hard`, `press` utility).
- Key cards use `<Zigzag />` torn edges; AI confidence and afford verdicts show as tilted stamps.
- No gradients, no emoji. UI copy in English. Touch targets at least 44px.
- Icons: `src/components/icons.tsx`. Mockups: https://claude.ai/artifact/HU38JUri2fz5UiYyVvn9KP
- UI specs from the ui-designer agent go in `docs/specs/`.
