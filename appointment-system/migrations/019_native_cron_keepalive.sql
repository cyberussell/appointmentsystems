-- 018 added an UPDATE policy on keepalive_heartbeat but no SELECT policy.
-- Without SELECT, PostgREST can't see the row under RLS, so the external
-- cron's PATCH request has been silently matching 0 rows for a week while
-- still returning 200/204 (Prefer: return=minimal masks the empty match).
-- Confirmed live: PATCH and GET as anon both returned [] before this fix.
create policy "anon can select heartbeat" on public.keepalive_heartbeat
  for select using (true);

-- Belt-and-suspenders: ping from inside Postgres as a scheduled job so the
-- keepalive no longer depends on the external cron / PostgREST / RLS at all.
create extension if not exists pg_cron;

select cron.schedule(
  'keepalive-heartbeat-ping',
  '0 */12 * * *',
  $$ update public.keepalive_heartbeat set pinged_at = now() where id = 1; $$
);
