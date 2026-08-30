alter table public.learning_progress_snapshots
  drop constraint learning_progress_snapshots_progress_version_is_supported,
  add constraint learning_progress_snapshots_progress_version_is_supported
    check ((progress ->> 'version')::integer in (1, 2, 3));

-- Notes are tombstoned instead of removed so a later deletion can win during an offline merge.
create or replace function public.merge_learning_progress(existing_progress jsonb, incoming_progress jsonb)
returns jsonb language sql immutable strict set search_path = '' as $$
  with ratings as (
    select coalesce(e.key, i.key) key,
      case when e.value is null then i.value when i.value is null then e.value
        when (i.value ->> 'changedAt')::timestamptz >= (e.value ->> 'changedAt')::timestamptz then i.value else e.value end value
    from jsonb_each(coalesce(existing_progress -> 'starRatings', '{}'::jsonb)) e
    full join jsonb_each(coalesce(incoming_progress -> 'starRatings', '{}'::jsonb)) i on e.key = i.key
  ), notes as (
    select coalesce(e.key, i.key) key,
      case when e.value is null then i.value when i.value is null then e.value
        when (i.value ->> 'changedAt')::timestamptz >= (e.value ->> 'changedAt')::timestamptz then i.value else e.value end value
    from jsonb_each(coalesce(existing_progress -> 'questionNotes', '{}'::jsonb)) e
    full join jsonb_each(coalesce(incoming_progress -> 'questionNotes', '{}'::jsonb)) i on e.key = i.key
  )
  select jsonb_set(
    jsonb_set(public.merge_learning_progress_v1(existing_progress, incoming_progress), '{starRatings}', coalesce((select jsonb_object_agg(key, value) from ratings), '{}'::jsonb)),
    '{questionNotes}', coalesce((select jsonb_object_agg(key, value) from notes), '{}'::jsonb)
  ) || jsonb_build_object('version', 3);
$$;

create or replace function public.assert_valid_learning_progress_snapshot(candidate_progress jsonb)
returns void language plpgsql stable set search_path = '' as $$
declare rating jsonb; note jsonb;
begin
  if jsonb_typeof(candidate_progress) is distinct from 'object' or jsonb_typeof(candidate_progress -> 'questions') is distinct from 'object' or ((candidate_progress ->> 'version') is distinct from '1' and (candidate_progress ->> 'version') is distinct from '2' and (candidate_progress ->> 'version') is distinct from '3') or exists (select from jsonb_each(candidate_progress -> 'questions') q where jsonb_typeof(q.value) is distinct from 'object' or jsonb_typeof(q.value -> 'attempts') is distinct from 'number' or jsonb_typeof(q.value -> 'correct') is distinct from 'number' or jsonb_typeof(q.value -> 'ease') is distinct from 'number' or jsonb_typeof(q.value -> 'intervalDays') is distinct from 'number' or jsonb_typeof(q.value -> 'nextReviewAt') is distinct from 'string' or jsonb_typeof(q.value -> 'lastAnsweredAt') is distinct from 'string' or (q.value ->> 'attempts') !~ '^(0|[1-9][0-9]*)$' or (q.value ->> 'correct') !~ '^(0|[1-9][0-9]*)$' or (q.value ->> 'ease') !~ '^[0-9]+(\.[0-9]+)?$' or (q.value ->> 'intervalDays') !~ '^(0|[1-9][0-9]*)$' or (q.value ->> 'correct')::integer > (q.value ->> 'attempts')::integer) then raise exception 'invalid learning progress snapshot' using errcode = '22023'; end if;
  if candidate_progress ->> 'version' in ('2', '3') and jsonb_typeof(candidate_progress -> 'starRatings') <> 'object' then raise exception 'invalid learning progress snapshot' using errcode = '22023'; end if;
  if candidate_progress ->> 'version' = '3' and jsonb_typeof(candidate_progress -> 'questionNotes') <> 'object' then raise exception 'invalid learning progress snapshot' using errcode = '22023'; end if;
  for rating in select value from jsonb_each(coalesce(candidate_progress -> 'starRatings', '{}'::jsonb)) loop
    if jsonb_typeof(rating) is distinct from 'object' or jsonb_typeof(rating -> 'rating') is distinct from 'number' or (rating ->> 'rating') not in ('0', '1', '2', '3') or jsonb_typeof(rating -> 'changedAt') is distinct from 'string' then raise exception 'invalid learning progress snapshot' using errcode = '22023'; end if;
    perform (rating ->> 'changedAt')::timestamptz;
  end loop;
  for note in select value from jsonb_each(coalesce(candidate_progress -> 'questionNotes', '{}'::jsonb)) loop
    if jsonb_typeof(note) is distinct from 'object' or (jsonb_typeof(note -> 'text') is distinct from 'string' and jsonb_typeof(note -> 'text') is distinct from 'null') or jsonb_typeof(note -> 'changedAt') is distinct from 'string' then raise exception 'invalid learning progress snapshot' using errcode = '22023'; end if;
    perform (note ->> 'changedAt')::timestamptz;
  end loop;
end;
$$;
