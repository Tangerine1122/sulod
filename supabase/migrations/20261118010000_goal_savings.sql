-- Goals as envelopes: each goal has an amount set aside from the savings wallets.
-- The app keeps the total set aside within the savings balance when adding to a goal.
alter table public.goals
  add column saved_cents bigint not null default 0 check (saved_cents >= 0);

-- A goal may only point at the same user's wallet.
create or replace function public.check_goal_refs()
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
  return new;
end;
$$;

create trigger goals_check_refs
before insert or update on public.goals
for each row execute function public.check_goal_refs();

revoke execute on function public.check_goal_refs() from public, anon;
