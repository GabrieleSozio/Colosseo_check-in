-- 1. Create a new storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('tours-pdfs', 'tours-pdfs', true);

-- 2. Add policies so anyone can read/write to the bucket (for development purposes)
CREATE POLICY "Public Read Access" on storage.objects FOR SELECT USING ( bucket_id = 'tours-pdfs' );
CREATE POLICY "Public Insert Access" on storage.objects FOR INSERT WITH CHECK ( bucket_id = 'tours-pdfs' );

-- 3. Update the tours table to support the raw PDF url and visual overlay data
ALTER TABLE public.tours ADD COLUMN pdf_url TEXT;
ALTER TABLE public.tours ADD COLUMN overlay_data JSONB DEFAULT '[]'::jsonb;
