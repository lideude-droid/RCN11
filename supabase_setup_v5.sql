-- Corre isto no Supabase: Project > SQL Editor > New query > Run
-- Adiciona: posts com vídeo, posts afixados (pin) e sistema de seguidores.

-- tipo de media do post ('image' ou 'video') e afixação no perfil
alter table posts add column if not exists media_type text default 'image';
alter table posts add column if not exists is_pinned boolean default false;

-- sistema de seguidores
create table if not exists follows (
  follower_id text not null,
  following_id text not null,
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);

alter table follows enable row level security;

create index if not exists idx_posts_author on posts(author_id);
create index if not exists idx_follows_follower on follows(follower_id);
create index if not exists idx_follows_following on follows(following_id);
