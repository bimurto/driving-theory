begin;

select plan(10);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
values
  ('00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'learner-a@example.test', 'not-used', now()),
  ('00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'learner-b@example.test', 'not-used', now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$select public.merge_learning_progress_snapshot('{"version":1,"questions":{"question-a":{"attempts":1,"correct":1,"ease":2.6,"intervalDays":1,"nextReviewAt":"2026-09-01T10:00:00.000Z","lastAnsweredAt":"2026-08-31T10:00:00.000Z"}}}'::jsonb)$$,
  'an authenticated learner can create a learning-progress snapshot'
);

select is(
  (select progress->'questions'->'question-a'->>'attempts' from public.learning_progress_snapshots),
  '1',
  'a learner can read their own learning-progress snapshot'
);

select lives_ok(
  $$select public.merge_learning_progress_snapshot('{"version":1,"questions":{"question-a":{"attempts":3,"correct":2,"ease":2.8,"intervalDays":4,"nextReviewAt":"2026-09-04T10:00:00.000Z","lastAnsweredAt":"2026-09-01T10:00:00.000Z"},"question-b":{"attempts":1,"correct":0,"ease":2.3,"intervalDays":1,"nextReviewAt":"2026-09-02T10:00:00.000Z","lastAnsweredAt":"2026-09-01T10:00:00.000Z"}}}'::jsonb)$$,
  'an authenticated learner can merge another device snapshot'
);

select is(
  (select progress->'questions'->'question-a'->>'attempts' from public.learning_progress_snapshots),
  '3',
  'the merge keeps the greatest attempt count'
);

select is(
  (select progress->'questions'->'question-a'->>'lastAnsweredAt' from public.learning_progress_snapshots),
  '2026-09-01T10:00:00.000Z',
  'the merge keeps scheduling fields from the most recent answer'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);

select is(
  (select count(*) from public.learning_progress_snapshots),
  0::bigint,
  'row-level security hides another learner account snapshot'
);

select lives_ok(
  $$select public.merge_learning_progress_snapshot('{"version":1,"questions":{}}'::jsonb)$$,
  'a second learner can create their own learning-progress snapshot'
);

select is(
  (select count(*) from public.learning_progress_snapshots),
  1::bigint,
  'the second learner can read only their own snapshot'
);

select lives_ok(
  $$delete from public.learning_progress_snapshots where user_id = '00000000-0000-0000-0000-000000000001'$$,
  'row-level security prevents a learner from deleting another learner account snapshot'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

select is(
  (select count(*) from public.learning_progress_snapshots),
  1::bigint,
  'another learner cannot delete the original learner account snapshot'
);

select * from finish();

rollback;
