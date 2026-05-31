create table walls (
  id             bigint generated always as identity primary key,
  name           text not null,
  image_url      text not null,
  image_thumb_url text,
  holds_json_url text,
  created_at     timestamptz default now()
);

create table routes (
  id         bigint generated always as identity primary key,
  wall_id    bigint not null references walls(id),
  name       text not null,
  setter_id  uuid not null references profiles(id),
  holds_map  jsonb not null default '{}',
  grade      smallint,
  match      boolean default false,
  volumes    text default 'any',
  campus      boolean default false,
  description text default '',
  created_at  timestamptz default now()
);

create table ascents (
  id              bigint generated always as identity primary key,
  route_id        bigint not null references routes(id) on delete cascade,
  climber_id      uuid not null references profiles(id),
  stars           smallint check (stars between 1 and 5),
  suggested_grade smallint,
  attempts        smallint default 1,
  notes           text,
  date            date default current_date,
  unique (route_id, climber_id)
);

create table favorites (
  user_id  uuid   not null references profiles(id),
  route_id bigint not null references routes(id) on delete cascade,
  primary key (user_id, route_id)
);

create table profiles (
  id           uuid primary key references auth.users(id),
  display_name text not null
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'anon'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS

alter table walls   enable row level security;
alter table routes  enable row level security;
alter table ascents enable row level security;

alter table profiles enable row level security;

create policy "profiles_read"
  on profiles for select
  to authenticated, anon
  using (true);

create policy "profiles_insert"
  on profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles_update"
  on profiles for update
  to authenticated
  using (id = auth.uid());

-- walls: anyone can read
create policy "walls_read"
  on walls for select
  to authenticated, anon
  using (true);

-- routes: anyone can read, authenticated can insert their own
create policy "routes_read"
  on routes for select
  to authenticated, anon
  using (true);

create policy "routes_insert"
  on routes for insert
  to authenticated
  with check (setter_id = auth.uid());

create policy "routes_update"
  on routes for update
  to authenticated
  using (setter_id = auth.uid());

-- favorites: user can manage their own
alter table favorites enable row level security;

create policy "favorites_read"
  on favorites for select
  to authenticated
  using (user_id = auth.uid());

create policy "favorites_insert"
  on favorites for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "favorites_delete"
  on favorites for delete
  to authenticated
  using (user_id = auth.uid());

-- ascents: anyone can read, authenticated can insert their own
create policy "ascents_read"
  on ascents for select
  to authenticated, anon
  using (true);

create policy "ascents_insert"
  on ascents for insert
  to authenticated
  with check (climber_id = auth.uid());

create policy "ascents_update"
  on ascents for update
  to authenticated
  using (climber_id = auth.uid())
  with check (climber_id = auth.uid());
