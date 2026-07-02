-- Corre isto no Supabase: Project > SQL Editor > New query > Run
-- Adiciona: jogos entre clubes (ex: SLB vs SCP) e um "bucket" de armazenamento
-- público para guardar ficheiros (imagens/vídeos) enviados do PC nos posts.

/* ---------------- JOGOS ---------------- */

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  home_club_id uuid references clubs(id) on delete cascade,
  away_club_id uuid references clubs(id) on delete cascade,
  home_score int,
  away_score int,
  status text default 'scheduled', -- 'scheduled' | 'played'
  matchday int,
  played_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table matches enable row level security;

create index if not exists idx_matches_home on matches(home_club_id);
create index if not exists idx_matches_away on matches(away_club_id);

/* ---------------- ARMAZENAMENTO DE FICHEIROS (uploads do PC) ---------------- */
-- cria um bucket público chamado "post-media" onde o servidor guarda as imagens
-- e vídeos enviados diretamente do computador para os posts do feed.
insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do nothing;
