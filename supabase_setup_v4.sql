-- Corre isto no Supabase: Project > SQL Editor > New query > Run

-- guarda os cargos Discord de cada utilizador (atualizado em cada login)
create table if not exists users (
  discord_id text primary key,
  username text,
  avatar text,
  roles text[] default '{}',
  last_seen timestamptz default now()
);

-- estado do mercado de transferências (linha única)
create table if not exists transfer_settings (
  id int primary key default 1,
  is_open boolean default false,
  opened_at timestamptz,
  closed_at timestamptz
);
insert into transfer_settings (id, is_open) values (1, false)
  on conflict (id) do nothing;

-- propostas de transferência
create table if not exists proposals (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) on delete cascade,
  from_club_id uuid references clubs(id) on delete cascade,
  to_club_id uuid references clubs(id) on delete cascade,
  amount int not null default 0,
  message text default '',
  status text default 'pending', -- pending | accepted | rejected | cancelled
  created_at timestamptz default now()
);

-- adicionar colunas novas aos clubs
alter table clubs add column if not exists budget int default 30000;
alter table clubs add column if not exists discord_role_id text default '';

-- definir budget inicial de 30k para clubes já existentes
update clubs set budget = 30000 where budget is null or budget = 0;

alter table users enable row level security;
alter table transfer_settings enable row level security;
alter table proposals enable row level security;
