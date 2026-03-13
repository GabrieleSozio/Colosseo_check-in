import { NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';
import { supabase } from '@/lib/supabase';

// Forza l'uso di Node.js (non edge) per poter usare pdf-parse che dipende da fs
export const runtime = 'nodejs';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'Nessun file caricato' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // 1. Parsing del testo dal PDF
        const pdfData = await pdfParse(buffer);
        const text = String(pdfData.text);

        // 2. Estrazione Metadati
        const orarioMatch = text.match(/(\d{2}:\d{2})/);
        const orario = orarioMatch ? orarioMatch[1] : '00:00';

        const linguaMatch = text.match(/\d{2}:\d{2}\s+(.*?)\s+(?:STD|del)/i);
        const lingua = linguaMatch ? linguaMatch[1].trim() : 'Sconosciuta';

        // Estrazione Guida: Rollback al metodo originario affidabile
        // Invece di spacchettare Nome/Mail/Tel con regex complesse che falliscono su layout strani, 
        // intercettiamo la prima riga che contiene una mail (@) e la salviamo per intero.
        const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
        let guida = 'N/A';

        const rigaConMail = lines.find(l => l.includes('@') && l.length > 10 && !l.toLowerCase().includes('totale partecipanti'));
        if (rigaConMail) {
            guida = rigaConMail; // Salviamo la riga cruda
        }

        // 3. Estrazione Totale Partecipanti (Dal footer del PDF)
        let paxTotali = 0;
        const paxMatch = text.match(/Totale partecipanti:\s*(\d+)/i);
        if (paxMatch) {
            paxTotali = parseInt(paxMatch[1], 10);
        }

        // 4. Inserimento in Supabase (Solo Turno)
        const colors = ['#8B5CF6', '#EAB308', '#EF4444', '#F97316', '#1D4ED8', '#0EA5E9', '#15803D', '#22C55E', '#78350F', '#171717', '#FFFFFF', '#D946EF', '#FBCFE8'];
        const assignedColor = colors[Math.floor(Math.random() * colors.length)];

        // Generiamo l'ID univoco o ce lo facciamo restituire
        const { data: tourData, error: tourError } = await supabase
            .from('tours')
            .insert({
                titolo_file: file.name,
                orario,
                lingua,
                guida,
                colore_assegnato: assignedColor,
                canale_radio: '',
                totale_pax: paxTotali,
                overlay_data: []
            })
            .select('id')
            .single();

        if (tourError || !tourData) {
            throw new Error(`Errore inserimento tour: ${tourError?.message}`);
        }

        const { id: tourId } = tourData;

        // 5. Caricamento del file PDF sul nuovo storage
        const fileName = `tour_${tourId}_${Date.now()}.pdf`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('tours-pdfs')
            .upload(fileName, file);

        if (uploadError) {
            console.error("Errore upload PDF", uploadError);
        }

        if (uploadData) {
            const { data } = supabase.storage.from('tours-pdfs').getPublicUrl(fileName);
            // Aggiorna il record inserendo l'URL
            await supabase.from('tours').update({ pdf_url: data.publicUrl }).eq('id', tourId);
        }

        return NextResponse.json({ success: true, tourId }, { status: 200 });

    } catch (error: unknown) {
        console.error('Upload Error:', error);
        const msg = error instanceof Error ? error.message : 'Errore sconosciuto';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
