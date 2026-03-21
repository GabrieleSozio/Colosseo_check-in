# Contesto dell'Applicazione: Check-in Agenzia Turistica (Colosseo Check-in)

Questo documento riassume il contesto, l'architettura e le funzionalità dell'applicazione sviluppata in questo workspace, per potervi fare riferimento in futuro in caso di perdita della cronologia della chat.

## 1. Stack Tecnologico
- **Frontend / Fullstack Framework:** Next.js (App Router, versione React 19).
- **Styling:** Tailwind CSS.
- **Icone:** Lucide React.
- **Backend / Database:** Supabase (PostgreSQL per il database, Supabase Storage per i file PDF).
- **Gestione PDF:** `pdf-parse` per estrarre il testo lato server, `react-pdf` per l'eventuale rendering lato client.

## 2. Architettura del Database (Supabase)
L'applicazione si appoggia su Supabase con le seguenti tabelle principali:
- **`tours`**: Memorizza le informazioni principali di ogni gruppo turistico.
  - Campi principali: `id`, `titolo_file`, `orario`, `lingua`, `guida` (estratta tramite la mail), `colore_assegnato`, `canale_radio`, `totale_pax`.
  - Campi aggiunti successivamente: `pdf_url` (link al PDF caricato nello storage), `overlay_data` (JSONB per salvare i marker visivi come check o noshow), `numero_gruppo` (per suddividere liste in più gruppi).
- **`bookings`**: (Presente nel setup iniziale) Relazionata ai `tours` per gestire le prenotazioni specifiche o i check-in dei singoli clienti.
- **Storage Buckets**: `liste-pdf` e `tours-pdfs` per il caricamento dei file originali.

## 3. Flusso Principale dell'Applicazione
1. **Upload del PDF**: L'utente carica un PDF contenente la lista dei partecipanti al tour tramite un `UploadButton` nella Home.
2. **Parsing lato Server (`src/app/api/upload/route.ts`)**: Il file viene inviato all'API, dove `pdf-parse` estrae il testo. Tramite espressioni regolari (Regex) vengono ricavati in automatico:
   - Orario del tour.
   - Lingua.
   - Nome della guida (cercando la riga che contiene la '@' dell'email).
   - Numero totale dei partecipanti (dal footer "Totale partecipanti:").
3. **Salvataggio e Storage**: Viene creato un record nella tabella `tours` con un colore assegnato casualmente per distinguerlo visivamente. Il file PDF originale viene caricato nel bucket Supabase `tours-pdfs` e il link viene salvato nel record.
4. **Visualizzazione Dashboard (`src/app/HomeClient.tsx`)**: La pagina principale mostra tutte le liste caricate (i "tours di oggi") sotto forma di card colorate. 
   - Le card mostrano orario, guida, lingua, numero PAX e indicatori di stato (es. "Tutti Arrivati" o "No Show Presenti" in base ai dati di `overlay_data`).
   - Sono presenti filtri per orario, lingua e ricerca testuale per il nome della guida.

## 4. Funzionalità Aggiuntive e Strumenti (Sviluppati di Recente)
- **Gestione Check-in Visuale**: La dashboard elabora i dati `overlay_data` che contengono l'esito del check-in (tipo: `check` o `noshow`). Permette di capire a colpo d'occhio se tutti i clienti sono arrivati o se ci sono stati dei no-show.
- **Tool "Split Group" (`numero_gruppo`)**: È stata aggiunta la possibilità di contrassegnare o dividere le liste con un "Gruppo X" (es. Gruppo 1, Gruppo 2) visibile nella card, utile quando un singolo PDF comprende più sottogruppi.
- **CRM Clienti**: In altre parti dell'app è stata creata (o in via di sviluppo) un'area CRM per gestire i dati dei clienti (Preventivi, Fatture) con funzionalità di edit dal dettaglio cliente.

## 5. File Importanti
- `src/app/page.tsx` & `src/app/HomeClient.tsx`: Gestiscono la UI principale e il recupero dati dalla tabella `tours`.
- `src/app/api/upload/route.ts`: Contiene la logica critica di estrazione dati dai file PDF aziendali.
- `supabase_setup.sql` & `supabase_pdf_update.sql` & `update_db_gruppo.sql`: Script SQL che contengono lo schema del database e le migrazioni aggiunte strada facendo.

Conserva questo file per riprendere il lavoro da dove lo avevamo lasciato qualora si perdesse nuovamente lo storico della chat.
