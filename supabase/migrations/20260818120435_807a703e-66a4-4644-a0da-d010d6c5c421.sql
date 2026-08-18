UPDATE public.site_content
SET value = jsonb_set(value, '{about.joao:tags}', '["Ilustração","Tatuagem","Design"]'::jsonb, true),
    updated_at = now()
WHERE key = 'card-tags';