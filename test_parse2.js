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
let guida = 'N/A';
if (contactHeaderIdx !== -1 && lines.length > contactHeaderIdx + 1) {
    const contactsLineRaw = lines[contactHeaderIdx + 1];

    // Trova l'email, con qualsiasi dominio 
    const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const emailMatch = contactsLineRaw.match(emailRegex);

    if (emailMatch) {
        const emailStr = emailMatch[0];
        const emailIndex = emailMatch.index;

        let nomeRaw = contactsLineRaw.substring(0, emailIndex).trim(); // GeorgeDiek
        let telRaw = contactsLineRaw.substring(emailIndex + emailStr.length).trim(); // 3331246712

        // Mettiamo uno spazio prima di ogni lettera maiuscola, tranne la prima. Se fuso: George Diek
        let nomeFormattato = nomeRaw.replace(/([a-z])([A-Z])/g, '$1 $2').trim();

        // Formattiamo il telefono numerico (può mancare +39 o averlo fuso)
        let telFormattato = telRaw.replace(/\s+/g, '').replace(/[^\d+]/g, '');
        if (telFormattato.length >= 9) {
            if (telFormattato.startsWith('39')) {
                telFormattato = '+39 ' + telFormattato.substring(2).replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
            } else if (!telFormattato.startsWith('+')) {
                // assumiamo cell non prefissato
                telFormattato = telFormattato.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
            }
        }

        guida = `Nome Guida: ${nomeFormattato} | Mail: ${emailStr} | Tel: ${telFormattato || 'N/A'}`;
    }
}
console.log("-> GUIDA EXT:", guida);

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

    // Troviamo il codice. Deve essere numerico lungo (Viator: >8) o alfanumerico con GYG lungo.
    // Dobbiamo estrarlo accuratamente:
    let codicePuntatore = trimmedStart.match(/(GYG[A-Z0-9]{8,15})/i) || trimmedStart.match(/(\d{9,15})/);

    if (codicePuntatore) {
        let codiceRaw = codicePuntatore[0];
        // Se è "GYGGYG..."" togliamo il primo GYG
        if (codiceRaw.toUpperCase().startsWith('GYGGYG')) {
            codiceRaw = codiceRaw.substring(3);
        }
        codice = codiceRaw;

        const splitParts = trimmedStart.split(codicePuntatore[0]);
        let presix = splitParts[0] ? splitParts[0].trim() : '';
        if (presix.toUpperCase().includes('GYG')) canale = 'GYG';
        else if (presix.toUpperCase().includes('VIATOR')) canale = 'Viator';
        else if (presix.length > 0) canale = presix;

        let postix = splitParts[1] ? splitParts[1].trim() : '';
        // Separazione Camel Case del nome
        nomeCliente = postix.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
        // Spazia anche i trattini per MACDONALD-CLARK formattando in bel modo
        nomeCliente = nomeCliente.replace(/-/g, ' - ');
        // Stacca una mail fusa al nome? Non qui.
        // Stacca cognomi uniti tutto maiuscolo (è fottuto se tutto MAIUSCOLO EX: DAVIDFLINT senza vocabolario...)
        // L'HTML non ha vocabolario, l'unica separazione reale per nomi tuttimaiuscoli uniti è usare le minuscole se ci sono o tenerli.
        // Tenteremo di estrapolare dai nomi MACDONALD e FLINT.
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
