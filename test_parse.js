const testoSimulato = `
Elenco Partenza Colosseo Regular 10:00 Inglese STD del 11/03/2026

Nome   Cognome   Email   Telefono
George  Diek      georgediek@hotmail.com   3331246712

Azienda Canale Codice Nome Cliente Data PAX AD ST CH FR Note
Enjoy Rome GYG GYG83XMY27K5 ABBY MACDONALD-CLARK 28/02/2026 2 2 # GIO
Enjoy Rome GYG GYG6H8GWQNAB DAVID FLINT 07/03/2026 2 2 # GIO
Enjoy Rome GYG GYGKBGH8WQLA DEBORAH BRIDGES 03/03/2026 2 2 # GIO
Enjoy Rome GYG GYGX7NLXZMW9 GRAHAM FOXLEY 22/02/2026 2 2 # GIO
Enjoy Rome Viator 1365100475 HANNAH JEFFERY 20/02/2026 1 1 # GIO
Enjoy Rome Viator 1368246137 RICHARD MORRISON 01/03/2026 4 2 2 # GIO
Enjoy Rome Viator 1368154325 ZOLTAN MATHE 01/03/2026 1 1 # GIO
`;

// Simuliamo l'estrazione fusa che fa pdf-parse
const text = testoSimulato.split('\n').map(l => {
    if (l.includes('George') && l.includes('Diek')) return "GeorgeDiekgeorgediek@hotmail.com3331246712";
    if (l.includes('Enjoy Rome') && l.includes('GYG83')) return "Enjoy RomeGYG GYG83XMY27K5ABBY MACDONALD-CLARK28/02/202622# GIO";
    if (l.includes('Enjoy Rome') && l.includes('DAVID')) return "Enjoy RomeGYGGYG6H8GWQNABDAVIDFLINT07/03/202622# GIO";
    if (l.includes('Enjoy Rome') && l.includes('RICHARD')) return "Enjoy RomeViator1368246137RICHARD MORRISON01/03/2026422# GIO";
    return l.replace(/\s+/g, '');
}).join('\n');

const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');

// 1. GUIDA: 
const contactHeaderIdx = lines.findIndex(l => l.includes('Nome') && l.includes('Cognome') && l.includes('Email'));
if (contactHeaderIdx !== -1 && lines.length > contactHeaderIdx + 1) {
    const contactsLineRaw = lines[contactHeaderIdx + 1];
    const emailMatch = contactsLineRaw.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);

    if (emailMatch) {
        const email = emailMatch[1];
        const emailIndex = emailMatch.index;

        let nomeRaw = contactsLineRaw.substring(0, emailIndex);
        let telRaw = contactsLineRaw.substring(emailIndex + email.length);

        let nomeFormattato = nomeRaw.replace(/([a-z])([A-Z])/g, '$1 $2').trim();

        let telFormattato = telRaw.replace(/\s+/g, '');
        if (telFormattato.startsWith('39')) {
            telFormattato = '+39 ' + telFormattato.substring(2).replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
        } else if (telFormattato.length > 5) {
            telFormattato = telFormattato.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
        }

        console.log(`GUIDA: Nome Guida: ${nomeFormattato} | Mail: ${email} | Tel: ${telFormattato || 'N/A'}`);
    }
}

// 2. CLIENTI:
for (const line of lines) {
    if (line.includes('Azienda') || line.includes('NomeCliente') || line.includes('ElencoPartenza') || line.includes('Totalepartecipanti')) continue;

    const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (!dateMatch) continue;

    const primaDellaData = line.split(dateMatch[1])[0].trim();
    const dopoLaData = line.split(dateMatch[1])[1]?.trim() || '';

    let codice = 'ND';
    let nomeCliente = primaDellaData;
    let canale = 'ND';

    // Rimuoviamo Enjoy Rome
    let trimmedStart = primaDellaData.replace(/EnjoyRome/i, '').replace(/Enjoy Rome/i, '').trim();

    // Troviamo codice: O inizia con GYG e poi ha NUMERI, oppure sono solo > 9 Numeri di fila (Viator)
    // Es. GYG83XMY27K5, GYG6H8GWQNAB
    // ATTENZIONE: Se precede un "GYG" generico prima del codice, rischiamo di pescarlo. 
    // Es. "GYGGYG83XMY27K5" -> regex dovrà prendere da "GYG[A-Z0-9]{5,}" ma da DESTRA verso SINISTRA.
    const regexCodici = /(GYG[A-Z0-9]{8,15})|(\d{9,15})/;
    const codiceMatch = trimmedStart.match(regexCodici);

    if (codiceMatch) {
        codice = codiceMatch[0]; // Intero match

        if (codice.startsWith('GYGGYG')) {
            codice = codice.replace('GYG', ''); // Correggiamo se fuso pre-canale
        }

        const parts = trimmedStart.split(codiceMatch[0]);

        let presix = parts[0];
        if (presix.includes('GYG')) canale = 'GYG';
        else if (presix.includes('Viator') || presix.includes('viator')) canale = 'Viator';
        else if (presix.length > 0) canale = presix;

        let postix = parts[1] || '';
        nomeCliente = postix.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
    }

    // PAX 
    let digitTokens = [];
    let noteText = '';
    const chars = dopoLaData.split('');
    let i = 0;
    while (i < chars.length) {
        if (/[0-9]/.test(chars[i])) {
            digitTokens.push(chars[i]);
            i++;
        } else {
            noteText = dopoLaData.substring(i);
            break;
        }
    }

    let pax = 1, ad = 1, st = 0, ch = 0, fr = 0;
    if (digitTokens.length === 2) {
        pax = parseInt(digitTokens[0]); ad = parseInt(digitTokens[1]);
    } else if (digitTokens.length === 3) {
        pax = parseInt(digitTokens[0]); ad = parseInt(digitTokens[1]); st = parseInt(digitTokens[2]);
    } else if (digitTokens.length > 3) {
        pax = parseInt(digitTokens[0]); ad = parseInt(digitTokens[1]); st = parseInt(digitTokens[2]); ch = parseInt(digitTokens[3]);
    } else if (digitTokens.length === 1) {
        pax = parseInt(digitTokens[0]); ad = pax;
    }

    console.log(`CLIENTE -> Canale: ${canale} | Codice: ${codice} | Nome: ${nomeCliente} | PAX: ${pax} AD: ${ad} ST: ${st} | Note: ${noteText}`);
}
