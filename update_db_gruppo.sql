-- Esegui questo script nel SQL Editor della dashboard Supabase
-- per aggiungere la colonna numero_gruppo a tutti i tour esistenti e futuri.

ALTER TABLE public.tours
ADD COLUMN IF NOT EXISTS numero_gruppo text DEFAULT '';
