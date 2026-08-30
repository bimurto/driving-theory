alter table public.learning_progress_snapshots
  drop constraint learning_progress_snapshots_progress_version_is_one,
  add constraint learning_progress_snapshots_progress_version_is_supported
    check ((progress ->> 'version')::integer in (1, 2));

-- Retain the established answer-progress merge while allowing ratings to merge independently.
create function public.merge_learning_progress_v1(existing_progress jsonb, incoming_progress jsonb)
returns jsonb language sql immutable strict set search_path = '' as $$
  select jsonb_build_object('version', 1, 'questions', coalesce(jsonb_object_agg(coalesce(e.key, i.key), case when e.value is null then i.value when i.value is null then e.value else public.merge_question_progress(e.value, i.value) end), '{}'::jsonb))
  from jsonb_each(existing_progress -> 'questions') e full join jsonb_each(incoming_progress -> 'questions') i on e.key = i.key;
$$;

create or replace function public.merge_learning_progress(existing_progress jsonb, incoming_progress jsonb)
returns jsonb language sql immutable strict set search_path = '' as $$
  with ratings as (select coalesce(e.key, i.key) key, case when e.value is null then i.value when i.value is null then e.value when (i.value ->> 'changedAt')::timestamptz >= (e.value ->> 'changedAt')::timestamptz then i.value else e.value end value from jsonb_each(coalesce(existing_progress -> 'starRatings', '{}'::jsonb)) e full join jsonb_each(coalesce(incoming_progress -> 'starRatings', '{}'::jsonb)) i on e.key = i.key)
  select jsonb_set(public.merge_learning_progress_v1(existing_progress, incoming_progress), '{starRatings}', coalesce((select jsonb_object_agg(key, value) from ratings), '{}'::jsonb)) || jsonb_build_object('version', 2);
$$;

revoke all on function public.merge_learning_progress_v1(jsonb, jsonb) from public;

create or replace function public.assert_valid_learning_progress_snapshot(candidate_progress jsonb)
returns void language plpgsql stable set search_path = '' as $$
declare rating jsonb;
begin
  if jsonb_typeof(candidate_progress) <> 'object' or jsonb_typeof(candidate_progress -> 'questions') <> 'object' or candidate_progress ->> 'version' not in ('1', '2') or exists (select from jsonb_each(candidate_progress -> 'questions') q where jsonb_typeof(q.value) <> 'object' or jsonb_typeof(q.value -> 'attempts') <> 'number' or jsonb_typeof(q.value -> 'correct') <> 'number' or jsonb_typeof(q.value -> 'ease') <> 'number' or jsonb_typeof(q.value -> 'intervalDays') <> 'number' or jsonb_typeof(q.value -> 'nextReviewAt') <> 'string' or jsonb_typeof(q.value -> 'lastAnsweredAt') <> 'string' or q.value ->> 'attempts' !~ '^(0|[1-9][0-9]*)$' or q.value ->> 'correct' !~ '^(0|[1-9][0-9]*)$' or q.value ->> 'ease' !~ '^[0-9]+(\.[0-9]+)?$' or q.value ->> 'intervalDays' !~ '^(0|[1-9][0-9]*)$' or (q.value ->> 'correct')::integer > (q.value ->> 'attempts')::integer) then raise exception 'invalid learning progress snapshot' using errcode = '22023'; end if;
  if candidate_progress ->> 'version' = '2' and jsonb_typeof(candidate_progress -> 'starRatings') <> 'object' then raise exception 'invalid learning progress snapshot' using errcode = '22023'; end if;
  for rating in select value from jsonb_each(coalesce(candidate_progress -> 'starRatings', '{}'::jsonb)) loop
    if jsonb_typeof(rating) <> 'object' or jsonb_typeof(rating -> 'rating') <> 'number' or rating ->> 'rating' not in ('0', '1', '2', '3') or jsonb_typeof(rating -> 'changedAt') <> 'string' then raise exception 'invalid learning progress snapshot' using errcode = '22023'; end if;
    perform (rating ->> 'changedAt')::timestamptz;
  end loop;
end;
$$;
