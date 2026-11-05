-- =====================================================================
-- Agenda — aggiunte allo schema Supabase (CLAUDE.md §9)
-- =====================================================================
--
-- ATTENZIONE: Non contiene e non modifica records, vault, upsert_records e ping, che
-- appartengono già al progetto (li ha creati NexusLife). Aggiunge SOLO la tabella `snapshots`
-- per le fotografie giornaliere cifrate dell'Agenda, con le sue regole di accesso.
--
-- COME ESEGUIRLO (una volta sola; rieseguirlo non fa danni: è idempotente)
--
--  1. Apri https://supabase.com/dashboard e scegli il progetto di NexusLife
--     (lo stesso che usa l'Agenda).
--  2. Nel menu a sinistra apri "SQL Editor".
--  3. Premi "+ New query" (oppure "New SQL snippet").
--  4. Copia TUTTO questo file e incollalo nell'editor.
--  5. Premi "Run" (o Cmd+Invio). In basso deve comparire "Success. No rows returned".
--  6. Controllo facoltativo: in "Table Editor" c'è la tabella `snapshots` con l'etichetta
--     "RLS enabled".
--
-- Cosa vede Supabase di una fotografia: data, versione dello schema e numero di impegni
-- (event_count, in chiaro per mostrare l'elenco senza decifrare). Il contenuto (payload) è
-- cifrato sul telefono con AES-GCM, con la stessa chiave della copia continua.
-- Ogni utente vede solo le proprie fotografie (RLS): NexusLife e Agenda restano separati.
-- =====================================================================

create table if not exists public.snapshots (
  user_id        uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id             text        not null,
  created_at     timestamptz not null default now(),
  schema_version integer     not null,
  event_count    integer     not null,
  iv             text        not null,
  payload        text        not null,
  primary key (user_id, id)
);

create index if not exists snapshots_user_created_idx on public.snapshots (user_id, created_at desc);

alter table public.snapshots enable row level security;

drop policy if exists snapshots_select on public.snapshots;
drop policy if exists snapshots_insert on public.snapshots;
drop policy if exists snapshots_update on public.snapshots;
drop policy if exists snapshots_delete on public.snapshots;
create policy snapshots_select on public.snapshots for select to authenticated using ((select auth.uid()) = user_id);
create policy snapshots_insert on public.snapshots for insert to authenticated with check ((select auth.uid()) = user_id);
create policy snapshots_update on public.snapshots for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy snapshots_delete on public.snapshots for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.snapshots from anon;
grant select, insert, update, delete on public.snapshots to authenticated;
