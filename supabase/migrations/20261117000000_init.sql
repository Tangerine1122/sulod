-- Sulod initial schema
-- Money is stored as integer centavos. Timestamps are UTC timestamptz; the app displays them in Asia/Manila.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  currency text not null default 'PHP',
  allowance_weekday smallint check (allowance_weekday between 0 and 6), -- 0 = Sunday
  created_at timestamptz not null default now()
);

create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  type text not null check (type in ('cash', 'debit', 'ewallet', 'savings')),
  starting_balance_cents bigint not null default 0,
  counts_as_spendable boolean not null default true,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  icon text,
  color text not null default '#CFC5B8',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  wallet_id uuid not null references public.wallets (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  type text not null check (type in ('expense', 'income', 'transfer')),
  amount_cents bigint not null check (amount_cents > 0),
  merchant text,
  note text,
  occurred_at timestamptz not null default now(),
  source text not null default 'manual' check (source in ('manual', 'ai_text', 'ai_image')),
  ai_confidence real check (ai_confidence between 0 and 1),
  raw_input text,
  transfer_to_wallet_id uuid references public.wallets (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint transfer_has_target check (
    (type = 'transfer' and transfer_to_wallet_id is not null and transfer_to_wallet_id <> wallet_id)
    or (type <> 'transfer' and transfer_to_wallet_id is null)
  )
);

create index transactions_user_time_idx on public.transactions (user_id, occurred_at desc);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  target_cents bigint not null check (target_cents > 0),
  target_date date,
  wallet_id uuid references public.wallets (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.gigs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  work_date date not null,
  hours numeric(4, 1) check (hours > 0),
  expected_cents bigint not null check (expected_cents > 0),
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at timestamptz,
  wallet_id uuid references public.wallets (id) on delete set null,
  transaction_id uuid references public.transactions (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Ownership checks: a row may only point at wallets/categories of the same user
-- ---------------------------------------------------------------------------

create or replace function public.check_transaction_refs()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (select 1 from public.wallets w where w.id = new.wallet_id and w.user_id = new.user_id) then
    raise exception 'wallet does not belong to user';
  end if;
  if new.transfer_to_wallet_id is not null and not exists (
    select 1 from public.wallets w where w.id = new.transfer_to_wallet_id and w.user_id = new.user_id
  ) then
    raise exception 'target wallet does not belong to user';
  end if;
  if new.category_id is not null and not exists (
    select 1 from public.categories c where c.id = new.category_id and c.user_id = new.user_id
  ) then
    raise exception 'category does not belong to user';
  end if;
  return new;
end;
$$;

create trigger transactions_check_refs
before insert or update on public.transactions
for each row execute function public.check_transaction_refs();

-- ---------------------------------------------------------------------------
-- Row Level Security: every row belongs to auth.uid()
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.goals enable row level security;
alter table public.gigs enable row level security;

create policy "own profile" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "own wallets" on public.wallets
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own categories" on public.categories
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own transactions" on public.transactions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own goals" on public.goals
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own gigs" on public.gigs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- New user: create profile and default categories
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));

  insert into public.categories (user_id, name, icon, color, is_default) values
    (new.id, 'Food',      'utensils', '#F2B33D', true),
    (new.id, 'Transport', 'bus',      '#0E5A57', true),
    (new.id, 'School',    'book',     '#C4421A', true),
    (new.id, 'Load & Data','phone',   '#9CC9C2', true),
    (new.id, 'Shopping',  'bag',      '#E8A87C', true),
    (new.id, 'Bills',     'receipt',  '#8C7B6B', true),
    (new.id, 'Fun',       'sparkle',  '#D9B8E8', true),
    (new.id, 'Other',     'dot',      '#CFC5B8', true);

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Read helpers (security invoker, so RLS still applies)
-- ---------------------------------------------------------------------------

-- Current balance per wallet. Transfers move money between wallets and never count as spending.
create or replace view public.wallet_balances
with (security_invoker = true)
as
select
  w.id,
  w.user_id,
  w.name,
  w.type,
  w.counts_as_spendable,
  w.starting_balance_cents
    + coalesce(sum(case
        when t.type = 'income' and t.wallet_id = w.id then t.amount_cents
        when t.type = 'expense' and t.wallet_id = w.id then -t.amount_cents
        when t.type = 'transfer' and t.wallet_id = w.id then -t.amount_cents
        when t.type = 'transfer' and t.transfer_to_wallet_id = w.id then t.amount_cents
        else 0
      end), 0) as balance_cents
from public.wallets w
left join public.transactions t
  on t.wallet_id = w.id or t.transfer_to_wallet_id = w.id
where not w.archived
group by w.id;

-- Expense totals per category between two instants (expenses only).
create or replace function public.spending_by_category(p_from timestamptz, p_to timestamptz)
returns table (category_id uuid, name text, color text, total_cents bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.id, coalesce(c.name, 'Uncategorized'), coalesce(c.color, '#CFC5B8'), sum(t.amount_cents)::bigint
  from public.transactions t
  left join public.categories c on c.id = t.category_id
  where t.type = 'expense'
    and t.occurred_at >= p_from
    and t.occurred_at < p_to
  group by c.id, c.name, c.color
  order by 4 desc;
$$;
