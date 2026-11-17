# Project Context: AI Expense Tracker (working name: "Sulod")

Read this at the start of each coding session. It is the source of truth for scope, data model and design.

## 0. Where things live
- Live app: https://sulod-inky.vercel.app (Vercel, deploys from `main`)
- Code: https://github.com/Tangerine1122/sulod
- Database: Supabase project `sulod` (ref `xcfhvhszblnrcthrwwmv`, region ap-southeast-1)
- Mockups: https://claude.ai/artifact/HU38JUri2fz5UiYyVvn9KP
- Supabase Auth redirect URLs: production `/auth/callback` and `http://localhost:3000/auth/callback`

## 1. What it is
A personal expense and savings tracker for a student/part-time earner in the Philippines. The core idea: logging an expense should take under 5 seconds. The user types or pastes a casual line ("jollibee 180", "grab to uni 95") or uploads a screenshot of a receipt or e-wallet transaction, and AI turns it into a structured, categorized entry.

## 2. Goals
- Fast capture: one input box, natural language in, structured expense out.
- Clear picture: where money goes each week/month, and progress toward savings goals.
- Portfolio quality: shows frontend/UX craft, a real backend, and a practical AI feature.

## 3. Non-goals (v1)
- No real bank or e-wallet integrations (no account linking, no storing card/account numbers).
- No multi-user sharing or budgets for groups.
- No native mobile app (responsive PWA is enough).

## 4. Users and key scenarios
Primary user: one person with a mix of income streams (weekly allowance, salary, occasional gig pay) and several "wallets" (cash, debit, e-wallet, savings).
1. Log an expense from a sentence in under 5 seconds.
2. Upload a receipt/screenshot and confirm the extracted entry.
3. See this week vs last week spending by category.
4. Move money between wallets (e.g. salary to savings) without it counting as spending.
5. Set a savings goal and see progress.
6. See one "safe to spend today" number on Home.
7. Log a gig shift, see what pay is still pending, and mark it paid when the money arrives.
8. Ask "can I afford X?" and get a straight answer based on real balances.

## 5. Tech stack
- Framework: Next.js 16 (App Router, TypeScript strict, Cache Components on). Route protection lives in `src/proxy.ts` (Next 16 renamed middleware to proxy).
- UI: Tailwind CSS v4 with the Sulod tokens in `src/app/globals.css`; hand-built components (shadcn/ui only if a complex primitive is needed). Fonts are self-hosted via `@fontsource-variable`.
- Database/Auth: Supabase (Postgres + Row Level Security + Auth, magic link). Migrations in `supabase/migrations`.
- AI: Vercel AI SDK with structured output (Zod schemas); vision-capable model for screenshots, routed via AI Gateway
- Charts: Recharts (or plain CSS bars where enough)
- Tests: Vitest for pure logic (`npm test`)
- Hosting: Vercel
- Currency: PHP (₱), amounts stored as integers in centavos

## 6. Data model (Postgres)
- `profiles`: id (= auth.users.id), display_name, currency (default 'PHP'), allowance_weekday (0-6, nullable; the day the weekly allowance arrives)
- `wallets`: id, user_id, name, type (cash | debit | ewallet | savings), starting_balance_cents, counts_as_spendable (default true; false for savings), archived
- `categories`: id, user_id, name, icon, color, is_default
- `transactions`: id, user_id, wallet_id, category_id (nullable), type (expense | income | transfer), amount_cents, merchant, note, occurred_at, source (manual | ai_text | ai_image), ai_confidence (nullable), raw_input (nullable), transfer_to_wallet_id (nullable)
- `goals`: id, user_id, name, target_cents, target_date (nullable), wallet_id (nullable)
- `gigs`: id, user_id, title, work_date, hours (numeric, nullable), expected_cents, status (pending | paid), paid_at (nullable), wallet_id (nullable), transaction_id (nullable; the income row created when marked paid)
- `wallet_balances` view and `spending_by_category(from, to)` function, both security invoker so RLS applies.
- Row Level Security on every table: `user_id = auth.uid()`. A trigger also rejects transactions that point at another user's wallet or category.
- New users get a profile and default categories from the `on_auth_user_created` trigger.
- Never store card numbers, account numbers or IDs. Receipt images are processed and discarded unless the user opts to keep them.

## 7. AI features
### 7.1 Natural-language entry (v1, core)
Input: free text, e.g. "jollibee 180 gcash", "salary 12000", "moved 2000 to savings".
Output (Zod schema): `{ type, amount_cents, merchant, category, wallet_hint, occurred_at, note, confidence }`.
Rules:
- Model must pick from the user's existing categories; if confidence < 0.6, leave category empty and ask the user.
- Resolve relative dates ("yesterday") against the user's timezone (Asia/Manila).
- Always show a confirm/edit card before saving; never write silently.
- Handle Taglish/Cebuano shorthand ("kan-on 120", "pamasahe 20").
- Until this ships, `src/lib/rough-parse.ts` prefills the manual form (amount + merchant only).

### 7.2 Screenshot/receipt parsing (v2)
Image in, same schema out. Show extracted fields next to the image for quick correction.

### 7.3 Insights (v3)
Weekly summary generated from aggregated numbers (not raw rows): top categories, change vs last week, one concrete suggestion. The model only explains numbers computed by SQL; it never does the arithmetic.

### 7.4 Learning from corrections (v3)
Store merchant -> category overrides; apply them before calling the model.

