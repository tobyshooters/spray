create table walls (
  id         bigint generated always as identity primary key,
  name       text not null,
  image_url  text not null,
  holds_json_url text
);

create table routes (
  id         bigint generated always as identity primary key,
  wall_id    bigint not null references walls(id),
  name       text not null,
  setter_id  uuid not null references profiles(id),
  hold_ids   text[] not null,
  grade      smallint check (grade between 0 and 4),
  created_at timestamptz default now()
);

create table ascents (
  id         bigint generated always as identity primary key,
  route_id   bigint not null references routes(id),
  climber_id uuid not null references profiles(id),
  stars      smallint check (stars between 1 and 5),
  suggested_grade smallint check (suggested_grade between 0 and 4),
  notes      text,
  date       date default current_date
);

create table profiles (
  id           uuid primary key references auth.users(id),
  display_name text not null
);

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

-- ascents: anyone can read, authenticated can insert their own
create policy "ascents_read"
  on ascents for select
  to authenticated, anon
  using (true);

create policy "ascents_insert"
  on ascents for insert
  to authenticated
  with check (climber_id = auth.uid());
