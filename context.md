# Contesto dell'Applicazione "Colosseo Check-in"

## Scopo
Applicazione web sviluppata per un'agenzia turistica al fine di gestire i check-in dei partecipanti ai tour in maniera digitale e interattiva, scansionando e manipolando le liste originali in PDF. Sostituisce la carta stampata con un'interfaccia fruibile da tablet.

## Stack Tecnologico
- **Frontend & App Framework**: Next.js (App Router), React, Tailwind CSS, Lucide React (Icone).
- **Backend & Database**: Supabase (Database PostgreSQL + layer API). Tabella centrale: `tours`.
- **Librerie Chiave**: `react-pdf` (per il render e l'interazione con i PDF delle liste), `react-qrcode-logo` (per la generazione di QR code altamente tracciabili dal cliente).

## Architettura e Flusso Dati

L'applicativo si suddivide in 3 viste primarie:

1. **Dashboard (HomeClient)**: 
   - Griglia di _Cards_ che mostrano tutti i tour della giornata estratti dal database Supabase.
   - Permette di accedere alla vista singola del tour (tramite click sulla lente).
   - In alto a destra è presente l'interruttore "Gallery View" (Visualizzazione a Galleria) che permette di navigare tutte le liste strisciando su schermo o con le frecce.
   - Sugli indicatori esterni si vede a colpo d'occhio stato completato, e se c'è presenza di passeggeri "No Show" o "Solo Tix".
   - È presente un pulsante di "Upload" per caricare nuovi PDF. L'upload attiva una cloud function (tramite `pdf-parse`) che intercetta ora, lingua e guida scansionando chirurgicamente il testo del file.

2. **Gestione Check-in Interno (TourClient & GalleryView)**:
   - Renderizza il file PDF assegnato, sovrapponendovi un _canvas_ invisibile per permettere ai coordinatori di tracciare le righe con il dito sul tablet.
   - Strumenti Toolbar interattivi (posizionati in alto in Gallery, e al centro nella visualizzazione Singola):
     - **Arrivato (Verde)**
     - **No-Show (Rosso)**
     - **Dividi Gruppo (Nero/Forbici)**
     - **Solo Tix (Giallo/Biglietto)**
   - Input Fields ed Editing: Si possono stabilire manualmente info custom come **Canale Radio**, **Colore del Tour**, **Numero Partenza**, **ID Gruppo** e **Stato (Boarding/Departed)**. Le informazioni si auto-salvano sul DB supabase su ogni cambiamento.
   - **QR Code Generato**: A schermo per ogni tour (nell'angolo in alto a destra nella Gallery) si autogenera un enorme QRCode colorato (con colore del gruppo + bilanciamento automatico della luminosità e Low EC-Level per la massima leggibilità). Che riporta all'url unico dedicato al cliente finale.

3. **Interfaccia Cliente (Client View)**:
   - È la vista "mobile" creata dinamicamente con lo sfondo del colore del gruppo e un testo gigante per indicare il **Canale Radio** agli avventori. 
   - Scansionando il QR l'utente vi entra. 
   - Oltre al canale, l'app presenta una richiesta *"How many people are you?"* in cui il visitatore può digitare o scrollare un numero (pax) da mostrare subito dal suo schermo all'operatore della consegna radio.

## Evoluzioni e Fix Importanti Risolti:
- **Gestione Dinamica `react-pdf` ed SSR (DOMMatrix Error):** Poichè NextJS crashava nel provar a renderizzare `react-pdf` lato server, i componenti "TourClient" e "HomeClient" sono stati astratti e inglobati in importazioni `dynamic({ ssr: false })` dentro i loro root file di `page.tsx`. Ciò previene ogni errore server-side in start-up.
- **Strumenti "Swipe":** Sulla barra di navigazione della Gallery View si può strisciare verso sinistra o verso destra per cambiare lista in maniera "mobile native", lasciando il PDF touchabile solo per le annotazioni.

## Tabella Database Supabase (`tours`)
- `id` (UUID - Primary Key)
- `created_at` (Timestamp)
- `titolo_file` (Text)
- `pdf_url` (Text)
- `orario` (Text)
- `lingua` (Text)
- `guida` (Text)
- `totale_pax` (Integer)
- `canale_radio` (Text)
- `colore_assegnato` (Text - codice HEX)
- `numero_partenza` (Text)
- `numero_gruppo` (Text)
- `stato` (Text - "Boarding" | "Departed")
- `overlay_data` (JSONB) -> Salva l'array di tutti i markers (Strumenti Check, No Show ecc...) sovrapposti al PDF `{id, x, y, page, type}`.
