"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { QRCode } from 'react-qrcode-logo';
import { Check, X, Users, ArrowLeft, Radio, Palette, Edit3, Trash2, Scissors } from 'lucide-react';
import Link from 'next/link';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Tour {
    id: string;
    titolo_file: string;
    orario: string;
    totale_pax: number;
    colore_assegnato: string;
    canale_radio: string;
    guida: string;
    pdf_url?: string;
    overlay_data?: any;
    numero_gruppo?: string;
}

interface Marker {
    id: string;
    x: number;
    y: number;
    page: number;
    type: 'check' | 'noshow' | 'split';
}

export default function TourClient({ initialTour }: { initialTour: Tour, initialBookings?: any[] }) {
    const [tour, setTour] = useState(initialTour);
    const [markers, setMarkers] = useState<Marker[]>([]);
    const [numPages, setNumPages] = useState<number>();
    const [activeTool, setActiveTool] = useState<'check' | 'noshow' | 'split' | null>(null);
    const [pageWidth, setPageWidth] = useState(800);

    useEffect(() => {
        // Parse the initial markers from DB
        try {
            if (tour.overlay_data) {
                const parsed = typeof tour.overlay_data === 'string' ? JSON.parse(tour.overlay_data) : tour.overlay_data;
                if (Array.isArray(parsed)) setMarkers(parsed);
            }
        } catch (e) {
            console.error("Errore parse markers:", e);
        }

        // Responsiveness per il PDF (Ingrandito come richiesto)
        const handleResize = () => setPageWidth(Math.min(window.innerWidth - 32, 1200));
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [tour.overlay_data]);

    const colors = [
        { name: 'Viola', hex: '#8B5CF6' },
        { name: 'Giallo', hex: '#EAB308' },
        { name: 'Rosso', hex: '#EF4444' },
        { name: 'Arancione', hex: '#F97316' },
        { name: 'Blu Scuro', hex: '#1D4ED8' },
        { name: 'Azzurro', hex: '#0EA5E9' },
        { name: 'Verde Scuro', hex: '#15803D' },
        { name: 'Verde Chiaro', hex: '#22C55E' },
        { name: 'Marrone', hex: '#A16207' },
        { name: 'Nero', hex: '#171717' },
        { name: 'Bianco', hex: '#FFFFFF' },
        { name: 'Fucsia', hex: '#D946EF' },
        { name: 'Rosa Chiaro', hex: '#F472B6' }
    ];

    const handleUpdateTourInfo = async (field: string, value: string) => {
        setTour(prev => ({ ...prev, [field]: value }));
        await supabase.from('tours').update({ [field]: value }).eq('id', tour.id);
    };

    const saveMarkers = async (newMarkers: Marker[]) => {
        setMarkers(newMarkers);
        await supabase.from('tours').update({ overlay_data: newMarkers }).eq('id', tour.id);
    };

    const handlePageClick = (e: React.MouseEvent<HTMLDivElement>, pageIndex: number) => {
        if (!activeTool) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        const newMarker: Marker = {
            id: Date.now().toString(),
            x,
            y,
            page: pageIndex,
            type: activeTool
        };

        saveMarkers([...markers, newMarker]);
    };

    const handleRemoveMarker = (e: React.MouseEvent, markerId: string) => {
        e.stopPropagation();
        const conf = window.confirm("Sei sicuro di voler rimuovere questo stato o sbarramento dalla riga?");
        if (conf) {
            saveMarkers(markers.filter(m => m.id !== markerId));
        }
    };

    function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
        setNumPages(numPages);
    }

    const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const qrUrl = `${currentUrl}/client-view/${tour.id}`;

    // Non essendoci più bookings testuali con calcolo esatto pax, ci affidiamo al conteggio markers per i checks
    const arrivedCount = markers.filter(m => m.type === 'check').length;

    return (
        <main className="min-h-screen bg-gray-50 pb-20">
            {/* HEADER */}
            <header className="bg-white px-4 pt-8 pb-4 shadow-sm" style={{ borderBottomColor: tour.colore_assegnato, borderBottomWidth: '4px' }}>
                <div className="flex items-center gap-4 mb-2">
                    <Link href="/" className="p-2 rounded-full hover:bg-gray-100 transition">
                        <ArrowLeft className="w-6 h-6 text-gray-700" />
                    </Link>
                    <h1 className="text-xl font-bold text-gray-900 truncate flex-1">{tour.titolo_file || "Tour"}</h1>
                </div>
                <div className="flex justify-between items-center px-2 mt-4">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Orario</p>
                        <p className="text-xl font-extrabold text-gray-900">{tour.orario}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500 font-medium mb-1.5">Stato Boarding</p>
                        {arrivedCount >= tour.totale_pax && tour.totale_pax > 0 ? (
                            <span className="px-3 py-1.5 bg-green-100 text-green-800 text-sm font-black rounded-lg uppercase tracking-wider border border-green-200 shadow-sm">Tutti Arrivati</span>
                        ) : markers.some(m => m.type === 'noshow') ? (
                            <span className="px-3 py-1.5 bg-red-100 text-red-800 text-sm font-black rounded-lg uppercase tracking-wider border border-red-200 shadow-sm">No Show Presenti</span>
                        ) : null}
                    </div>
                </div>
            </header>

            <div className="p-4 space-y-6 max-w-7xl mx-auto">

                {/* PARTE SUPERIORE: IMPOSTAZIONI TOUR & QR */}
                <section className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-4 text-gray-800 font-bold">
                        <Palette className="w-5 h-5" /> Colore Tour
                    </div>
                    <div className="flex flex-wrap gap-3 mb-6">
                        {colors.map(color => (
                            <button
                                key={color.hex}
                                onClick={() => handleUpdateTourInfo('colore_assegnato', color.hex)}
                                className={`w-10 h-10 rounded-full border-2 transition-transform ${tour.colore_assegnato === color.hex ? 'scale-125 border-gray-900 shadow-md' : 'border-transparent hover:scale-110'}`}
                                style={{ backgroundColor: color.hex }}
                            />
                        ))}
                    </div>

                    <div className="flex flex-col md:flex-row gap-6 mb-6">
                        <div className="flex-1 flex flex-col">
                            <label className="flex items-center gap-2 mb-2 text-gray-800 font-bold">
                                <Radio className="w-5 h-5" /> Canale Radio
                            </label>
                            <input
                                type="text"
                                value={tour.canale_radio || ''}
                                onChange={(e) => handleUpdateTourInfo('canale_radio', e.target.value)}
                                className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-lg"
                                placeholder="es. 4. C9"
                            />
                        </div>
                        <div className="flex-1 flex flex-col">
                            <label className="flex items-center gap-2 mb-2 text-gray-800 font-bold">
                                <Users className="w-5 h-5" /> Identificativo Gruppo
                            </label>
                            <input
                                type="text"
                                value={tour.numero_gruppo || ''}
                                onChange={(e) => handleUpdateTourInfo('numero_gruppo', e.target.value)}
                                className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:gray-500 focus:border-gray-500 font-bold text-lg"
                                placeholder="es. Gruppo 1, A, ecc..."
                            />
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                        <p className="text-sm text-gray-500 font-medium mb-3">QR Code Cliente (Mostra per canale)</p>
                        <div className="bg-white p-2 rounded-xl shadow-sm">
                            <QRCode value={qrUrl} size={160} fgColor={tour.colore_assegnato || '#000000'} />
                        </div>
                        <Link href={qrUrl} target="_blank" className="mt-4 text-blue-600 font-medium text-sm underline">
                            Apri vista schermo intero
                        </Link>
                    </div>
                </section>


                {/* PARTE INFERIORE: VISUALIZZAZIONE PDF INTERATTIVA */}
                <section className="space-y-4 bg-white p-2 md:p-5 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 px-2">
                        <div className="flex flex-col gap-1">
                            <h2 className="font-extrabold text-2xl text-gray-900 flex items-center gap-2">
                                <Users className="w-6 h-6 text-gray-400" /> Pannello Check-in Visivo
                            </h2>
                            <p className="text-gray-500 text-sm font-medium">
                                Seleziona uno strumento e tocca la lista PDF per aggiungere un segnalino.
                            </p>
                        </div>

                        {/* DATI GUIDA IN CIMA */}
                        {tour.guida && tour.guida !== 'N/A' && (
                            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-900 shadow-sm w-full md:w-auto">
                                <span className="font-bold text-blue-700 block text-xs uppercase tracking-wider mb-1">Dati Guida Assegnata</span>
                                <span className="font-medium whitespace-pre-wrap">
                                    {tour.guida.replace('Nome Guida: | Mail:', 'Guida:').replace('Nome Guida:', 'Guida:')}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* TOOLBAR STRUMENTI */}
                    <div className="flex flex-wrap gap-2 mb-6 justify-center md:justify-start">
                        <button
                            onClick={() => setActiveTool(activeTool === 'check' ? null : 'check')}
                            className={`flex flex-col md:flex-row flex-1 md:flex-none px-4 py-3 rounded-xl font-bold items-center justify-center gap-2 transition-all shadow-sm border ${activeTool === 'check' ? 'bg-green-600 text-white border-green-700 shadow-green-500/30' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'}`}>
                            <Check className="w-5 h-5" />
                            <span className="hidden sm:inline">Strumento Arrivato</span>
                        </button>
                        <button
                            onClick={() => setActiveTool(activeTool === 'noshow' ? null : 'noshow')}
                            className={`flex flex-col md:flex-row flex-1 md:flex-none px-4 py-3 rounded-xl font-bold items-center justify-center gap-2 transition-all shadow-sm border ${activeTool === 'noshow' ? 'bg-red-600 text-white border-red-700 shadow-red-500/30' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'}`}>
                            <X className="w-5 h-5" />
                            <span className="hidden sm:inline">Strumento No-Show</span>
                        </button>
                        <button
                            onClick={() => setActiveTool(activeTool === 'split' ? null : 'split')}
                            className={`flex flex-col md:flex-row flex-1 md:flex-none px-4 py-3 rounded-xl font-bold items-center justify-center gap-2 transition-all shadow-sm border ${activeTool === 'split' ? 'bg-black text-white border-gray-900 shadow-gray-500/30' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'}`}>
                            <Scissors className="w-5 h-5" />
                            <span className="hidden sm:inline">Dividi Gruppo</span>
                        </button>
                    </div>

                    <div className="w-full flex justify-center bg-gray-100/50 rounded-xl md:rounded-2xl p-0 md:p-6 overflow-x-auto border border-gray-200" style={{ cursor: activeTool ? 'crosshair' : 'default' }}>
                        {tour.pdf_url ? (
                            <Document
                                file={tour.pdf_url}
                                onLoadSuccess={onDocumentLoadSuccess}
                                loading={<div className="font-bold text-gray-400 py-20 animate-pulse">Caricamento PDF...</div>}
                                error={<div className="font-bold text-red-500 py-10">Errore nel caricamento del PDF. Assicurati che il file esista su Supabase Storage.</div>}
                            >
                                {Array.from(new Array(numPages || 0), (el, index) => (
                                    <div
                                        key={`page_${index + 1}`}
                                        className="relative mb-6 shadow-xl leading-none inline-block border border-gray-300 bg-white"
                                        onClick={(e) => handlePageClick(e, index)}
                                    >
                                        <Page
                                            pageNumber={index + 1}
                                            renderTextLayer={false}
                                            renderAnnotationLayer={false}
                                            width={pageWidth}
                                            className="pointer-events-none select-none"
                                        />

                                        {/* RENDER MARKOVERS (RIGHE EVIDENZIATRICI) */}
                                        {markers.filter(m => m.page === index).map(m => (
                                            <div
                                                key={m.id}
                                                onClick={(e) => handleRemoveMarker(e, m.id)}
                                                className={`absolute w-full h-7 -mt-3.5 left-0 flex items-center px-4 cursor-pointer transition-colors border-l-4 group ${m.type === 'check'
                                                    ? 'bg-green-400/30 border-green-600 hover:bg-green-400/50'
                                                    : m.type === 'noshow'
                                                        ? 'bg-red-400/30 border-red-600 hover:bg-red-400/50'
                                                        : 'bg-black/80 border-black hover:bg-black/90' // line nera sbarrata
                                                    }`}
                                                style={{ top: `${m.y}%` }}
                                                title="Clicca per rimuovere l'evidenziatura"
                                            >
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white rounded-md shadow-sm">
                                                    {m.type === 'check' ? <Check size={14} className="text-green-600" strokeWidth={3} /> : m.type === 'noshow' ? <X size={14} className="text-red-600" strokeWidth={3} /> : <Scissors size={14} className="text-black" strokeWidth={3} />}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </Document>
                        ) : (
                            <div className="text-center py-16 text-gray-400 font-medium flex flex-col items-center justify-center gap-4">
                                <Users className="w-12 h-12 opacity-20" />
                                <span>Nessun PDF collegato per la visualizzazione visiva.</span>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}
