create function public.delete_own_learner_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  delete from auth.users where id = auth.uid();

  if not found then
    raise exception 'learner account not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.delete_own_learner_account() from public;
grant execute on function public.delete_own_learner_account() to authenticated;
