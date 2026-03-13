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

        // Estrazione Guida: di solito segue la tabella contatti
        // Cerchiamo la riga dopo "Nome Cognome Email Telefono"
        const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
        let guida = 'N/A';
        let contactHeaderIdx = lines.findIndex(l => l.includes('Nome') && l.includes('Cognome') && l.includes('Email'));
        if (contactHeaderIdx === -1) {
            contactHeaderIdx = lines.findIndex(l => l.includes('Email') && l.includes('Telefono'));
        }

        if (contactHeaderIdx !== -1 && lines.length > contactHeaderIdx + 1) {
            const contactsLineRaw = lines[contactHeaderIdx + 1];

            // Trova l'email (qualsiasi match es: georgediek@hotmail.com)
            const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
            const emailMatch = contactsLineRaw.match(emailRegex);

            if (emailMatch && emailMatch.index !== undefined) {
                const emailStr = emailMatch[0];
                const emailIndex = emailMatch.index;

                let nomeRaw = contactsLineRaw.substring(0, emailIndex).trim();
                let telRaw = contactsLineRaw.substring(emailIndex + emailStr.length).trim();

                let nomeFormattato = nomeRaw.replace(/([a-z])([A-Z])/g, '$1 $2').trim();

                let telFormattato = telRaw.replace(/\s+/g, '').replace(/[^\d+]/g, '');
                if (telFormattato.length >= 9) {
                    if (telFormattato.startsWith('39')) {
                        telFormattato = '+39 ' + telFormattato.substring(2).replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
                    } else if (!telFormattato.startsWith('+')) {
                        telFormattato = telFormattato.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
                    }
                }

                guida = `Nome Guida: ${nomeFormattato} | Mail: ${emailStr} | Tel: ${telFormattato || 'N/A'}`;
            } else {
                guida = contactsLineRaw;
            }
        }

        // 3. Estrazione Totale Partecipanti (Dal footer del PDF)
        let paxTotali = 0;
        const paxMatch = text.match(/Totale partecipanti:\s*(\d+)/i);
        if (paxMatch) {
            paxTotali = parseInt(paxMatch[1], 10);
        }

        // 4. Inserimento in Supabase (Solo Turno)
        const colors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
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
