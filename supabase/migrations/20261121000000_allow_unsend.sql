create policy "ascents_delete"
  on public.ascents for delete
  to authenticated
  using (climber_id = auth.uid());