### 7.5 "Can I afford it?" (v2)
Typed into the same quick-add box as a question ("can I buy 2500 shoes?"). The model does two small jobs; the code does everything in between.
1. Parse (model): `{ item, amount_cents }`. If there is no amount, ask for it.
2. Compute (code, no AI): spendable balance, days left until the next allowance, daily amount after buying, usual daily spend (average of expenses over the last 28 days), pending gig pay, savings balance.
3. Verdict (code, no AI):
   - `not_yet` if spendable minus price is below zero, or daily-after is under 60% of usual daily spend.
   - `tight` if daily-after is between 60% and 100% of usual daily spend.
   - `yes` if daily-after is at or above usual daily spend.
4. Explain (model): 2-3 sentences that restate the computed numbers and verdict. It never changes the verdict or does arithmetic.
Rules: never count savings wallets or pending gig pay as available; mention them as context only. Offer "Log this purchase", which opens the normal confirm card.

## 8. Money features (computed, no AI)
### 8.1 Safe to spend today (v1) — implemented in `src/lib/safe-to-spend.ts`
One number on Home.
- `spendable_cents` = sum of current balances of wallets where `counts_as_spendable` is true.
- `days_left` = days from today up to (not including) the next `allowance_weekday`, minimum 1. On allowance day itself it is 7.
- `safe_today_cents` = floor(spendable_cents / days_left), never below 0.
- Show the working under the number ("₱4,420 spendable ÷ 7 days until Monday's allowance"). If `allowance_weekday` is not set, ask for it once instead of guessing.

### 8.2 Gig pay tracker (v2)
For irregular income such as event shifts.
- Log a shift: title, date, hours (optional), expected pay. Status starts as `pending`.
- "Mark paid" asks which wallet received it, creates an `income` transaction, and stores its id on the gig.
- Gigs screen shows total pending, paid this month, and both lists.
- Pending gig pay never counts toward balances or safe-to-spend.

## 9. Screens
Bottom navigation: Home, Activity, Gigs, Insights, Goals. Settings opens from the Home header.
1. **Home**: wallet balances, safe to spend today, quick-add input (also takes "can I afford" questions), this week's spend, recent transactions.
2. **Confirm entry**: parsed entry with confidence, editable category and wallet, save/discard.
3. **Afford answer**: verdict (yes / tight / not yet), the numbers behind it, short explanation, "Log this purchase".
4. **Activity (Transactions)**: filterable list (date, wallet, category), edit/delete.
5. **Gigs**: pending and paid shifts, log a shift, mark paid.
6. **Insights**: category breakdown, weekly trend, weekly AI summary.
7. **Goals**: savings goals with progress bars.
8. **Settings**: wallets, categories, allowance day, export CSV.

## 10. Design direction
Mockups: "Sulod — App Mockups" design canvas (https://claude.ai/artifact/HU38JUri2fz5UiYyVvn9KP).
- Concept: receipt slips. Key cards have a zigzag torn bottom edge (`<Zigzag />`); AI confidence and afford verdicts appear as tilted rubber stamps.
- Colors: paper `#F3EDE2`, card `#FFFBF4`, ink `#1E1A16`, mango `#F2B33D`, chili `#C4421A`, sea teal `#0E5A57`, muted text `#6B6157`. No gradients, no emoji.
- Type: Bricolage Grotesque (headings and amounts), Figtree (body), JetBrains Mono (labels and typed input).
- Primary inputs and buttons: 2px ink border with a hard 4px offset shadow (`press` utility).
- UI copy is in English. Casual Cebuano/Taglish appears only in what the user types.

## 11. Build order
1. ✅ Scaffold Next.js + Tailwind, Supabase schema, auth (email/magic link), RLS policies.
2. ✅ Schema + seed default categories. Create wallets and transactions (manual form).
3. ✅ Home (balances, safe to spend, this week, recent) and Activity (month view, filters, edit/delete).
4. AI text entry (7.1) with confirm card and basic evals (20 sample lines with expected output).
5. Transfers between wallets, excluded from spending totals (✅ data + form; polish UI).
6. Gig pay tracker (8.2).
7. "Can I afford it?" (7.5), with evals for the verdict rules.
8. Insights charts, then goals.
9. Screenshot parsing (7.2), PWA install, CSV export.
10. Weekly AI summary and merchant overrides (7.3, 7.4).

## 12. Conventions
- TypeScript strict; Zod validation at every boundary (forms, server actions, AI output).
- Server Actions for mutations (`src/app/actions.ts`); server components for reads (`src/lib/data.ts`).
- All money math in integer centavos; format only at the UI edge (`src/lib/money.ts`). Postgres bigint arrives as a string, so convert with `Number()` in the data layer.
- Dates stored as UTC `timestamptz`, displayed in Asia/Manila (`src/lib/dates.ts`). Weeks start Monday 00:00 Manila.
- Pages that read "now" or user data call `await connection()`; `loading.tsx` provides the streaming fallback.
- Small, accessible components; keyboard-friendly quick-add; touch targets at least 44px.
- Commit in small steps; one feature per branch.

## 13. Risks and decisions
- AI mislabels entries: mitigated by the confirm card and a confidence threshold.
- AI gives bad money advice: mitigated by computing every number and verdict in code; the model only parses and explains.
- Privacy: financial data is sensitive, so RLS everywhere, no third-party analytics on transaction content, and minimal logging of raw inputs.
- Cost: use a small, cheap model for text entry; only call the vision model on uploads.
- Open question: single user only, or leave room for multi-user later? (Default: single user, schema is already per-user.)

## 14. Definition of done for v1
Sign in, add a wallet, log 10 expenses by typing sentences, see correct weekly totals by category, see a correct safe-to-spend number on Home, and transfer money to a savings wallet without it counting as spending.
