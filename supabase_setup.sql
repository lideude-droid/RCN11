-- Corre isto no Supabase: Project > SQL Editor > New query > Run

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  caption text default '',
  club text,
  author_id text not null,
  author_username text,
  author_avatar text,
  likes text[] default '{}',
  created_at timestamptz default now()
);

-- (opcional) ativa Row Level Security; como o servidor usa a service_role key,
-- continua a conseguir ler/escrever mesmo com RLS ligado.
alter table posts enable row level security;
