-- MyPKU Database Schema
-- Supabase SQL Editor에서 실행하세요

-- ================================================
-- 1. 사용자 프로필 테이블
-- Supabase Auth와 연동되어 자동 생성
-- ================================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  name text,
  mode text default 'general' check (mode in ('general', 'pku')),
  avatar_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 프로필 RLS 정책
alter table public.profiles enable row level security;

create policy "사용자는 자신의 프로필만 볼 수 있음"
  on public.profiles for select
  using (auth.uid() = id);

create policy "사용자는 자신의 프로필만 수정할 수 있음"
  on public.profiles for update
  using (auth.uid() = id);

create policy "사용자는 자신의 프로필만 삽입할 수 있음"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ================================================
-- 2. 건강 상태 테이블 (민감 정보, 별도 동의 필요)
-- ================================================
create table if not exists public.health_conditions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade unique,
  condition_type text check (condition_type in ('general', 'pku', 'other_metabolic')),
  phenylalanine_limit float,  -- PKU 일일 허용량 (mg)
  consent_at timestamp with time zone not null,
  created_at timestamp with time zone default now()
);

-- 건강 상태 RLS 정책
alter table public.health_conditions enable row level security;

create policy "사용자는 자신의 건강 정보만 접근 가능"
  on public.health_conditions for all
  using (auth.uid() = user_id);

-- ================================================
-- 3. 일일 목표 테이블
-- ================================================
create table if not exists public.daily_goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade unique,
  calories int default 2000,
  protein_g float default 50,
  carbs_g float default 250,
  fat_g float default 65,
  phenylalanine_mg float default 300,
  updated_at timestamp with time zone default now()
);

-- 일일 목표 RLS 정책
alter table public.daily_goals enable row level security;

create policy "사용자는 자신의 목표만 접근 가능"
  on public.daily_goals for all
  using (auth.uid() = user_id);

-- ================================================
-- 4. 식사 기록 테이블
-- ================================================
create table if not exists public.meal_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  timestamp timestamp with time zone not null,
  meal_type text check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  image_url text,  -- Supabase Storage URL
  total_nutrition jsonb not null,
  ai_confidence float,
  created_at timestamp with time zone default now()
);

-- 식사 기록 인덱스
create index if not exists meal_records_user_id_idx on public.meal_records(user_id);
create index if not exists meal_records_timestamp_idx on public.meal_records(timestamp);

-- 식사 기록 RLS 정책
alter table public.meal_records enable row level security;

create policy "사용자는 자신의 식사 기록만 접근 가능"
  on public.meal_records for all
  using (auth.uid() = user_id);

-- ================================================
-- 5. 음식 아이템 테이블
-- ================================================
create table if not exists public.food_items (
  id uuid default gen_random_uuid() primary key,
  meal_record_id uuid references public.meal_records(id) on delete cascade,
  name text not null,
  weight_g float,
  nutrition jsonb not null,
  confidence float,
  user_verified boolean default false
);

-- 음식 아이템 인덱스
create index if not exists food_items_meal_record_id_idx on public.food_items(meal_record_id);

-- 음식 아이템 RLS 정책
alter table public.food_items enable row level security;

create policy "사용자는 자신의 음식 아이템만 접근 가능"
  on public.food_items for all
  using (
    auth.uid() = (
      select user_id from public.meal_records
      where id = meal_record_id
    )
  );

-- ================================================
-- 6. 함수: 새 사용자 가입 시 프로필 자동 생성
-- ================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
    new.raw_user_meta_data->>'avatar_url'
  );

  -- 기본 일일 목표 생성
  insert into public.daily_goals (user_id)
  values (new.id);

  return new;
end;
$$ language plpgsql security definer;

-- 트리거: 새 사용자 가입 시 실행
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ================================================
-- 7. 함수: 프로필 업데이트 시 updated_at 자동 갱신
-- ================================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 트리거: profiles 테이블
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at();

-- 트리거: daily_goals 테이블
drop trigger if exists daily_goals_updated_at on public.daily_goals;
create trigger daily_goals_updated_at
  before update on public.daily_goals
  for each row execute procedure public.update_updated_at();

-- ================================================
-- 8. Storage 버킷: 음식 이미지
-- ================================================
-- Supabase Dashboard > Storage에서 'meal-images' 버킷 생성 필요
-- 또는 아래 SQL 실행 (Storage Extension 활성화 필요)

-- insert into storage.buckets (id, name, public)
-- values ('meal-images', 'meal-images', true)
-- on conflict (id) do nothing;

-- Storage 정책: 인증된 사용자만 자신의 폴더에 업로드 가능
-- create policy "사용자는 자신의 폴더에만 업로드 가능"
--   on storage.objects for insert
--   with check (
--     bucket_id = 'meal-images' and
--     auth.uid()::text = (storage.foldername(name))[1]
--   );

-- create policy "사용자는 자신의 이미지만 삭제 가능"
--   on storage.objects for delete
--   using (
--     bucket_id = 'meal-images' and
--     auth.uid()::text = (storage.foldername(name))[1]
--   );

-- create policy "모든 사용자가 이미지 조회 가능"
--   on storage.objects for select
--   using (bucket_id = 'meal-images');
