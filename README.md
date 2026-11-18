# Sulod

Log money in seconds. Know where it goes.

Sulod is a personal expense and savings tracker for students and part-time earners in the Philippines. You type what you spent the way you'd text it ("jollibee 180", "pamasahe 20") and Sulod turns it into a categorized entry. It tracks several wallets (cash, debit, e-wallet, savings), keeps transfers out of your spending, and shows one number that matters most mid-week: how much is **safe to spend today** until your next allowance.

See [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) for the full plan, data model and design direction.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres, Auth, Row Level Security) · AI SDK + Vercel AI Gateway · Zod · Vitest

## Getting started

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (the free tier is fine).
2. **Run the migrations.** In the Supabase dashboard open SQL Editor and run each file in `supabase/migrations/` in order. (Or with the Supabase CLI: `supabase link` then `supabase db push`.)
3. **Allow the magic-link redirect.** In Authentication → URL Configuration, add `http://localhost:3000/auth/callback` to Redirect URLs.
4. **Add your keys.**
   ```bash
   cp .env.example .env.local
   # fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
   ```
5. **Run it.**
   ```bash
   npm install
   npm run dev
   ```
   Open http://localhost:3000, sign in with your email, and add your first wallet.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm test` | Unit tests for money, dates, safe-to-spend and quick-add logic |
| `npm run eval:quick-add` | Runs 20 sample lines through the real model (needs `AI_GATEWAY_API_KEY`) |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |

## How the money is kept honest

- Amounts are stored as integer centavos, never floats.
- Every table has Row Level Security (`user_id = auth.uid()`), and a trigger rejects entries that point at someone else's wallet or category.
- Transfers between your own wallets change balances but never count as spending.
- Savings wallets are left out of "safe to spend".
- The AI only reads what you type. It can only pick your own categories and wallets, amounts and dates are re-checked in code, nothing saves until you confirm, and if the AI is down the form still works.

## Status

- [x] Sign in with magic link
- [x] Wallets with live balances
- [x] Manual entries: spent, received, moved between wallets
- [x] Home: balances, safe to spend today, this week by category, recent entries
- [x] Activity: month view, filters, edit and delete
- [x] AI quick-add with confirm screen (Taglish/Cebuano aware)
- [x] Gig pay tracker: log shifts, see pay still owed, mark paid into a wallet
- [x] "Can I afford it?": YES / TIGHT / NOT YET from your real balances, explained by the AI
- [x] Insights: week/month by category and day, vs the same days before
- [x] Goals: set money aside from savings, weekly amount to hit a date
- [ ] Receipt scanning, PWA, CSV export
