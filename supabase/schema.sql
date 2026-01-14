create extension if not exists "pgcrypto";

create table if not exists play_sessions (
  id uuid primary key default gen_random_uuid(),
  game_slug text not null,
  client_id text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_ms bigint
);

create index if not exists play_sessions_game_idx on play_sessions (game_slug);

create table if not exists ratings (
  id uuid primary key default gen_random_uuid(),
  game_slug text not null,
  client_id text not null,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now()
);

create unique index if not exists ratings_game_client_key on ratings (game_slug, client_id);
create index if not exists ratings_game_idx on ratings (game_slug);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  game_slug text not null,
  client_id text,
  display_name text,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists comments_game_idx on comments (game_slug, created_at desc);

alter table play_sessions enable row level security;
alter table ratings enable row level security;
alter table comments enable row level security;

create policy "public read play_sessions" on play_sessions for select using (true);
create policy "public insert play_sessions" on play_sessions for insert with check (true);
create policy "public update play_sessions" on play_sessions for update using (true) with check (true);

create policy "public read ratings" on ratings for select using (true);
create policy "public insert ratings" on ratings for insert with check (true);
create policy "public update ratings" on ratings for update using (true) with check (true);

create policy "public read comments" on comments for select using (true);
create policy "public insert comments" on comments for insert with check (true);
