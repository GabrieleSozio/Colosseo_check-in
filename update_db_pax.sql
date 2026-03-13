-- Aggiungi colonne per i dettagli PAX alla tabella bookings
ALTER TABLE public.bookings 
ADD COLUMN ad INTEGER DEFAULT 0,
ADD COLUMN st INTEGER DEFAULT 0,
ADD COLUMN ch INTEGER DEFAULT 0,
ADD COLUMN fr INTEGER DEFAULT 0;

-- Aggiungi RLS Policy per permettere l'eliminazione dei tour a chiunque (solo per dev)
-- Se avevi già eseguito ALTER TABLE public.tours DISABLE ROW LEVEL SECURITY; l'eliminazione funzionerà già.
