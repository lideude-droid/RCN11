-- Corre isto no Supabase: Project > SQL Editor > New query > Run
-- Adiciona os acontecimentos de um jogo (quem marcou, cartões, etc.),
-- para poderes clicar num jogo e ver o que aconteceu.

create table if not exists match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id) on delete cascade,
  club_id uuid references clubs(id) on delete set null,
  player_id uuid references players(id) on delete set null,
  player_name text,
  event_type text not null default 'goal', -- 'goal' | 'own_goal' | 'assist' | 'yellow' | 'red'
  minute int,
  note text,
  created_at timestamptz default now()
);

alter table match_events enable row level security;

create index if not exists idx_match_events_match on match_events(match_id);
