-- Abilita l'estensione UUID (se non già abilitata)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabella tours
CREATE TABLE public.tours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titolo_file TEXT,
    orario TEXT,
    lingua TEXT,
    guida TEXT,
    colore_assegnato TEXT,
    canale_radio TEXT,
    totale_pax INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella bookings
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tour_id UUID REFERENCES public.tours(id) ON DELETE CASCADE,
    nome_cliente TEXT,
    pax INTEGER,
    codice_prenotazione TEXT,
    stato_checkin BOOLEAN DEFAULT FALSE,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disabilita temporaneamente RLS per lo sviluppo veloce (in prod aggiungere policy di sicurezza)
ALTER TABLE public.tours DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings DISABLE ROW LEVEL SECURITY;

-- Crea Bucket Storage per i PDF
INSERT INTO storage.buckets (id, name, public) 
VALUES ('liste-pdf', 'liste-pdf', true)
ON CONFLICT (id) DO NOTHING;

-- Policy pubblica per il bucket (Permette a chiunque di caricare ed eliminare in fase di dev)
CREATE POLICY "Public Access" ON storage.objects
FOR ALL USING (bucket_id = 'liste-pdf')
WITH CHECK (bucket_id = 'liste-pdf');
