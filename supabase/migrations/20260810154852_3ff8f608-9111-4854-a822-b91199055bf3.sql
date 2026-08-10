create policy "model_assets_objects_read" on storage.objects
  for select to authenticated using (bucket_id = 'model-assets');
create policy "model_assets_objects_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'model-assets');
create policy "model_assets_objects_update" on storage.objects
  for update to authenticated using (bucket_id = 'model-assets') with check (bucket_id = 'model-assets');
create policy "model_assets_objects_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'model-assets');