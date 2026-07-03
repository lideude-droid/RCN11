-- Corre isto no Supabase: Project > SQL Editor > New query > Run
-- Adiciona: contagem de visualizações e comentários aos posts (para o feed
-- deixar de ser por data e passar a ser por popularidade) e liga as
-- assistências ao golo respetivo nos acontecimentos do jogo.

alter table posts add column if not exists views int default 0;
alter table posts add column if not exists comments_count int default 0;

alter table match_events add column if not exists parent_event_id uuid references match_events(id) on delete cascade;

create index if not exists idx_match_events_parent on match_events(parent_event_id);
