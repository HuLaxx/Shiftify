create extension if not exists "pgcrypto";

create table if not exists party_rooms (
    code text primary key,
    name text,
    host_id uuid not null references auth.users(id),
    co_dj_ids uuid[] not null default '{}'::uuid[],
    now_playing jsonb not null default '{}'::jsonb,
    queue jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table if exists party_rooms
    add column if not exists co_dj_ids uuid[] not null default '{}'::uuid[];

create table if not exists party_messages (
    id uuid primary key default gen_random_uuid(),
    room_code text not null references party_rooms(code) on delete cascade,
    user_id uuid not null references auth.users(id),
    display_name text not null,
    message text not null,
    created_at timestamptz not null default now()
);

create index if not exists party_messages_room_code_idx on party_messages(room_code);

create or replace function set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists set_party_rooms_updated_at on party_rooms;
create trigger set_party_rooms_updated_at
before update on party_rooms
for each row
execute function set_updated_at();

alter table party_rooms enable row level security;
alter table party_messages enable row level security;

drop policy if exists party_rooms_select on party_rooms;
create policy party_rooms_select
    on party_rooms for select
    using (true);

drop policy if exists party_rooms_insert on party_rooms;
create policy party_rooms_insert
    on party_rooms for insert
    with check (auth.uid() = host_id);

drop policy if exists party_rooms_update on party_rooms;
create policy party_rooms_update
    on party_rooms for update
    using (auth.uid() = host_id or auth.uid() = any(co_dj_ids))
    with check (auth.uid() = host_id or auth.uid() = any(co_dj_ids));

drop policy if exists party_rooms_delete on party_rooms;
create policy party_rooms_delete
    on party_rooms for delete
    using (auth.uid() = host_id);

drop policy if exists party_messages_select on party_messages;
create policy party_messages_select
    on party_messages for select
    using (true);

drop policy if exists party_messages_insert on party_messages;
create policy party_messages_insert
    on party_messages for insert
    with check (auth.uid() = user_id);

drop policy if exists party_messages_delete on party_messages;
create policy party_messages_delete
    on party_messages for delete
    using (auth.uid() = user_id);
