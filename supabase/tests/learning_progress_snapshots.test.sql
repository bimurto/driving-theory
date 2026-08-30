begin;

select plan(25);

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

select throws_ok(
  $$update public.learning_progress_snapshots set progress = '{"version":1,"questions":{}}'::jsonb$$,
  '42501',
  'permission denied for table learning_progress_snapshots',
  'a learner cannot bypass the atomic merge with a direct snapshot update'
);

select throws_ok(
  $$select public.merge_learning_progress_snapshot('{"version":1,"questions":{"question-a":{"attempts":"one","correct":1,"ease":2.6,"intervalDays":1,"nextReviewAt":"2026-09-01T10:00:00.000Z","lastAnsweredAt":"2026-08-31T10:00:00.000Z"}}}'::jsonb)$$,
  '22023',
  'invalid learning progress snapshot',
  'the atomic merge rejects non-numeric question attempts'
);

select throws_ok(
  $$select public.merge_learning_progress_snapshot('{"version":1,"questions":{"question-a":{"attempts":1,"correct":2,"ease":2.6,"intervalDays":1,"nextReviewAt":"2026-09-01T10:00:00.000Z","lastAnsweredAt":"2026-08-31T10:00:00.000Z"}}}'::jsonb)$$,
  '22023',
  'invalid learning progress snapshot',
  'the atomic merge rejects more correct answers than attempts'
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

select lives_ok(
  $$select public.merge_learning_progress_snapshot('{"version":2,"questions":{},"starRatings":{"question-a":{"rating":3,"changedAt":"2026-09-02T10:00:00.000Z"}}}'::jsonb)$$,
  'a version-one cloud snapshot migrates when a starred rating is synchronized'
);

select is(
  (select progress->>'version' from public.learning_progress_snapshots),
  '2',
  'the merged snapshot is rating-capable'
);

select is(
  (select progress->'starRatings'->'question-a'->>'rating' from public.learning_progress_snapshots),
  '3',
  'the merged snapshot retains a star rating'
);

select lives_ok(
  $$select public.merge_learning_progress_snapshot('{"version":2,"questions":{},"starRatings":{"question-a":{"rating":0,"changedAt":"2026-09-03T10:00:00.000Z"}}}'::jsonb)$$,
  'a newer unstar rating can synchronize'
);

select is(
  (select progress->'starRatings'->'question-a'->>'rating' from public.learning_progress_snapshots),
  '0',
  'a newer unstar rating defeats an older nonzero rating'
);

select throws_ok(
  $$select public.merge_learning_progress_snapshot('{"version":2,"questions":{},"starRatings":{"question-a":{"rating":"3","changedAt":"2026-09-03T10:00:00.000Z"}}}'::jsonb)$$,
  '22023',
  'invalid learning progress snapshot',
  'the atomic merge rejects a non-numeric star rating'
);

select throws_ok(
  $$select public.merge_learning_progress_snapshot('{"questions":{}}'::jsonb)$$,
  '22023', 'invalid learning progress snapshot', 'the atomic merge rejects a snapshot without a version'
);

select throws_ok(
  $$select public.merge_learning_progress_snapshot('{"version":2,"questions":{},"starRatings":{"question-a":{"changedAt":"2026-09-03T10:00:00.000Z"}}}'::jsonb)$$,
  '22023', 'invalid learning progress snapshot', 'the atomic merge rejects a star rating without a rating value'
);

select throws_ok(
  $$select public.merge_learning_progress_snapshot('{"version":2,"questions":{},"starRatings":{"question-a":{"rating":3}}}'::jsonb)$$,
  '22023', 'invalid learning progress snapshot', 'the atomic merge rejects a star rating without a change time'
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

select lives_ok(
  $$select public.delete_own_learner_account()$$,
  'a learner can delete their own learner account'
);

reset role;

select is(
  (select count(*) from auth.users where id = '00000000-0000-0000-0000-000000000001'),
  0::bigint,
  'deleting a learner account removes its authentication identity'
);

select is(
  (select count(*) from public.learning_progress_snapshots),
  1::bigint,
  'deleting a learner account preserves another learner account snapshot'
);

select * from finish();

rollback;
