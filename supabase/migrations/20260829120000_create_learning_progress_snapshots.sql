create table public.learning_progress_snapshots (
  user_id uuid primary key references auth.users (id) on delete cascade,
  progress jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint learning_progress_snapshots_progress_is_an_object check (jsonb_typeof(progress) = 'object'),
  constraint learning_progress_snapshots_progress_has_questions check (jsonb_typeof(progress -> 'questions') = 'object'),
  constraint learning_progress_snapshots_progress_version_is_one check ((progress ->> 'version')::integer = 1)
);

alter table public.learning_progress_snapshots enable row level security;

create policy "Learners can read their own learning progress"
  on public.learning_progress_snapshots
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Learners can create their own learning progress"
  on public.learning_progress_snapshots
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Learners can update their own learning progress"
  on public.learning_progress_snapshots
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Learners can delete their own learning progress"
  on public.learning_progress_snapshots
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.learning_progress_snapshots to authenticated;

create function public.merge_question_progress(existing_question jsonb, incoming_question jsonb)
returns jsonb
language sql
immutable
strict
set search_path = ''
as $$
  with newest_question as (
    select case
      when (incoming_question ->> 'lastAnsweredAt')::timestamptz >= (existing_question ->> 'lastAnsweredAt')::timestamptz
        then incoming_question
      else existing_question
    end as value
  )
  select jsonb_build_object(
    'attempts', greatest((existing_question ->> 'attempts')::integer, (incoming_question ->> 'attempts')::integer),
    'correct', greatest((existing_question ->> 'correct')::integer, (incoming_question ->> 'correct')::integer),
    'ease', value -> 'ease',
    'intervalDays', value -> 'intervalDays',
    'nextReviewAt', value -> 'nextReviewAt',
    'lastAnsweredAt', value -> 'lastAnsweredAt'
  )
  from newest_question;
$$;

create function public.merge_learning_progress(existing_progress jsonb, incoming_progress jsonb)
returns jsonb
language sql
immutable
strict
set search_path = ''
as $$
  select jsonb_build_object(
    'version', 1,
    'questions', coalesce(
      jsonb_object_agg(coalesce(existing_questions.key, incoming_questions.key), case
        when existing_questions.value is null then incoming_questions.value
        when incoming_questions.value is null then existing_questions.value
        else public.merge_question_progress(existing_questions.value, incoming_questions.value)
      end),
      '{}'::jsonb
    )
  )
  from jsonb_each(existing_progress -> 'questions') as existing_questions
  full join jsonb_each(incoming_progress -> 'questions') as incoming_questions
    on existing_questions.key = incoming_questions.key;
$$;

create function public.merge_learning_progress_snapshot(incoming_progress jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  merged_progress jsonb;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if jsonb_typeof(incoming_progress) <> 'object'
    or jsonb_typeof(incoming_progress -> 'questions') <> 'object'
    or (incoming_progress ->> 'version')::integer <> 1 then
    raise exception 'invalid learning progress snapshot' using errcode = '22023';
  end if;

  insert into public.learning_progress_snapshots as snapshot (user_id, progress)
  values (auth.uid(), incoming_progress)
  on conflict (user_id) do update
    set progress = public.merge_learning_progress(snapshot.progress, excluded.progress),
        updated_at = timezone('utc', now())
  returning progress into merged_progress;

  return merged_progress;
end;
$$;

revoke all on function public.merge_question_progress(jsonb, jsonb) from public;
revoke all on function public.merge_learning_progress(jsonb, jsonb) from public;
revoke all on function public.merge_learning_progress_snapshot(jsonb) from public;
grant execute on function public.merge_learning_progress_snapshot(jsonb) to authenticated;
