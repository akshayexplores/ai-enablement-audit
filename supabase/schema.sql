-- CII AI enablement research audit: responses table.
-- Safe to run in an existing project (including the same Supabase project as the Vajra audit):
-- creates only objects prefixed "cii_audit_" plus the cii_admin_otp table below, touches nothing
-- else, and shares no table with the Vajra audit's "audit_*" / "vajra_admin_otp" objects. Re-runnable.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.cii_audit_responses (
  id               uuid primary key,
  edit_token_hash  text not null,
  kind             text not null check (kind in ('executive','department')),
  status           text not null default 'in_progress' check (status in ('in_progress','completed')),
  name             text not null,
  email            text not null,
  company          text not null,
  progress         int  not null default 0 check (progress between 0 and 100),
  answers          jsonb not null default '{}'::jsonb,
  summary          jsonb not null default '{}'::jsonb,
  meta             jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  completed_at     timestamptz
);

create index if not exists cii_audit_responses_updated_idx on public.cii_audit_responses (updated_at desc);
create index if not exists cii_audit_responses_email_idx   on public.cii_audit_responses (lower(email));

-- Lock the table: no access for the public (anon) or logged-in app users (authenticated).
-- Only the server (service role) can read or write.
alter table public.cii_audit_responses enable row level security;
revoke all on public.cii_audit_responses from anon, authenticated;
grant select, insert, update, delete on public.cii_audit_responses to service_role;

-- Create or update a response. Updates require the same secret token the browser created,
-- so nobody can overwrite someone else's response by guessing its id.
create or replace function public.cii_audit_save(
  p_id uuid, p_token text, p_kind text, p_status text,
  p_name text, p_email text, p_company text, p_progress int,
  p_answers jsonb, p_summary jsonb, p_meta jsonb
) returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text := encode(extensions.digest(p_token, 'sha256'), 'hex');
  v_rows int;
begin
  insert into public.cii_audit_responses as r
    (id, edit_token_hash, kind, status, name, email, company, progress, answers, summary, meta, completed_at)
  values
    (p_id, v_hash, p_kind, p_status, p_name, p_email, p_company, p_progress, p_answers, p_summary, p_meta,
     case when p_status = 'completed' then now() end)
  on conflict (id) do update set
    status       = case when r.status = 'completed' then 'completed' else excluded.status end,
    name         = excluded.name,
    email        = excluded.email,
    company      = excluded.company,
    progress     = excluded.progress,
    answers      = excluded.answers,
    summary      = excluded.summary,
    meta         = r.meta || excluded.meta,
    updated_at   = now(),
    completed_at = coalesce(r.completed_at, excluded.completed_at)
  where r.edit_token_hash = excluded.edit_token_hash
    and r.kind = excluded.kind;

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.cii_audit_save(uuid,text,text,text,text,text,text,int,jsonb,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.cii_audit_save(uuid,text,text,text,text,text,text,int,jsonb,jsonb,jsonb) to service_role;

-- Admin login: one-time email codes. One row per email; a new code overwrites the old one.
-- Only the server (service role) can read or write; there is no RPC because only the
-- server itself ever touches this table (never called with browser-supplied credentials).
create table if not exists public.cii_admin_otp (
  email        text primary key,
  code_hash    text not null,
  attempts     int not null default 0,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null
);

alter table public.cii_admin_otp enable row level security;
revoke all on public.cii_admin_otp from anon, authenticated;
grant select, insert, update, delete on public.cii_admin_otp to service_role;
