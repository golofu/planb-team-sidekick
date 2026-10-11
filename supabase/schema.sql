-- Plan B Team Sidekick — โครงฐานข้อมูลสำหรับเฟสใช้ข้อมูลจริง (Supabase / Postgres)
-- ยังไม่ได้ใช้ในต้นแบบ (ต้นแบบเก็บข้อมูลใน localStorage) — รันไฟล์นี้หลังได้รับอนุญาตจาก IT

create type user_role as enum ('head', 'sales');
create type deal_stage as enum ('lead', 'contacted', 'meeting', 'proposal', 'negotiation', 'won', 'lost');
create type activity_type as enum ('call', 'line', 'email', 'meeting', 'proposal', 'other');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  nickname text not null,
  email text not null unique check (email like '%@planbmedia.co.th'),
  role user_role not null default 'sales',
  color text not null default '#1fa8e0',
  categories text[] not null default '{}',
  monthly_target numeric not null default 0,
  created_at timestamptz not null default now()
);

create table brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  agency text,
  owner_id uuid references profiles,
  contact_name text,
  contact_title text,
  created_at timestamptz not null default now()
);

create table deals (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands,
  owner_id uuid not null references profiles,
  title text not null,
  value numeric not null default 0,
  stage deal_stage not null default 'lead',
  media text[] not null default '{}',
  next_step text,
  next_step_date date,
  stage_changed_at date not null default current_date,
  closed_at date,
  created_at date not null default current_date
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles,
  brand_id uuid references brands,
  deal_id uuid references deals,
  type activity_type not null,
  summary text not null,
  raw_text text not null,
  date date not null default current_date,
  is_new_contact boolean not null default false,
  stage_after deal_stage,
  next_step text,
  next_step_date date,
  created_at timestamptz not null default now()
);

create table coach_notes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles,
  activity_id uuid not null references activities on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create table team_settings (
  id int primary key default 1 check (id = 1),
  kpi_new_contacts int not null default 15,
  kpi_meetings int not null default 4,
  kpi_proposals int not null default 2,
  stale_days_proposal int not null default 10,
  stale_days_other int not null default 14
);

-- Row Level Security: Sales เห็นเฉพาะของตัวเอง, Group Head เห็นทั้งหมด
create or replace function is_head() returns boolean language sql stable as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'head');
$$;

alter table profiles enable row level security;
alter table brands enable row level security;
alter table deals enable row level security;
alter table activities enable row level security;
alter table coach_notes enable row level security;
alter table team_settings enable row level security;

create policy "team reads profiles" on profiles for select using (auth.uid() is not null);
create policy "head manages profiles" on profiles for update using (is_head());

create policy "team reads brands" on brands for select using (auth.uid() is not null);
create policy "team adds brands" on brands for insert with check (auth.uid() is not null);
create policy "head updates brands" on brands for update using (is_head() or owner_id = auth.uid());

create policy "own or head reads deals" on deals for select using (owner_id = auth.uid() or is_head());
create policy "own or head writes deals" on deals for all using (owner_id = auth.uid() or is_head());

create policy "own or head reads activities" on activities for select using (user_id = auth.uid() or is_head());
create policy "own inserts activities" on activities for insert with check (user_id = auth.uid());

create policy "read notes on visible activities" on coach_notes for select using (
  is_head() or exists (select 1 from activities a where a.id = activity_id and a.user_id = auth.uid())
);
create policy "head writes notes" on coach_notes for insert with check (is_head() and author_id = auth.uid());

create policy "team reads settings" on team_settings for select using (auth.uid() is not null);
create policy "head updates settings" on team_settings for update using (is_head());
