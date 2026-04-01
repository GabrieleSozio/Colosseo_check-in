-- 1. Aggiungi la colonna order_index alla tabella tours
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
