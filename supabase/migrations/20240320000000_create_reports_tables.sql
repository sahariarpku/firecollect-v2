-- Create reports table
create table public.reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  status text check (status in ('generating', 'completed', 'error')) not null default 'generating',
  search_query text not null,
  structure jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create report_sections table
create table public.report_sections (
  id uuid default gen_random_uuid() primary key,
  report_id uuid references public.reports(id) on delete cascade not null,
  section_name text not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies
alter table public.reports enable row level security;
alter table public.report_sections enable row level security;

create policy "Users can view their own reports"
  on public.reports for select
  using (auth.uid() = user_id);

create policy "Users can insert their own reports"
  on public.reports for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own reports"
  on public.reports for update
  using (auth.uid() = user_id);

create policy "Users can view sections of their reports"
  on public.report_sections for select
  using (exists (
    select 1 from public.reports
    where reports.id = report_sections.report_id
    and reports.user_id = auth.uid()
  ));

create policy "Users can insert sections to their reports"
  on public.report_sections for insert
  with check (exists (
    select 1 from public.reports
    where reports.id = report_sections.report_id
    and reports.user_id = auth.uid()
  ));

-- Create function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Create triggers for updated_at
create trigger handle_reports_updated_at
  before update on public.reports
  for each row
  execute function public.handle_updated_at();

create trigger handle_report_sections_updated_at
  before update on public.report_sections
  for each row
  execute function public.handle_updated_at(); 