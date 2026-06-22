-- Corre isto no Supabase: Project > SQL Editor > New query > Run
alter table clubs add column if not exists assistant_manager text default '';
