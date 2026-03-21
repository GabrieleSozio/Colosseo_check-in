-- Esegui questo script nel SQL Editor della dashboard Supabase
-- per aggiungere le nuove colonne "numero_partenza" e "stato" alla tabella tours.

ALTER TABLE public.tours
ADD COLUMN IF NOT EXISTS numero_partenza text DEFAULT '';

ALTER TABLE public.tours
ADD COLUMN IF NOT EXISTS stato text DEFAULT 'Boarding';
