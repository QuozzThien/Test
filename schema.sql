create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student' check (role in ('admin','student')),
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(), name text not null unique, icon text, sort_order int default 0, is_active boolean default true, created_at timestamptz default now()
);
create table if not exists lessons (
  id uuid primary key default gen_random_uuid(), subject_id uuid not null references subjects(id) on delete cascade, title text not null, description text, sort_order int default 0, is_active boolean default true, created_at timestamptz default now()
);
create table if not exists questions (
  id uuid primary key default gen_random_uuid(), subject_id uuid references subjects(id) on delete set null, lesson_id uuid references lessons(id) on delete set null, question_text text not null, options jsonb not null, answer_index int not null check(answer_index between 0 and 3), explanation text, difficulty text default 'thong_hieu', source_text text, created_by uuid references auth.users(id), approved boolean default false, created_at timestamptz default now()
);
create table if not exists exams (
  id uuid primary key default gen_random_uuid(), subject_id uuid references subjects(id) on delete set null, lesson_id uuid references lessons(id) on delete set null, title text not null, minutes int not null default 15, question_count int not null default 20, form_count int not null default 1, attempt_limit int default 0, ranking_enabled boolean default true, ranking_mode text default 'best' check(ranking_mode in ('best','latest','average','first')), shuffle_questions boolean default true, shuffle_options boolean default true, is_published boolean default false, created_by uuid references auth.users(id), created_at timestamptz default now()
);
create table if not exists exam_forms (
  id uuid primary key default gen_random_uuid(), exam_id uuid not null references exams(id) on delete cascade, form_number int not null, unique(exam_id,form_number)
);
create table if not exists exam_questions (
  id uuid primary key default gen_random_uuid(), exam_form_id uuid not null references exam_forms(id) on delete cascade, question_id uuid not null references questions(id) on delete cascade, position int not null, unique(exam_form_id,position)
);
create table if not exists attempts (
  id uuid primary key default gen_random_uuid(), exam_id uuid not null references exams(id) on delete cascade, exam_form_id uuid references exam_forms(id) on delete set null, student_name text not null, student_class text not null, score numeric(5,2) not null, total_correct int not null, total_questions int not null, started_at timestamptz default now(), submitted_at timestamptz default now()
);
create table if not exists attempt_answers (
  id uuid primary key default gen_random_uuid(), attempt_id uuid not null references attempts(id) on delete cascade, question_id uuid not null references questions(id) on delete cascade, chosen_index int, correct_index int, is_correct boolean not null
);

insert into subjects(name,icon,sort_order) values
('Công nghệ','⚙️',1),('Toán','∑',2),('Tiếng Anh','A',3),('Vật lí','⚡',4),('Địa lí','🌍',5),('Lịch sử','🏛️',6),('GDKT&PL','⚖️',7)
on conflict(name) do nothing;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from profiles where id=auth.uid() and role='admin');
$$;

alter table profiles enable row level security; alter table subjects enable row level security; alter table lessons enable row level security; alter table questions enable row level security; alter table exams enable row level security; alter table exam_forms enable row level security; alter table exam_questions enable row level security; alter table attempts enable row level security; alter table attempt_answers enable row level security;

drop policy if exists subjects_public_read on subjects; create policy subjects_public_read on subjects for select using(is_active=true or public.is_admin());
drop policy if exists lessons_public_read on lessons; create policy lessons_public_read on lessons for select using(is_active=true or public.is_admin());
drop policy if exists questions_admin_all on questions; create policy questions_admin_all on questions for all using(public.is_admin()) with check(public.is_admin());
drop policy if exists exams_public_read on exams; create policy exams_public_read on exams for select using(is_published=true or public.is_admin());
drop policy if exists exams_admin_write on exams; create policy exams_admin_write on exams for all using(public.is_admin()) with check(public.is_admin());
drop policy if exists forms_public_read on exam_forms; create policy forms_public_read on exam_forms for select using(exists(select 1 from exams e where e.id=exam_id and (e.is_published=true or public.is_admin())));
drop policy if exists eq_public_read on exam_questions; create policy eq_public_read on exam_questions for select using(exists(select 1 from exam_forms f join exams e on e.id=f.exam_id where f.id=exam_form_id and (e.is_published=true or public.is_admin())));
drop policy if exists attempts_admin_read on attempts; create policy attempts_admin_read on attempts for select using(public.is_admin());
drop policy if exists answers_admin_read on attempt_answers; create policy answers_admin_read on attempt_answers for select using(public.is_admin());
drop policy if exists profiles_self on profiles; create policy profiles_self on profiles for select using(id=auth.uid() or public.is_admin());
