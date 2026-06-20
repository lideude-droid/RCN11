-- Corre isto no Supabase: Project > SQL Editor > New query > Run
-- (podes correr mesmo que já tenhas a tabela "posts", isto não a afeta)

create table if not exists clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text default '',
  manager text default '',
  played int default 0,
  won int default 0,
  drawn int default 0,
  lost int default 0,
  goals_for int default 0,
  goals_against int default 0,
  created_at timestamptz default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  club_id uuid references clubs(id) on delete set null,
  goals int default 0,
  assists int default 0,
  yellow_cards int default 0,
  red_cards int default 0,
  created_at timestamptz default now()
);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  author_id text not null,
  author_username text,
  author_avatar text,
  content text not null,
  created_at timestamptz default now()
);

alter table clubs enable row level security;
alter table players enable row level security;
alter table comments enable row level security;
