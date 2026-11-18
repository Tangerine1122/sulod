-- Gig pay tracker (PROJECT_CONTEXT §8.2)
-- Marking a shift paid creates its income entry and links them in one step.

alter table public.gigs
  add constraint gigs_paid_consistent check (
    (status = 'pending' and paid_at is null) or (status = 'paid' and paid_at is not null)
  );

create index gigs_user_status_idx on public.gigs (user_id, status, work_date);

-- A gig may only point at the same user's wallet and transaction.
create or replace function public.check_gig_refs()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.wallet_id is not null and not exists (
    select 1 from public.wallets w where w.id = new.wallet_id and w.user_id = new.user_id
  ) then
    raise exception 'wallet does not belong to user';
  end if;
  if new.transaction_id is not null and not exists (
    select 1 from public.transactions t where t.id = new.transaction_id and t.user_id = new.user_id
  ) then
    raise exception 'transaction does not belong to user';
  end if;
  return new;
end;
$$;

create trigger gigs_check_refs
before insert or update on public.gigs
for each row execute function public.check_gig_refs();

-- Deleting a gig's income entry (e.g. from Activity) puts the gig back to pending,
-- so a shift never shows as paid without the money.
create or replace function public.reset_gig_on_income_delete()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.gigs
     set status = 'pending', paid_at = null, transaction_id = null
   where transaction_id = old.id;
  return old;
end;
$$;

create trigger transactions_reset_gig
before delete on public.transactions
for each row execute function public.reset_gig_on_income_delete();

-- Mark a shift paid: one income entry into the chosen wallet, linked to the gig.
create or replace function public.mark_gig_paid(
  p_gig uuid,
  p_wallet uuid,
  p_amount_cents bigint,
  p_paid_at timestamptz
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  g public.gigs;
  t_id uuid;
begin
  select * into g from public.gigs where id = p_gig for update;
  if not found then
    raise exception 'gig not found';
  end if;
  if g.status = 'paid' then
    raise exception 'gig already paid';
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'amount must be positive';
  end if;

  insert into public.transactions (user_id, wallet_id, type, amount_cents, merchant, note, occurred_at, source)
  values (
    g.user_id, p_wallet, 'income', p_amount_cents, g.title,
    'Gig pay · ' || to_char(g.work_date, 'Mon FMDD') || coalesce(' · ' || rtrim(rtrim(g.hours::text, '0'), '.') || ' hrs', ''),
    p_paid_at, 'manual'
  )
  returning id into t_id;

  update public.gigs
     set status = 'paid', paid_at = p_paid_at, wallet_id = p_wallet, transaction_id = t_id
   where id = p_gig;

  return t_id;
end;
$$;

-- Undo "paid": removes the income entry; the delete trigger resets the gig.
create or replace function public.undo_gig_paid(p_gig uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  g public.gigs;
begin
  select * into g from public.gigs where id = p_gig for update;
  if not found then
    raise exception 'gig not found';
  end if;
  if g.transaction_id is not null then
    delete from public.transactions where id = g.transaction_id;
  end if;
  update public.gigs set status = 'pending', paid_at = null, transaction_id = null where id = p_gig;
end;
$$;

-- Delete a shift. If it was paid, its income entry goes too.
create or replace function public.delete_gig(p_gig uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  g public.gigs;
begin
  select * into g from public.gigs where id = p_gig for update;
  if not found then
    return;
  end if;
  if g.transaction_id is not null then
    delete from public.transactions where id = g.transaction_id;
  end if;
  delete from public.gigs where id = p_gig;
end;
$$;

revoke execute on function public.mark_gig_paid(uuid, uuid, bigint, timestamptz) from public, anon;
revoke execute on function public.undo_gig_paid(uuid) from public, anon;
revoke execute on function public.delete_gig(uuid) from public, anon;
grant execute on function public.mark_gig_paid(uuid, uuid, bigint, timestamptz) to authenticated;
grant execute on function public.undo_gig_paid(uuid) to authenticated;
grant execute on function public.delete_gig(uuid) to authenticated;
revoke execute on function public.check_gig_refs() from public, anon;
revoke execute on function public.reset_gig_on_income_delete() from public, anon;
