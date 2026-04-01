"use client";

import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { QRCode } from 'react-qrcode-logo';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, ChevronRight, Check, X, Scissors, Users, Loader2, Ticket, Type } from 'lucide-react';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Tour {
    id: string;
    titolo_file: string;
    orario: string;
    totale_pax: number;
    colore_assegnato: string;
    canale_radio: string;
    lingua: string;
    guida: string;
    pdf_url?: string;
    overlay_data?: any;
    numero_gruppo?: string;
    numero_partenza?: string;
    stato?: string;
}

interface Marker {
    id: string;
    x: number;
    y: number;
    page: number;
    type: 'check' | 'noshow' | 'split' | 'solotix' | 'text';
    text?: string;
}

interface GalleryViewProps {
    tours: Tour[];
    currentIndex: number;
    onPrev: () => void;
    onNext: () => void;
    onUpdateTourMarkers: (tourId: string, markers: Marker[]) => void;
}

export default function GalleryView({ tours, currentIndex, onPrev, onNext, onUpdateTourMarkers }: GalleryViewProps) {
    const [localTours, setLocalTours] = useState<Tour[]>(tours);
    const tour = localTours[currentIndex];
    const [markers, setMarkers] = useState<Marker[]>([]);
    const [numPages, setNumPages] = useState<number>();
    const [activeTool, setActiveTool] = useState<'check' | 'noshow' | 'split' | 'solotix' | 'text' | null>(null);
    const [pageWidth, setPageWidth] = useState(800);

    const touchStartX = useRef<number | null>(null);
    const touchEndX = useRef<number | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.targetTouches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.targetTouches[0].clientX;
    };

    const handleTouchEnd = () => {
        if (touchStartX.current === null || touchEndX.current === null) return;
        const diff = touchStartX.current - touchEndX.current;
        const minSwipeDistance = 50;

        if (diff > minSwipeDistance) {
            // swiped left => go forward (Next) se possibile
            if (currentIndex < tours.length - 1) onNext();
        } else if (diff < -minSwipeDistance) {
            // swiped right => go back (Prev) se possibile
            if (currentIndex > 0) onPrev();
        }
        
        touchStartX.current = null;
        touchEndX.current = null;
    };

    useEffect(() => {
        setLocalTours(tours);
    }, [tours]);

    useEffect(() => {
        if (!tour) return;
        try {
            if (tour.overlay_data) {
                const parsed = typeof tour.overlay_data === 'string' ? JSON.parse(tour.overlay_data) : tour.overlay_data;
                if (Array.isArray(parsed)) setMarkers(parsed);
                else setMarkers([]);
            } else setMarkers([]);
        } catch (e) {
            console.error("Errore parse markers:", e);
            setMarkers([]);
        }
    }, [tour]);

    useEffect(() => {
        const handleResize = () => setPageWidth(Math.min(window.innerWidth - 32, 1100));
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const getSafeQrColor = (hex?: string) => {
        if (!hex) return '#000000';
        const cleanHex = hex.replace('#', '');
        if (cleanHex.length !== 6) return hex;
        let r = parseInt(cleanHex.substring(0, 2), 16);
        let g = parseInt(cleanHex.substring(2, 4), 16);
        let b = parseInt(cleanHex.substring(4, 6), 16);
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        // Se il colore è troppo chiaro (luminanza > 160), lo scuriamo del 40% per farlo leggere alla fotocamera
        if (luma > 160) {
            r = Math.floor(r * 0.6);
            g = Math.floor(g * 0.6);
            b = Math.floor(b * 0.6);
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        }
        return hex;
    };

    if (!tour) return null;

    const saveMarkers = async (newMarkers: Marker[]) => {
        setMarkers(newMarkers);
        const updatedTours = [...localTours];
        updatedTours[currentIndex] = { ...tour, overlay_data: newMarkers };
        setLocalTours(updatedTours);
        await supabase.from('tours').update({ overlay_data: newMarkers }).eq('id', tour.id);
        onUpdateTourMarkers(tour.id, newMarkers); // update parent state
    };

    const handleUpdateState = async (newState: string) => {
        if (!tour) return;
        const updatedTours = [...localTours];
        updatedTours[currentIndex] = { ...tour, stato: newState };
        setLocalTours(updatedTours);
        await supabase.from('tours').update({ stato: newState }).eq('id', tour.id);
    };

    const handlePageClick = (e: React.MouseEvent<HTMLDivElement>, pageIndex: number) => {
        if (!activeTool) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        
        let textPayload = undefined;
        if (activeTool === 'text') {
            const userInput = window.prompt("Inserisci il testo (o Annulla):");
            if (!userInput || userInput.trim() === "") return;
            textPayload = userInput.trim();
        }

        const newMarker: Marker = {
            id: Date.now().toString(),
            x, y, page: pageIndex, type: activeTool, text: textPayload
        };
        saveMarkers([...markers, newMarker]);
    };

    const handleRemoveMarker = (e: React.MouseEvent, markerId: string) => {
        e.stopPropagation();
        const conf = window.confirm("Rimuovere questo segnalino?");
        if (conf) {
            saveMarkers(markers.filter(m => m.id !== markerId));
        }
    };

    function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
        setNumPages(numPages);
    }

    const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const qrUrl = `${currentUrl}/client-view/${tour.id}`;

    return (
        <div className="flex flex-col bg-gray-50 rounded-3xl overflow-hidden border border-gray-200 shadow-sm relative">
            
            {/* Header / Navigation (Area abilitata allo Swipe mobile) */}
            <div 
                className="flex items-center justify-between p-4 bg-white border-b border-gray-200 sticky top-0 z-20 select-none"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <button
                    onClick={onPrev}
                    disabled={currentIndex === 0}
                    className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-gray-100 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6 text-gray-700" />
                </button>
                
                <div className="flex flex-col items-center">
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-gray-900 truncate">
                            {tour.titolo_file || "Tour"}
                        </h1>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-sm font-medium text-gray-500">
                                Lista {currentIndex + 1} di {tours.length}
                            </span>
                            <select
                                value={tour.stato || 'Boarding'}
                                onChange={(e) => handleUpdateState(e.target.value)}
                                className={`text-xs font-bold px-2 py-1 rounded-md border ${tour.stato === 'Departed' ? 'bg-gray-100 text-gray-600 border-gray-300' : 'bg-blue-50 text-blue-700 border-blue-200'} cursor-pointer outline-none transition-colors`}
                            >
                                <option value="Boarding">Stato: Boarding</option>
                                <option value="Departed">Stato: Departed</option>
                            </select>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onNext}
                    disabled={currentIndex === tours.length - 1}
                    className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-gray-100 transition-colors"
                >
                    <ChevronRight className="w-6 h-6 text-gray-700" />
                </button>
            </div>

            {/* Tools (Anche qui abilitato lo Swipe mobile) */}
            <div 
                className="flex flex-wrap gap-2 p-4 justify-center bg-white border-b border-gray-100 relative z-10 shadow-sm select-none"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <button
                    onClick={() => setActiveTool(activeTool === 'check' ? null : 'check')}
                    className={`flex px-4 py-2 rounded-xl font-bold items-center gap-2 transition-all shadow-sm border ${activeTool === 'check' ? 'bg-green-600 text-white border-green-700 shadow-green-500/30' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'}`}>
                    <Check className="w-5 h-5" /> <span className="hidden sm:inline">Arrivato</span>
                </button>
                <button
                    onClick={() => setActiveTool(activeTool === 'noshow' ? null : 'noshow')}
                    className={`flex px-4 py-2 rounded-xl font-bold items-center gap-2 transition-all shadow-sm border ${activeTool === 'noshow' ? 'bg-red-600 text-white border-red-700 shadow-red-500/30' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'}`}>
                    <X className="w-5 h-5" /> <span className="hidden sm:inline">No-Show</span>
                </button>
                <button
                    onClick={() => setActiveTool(activeTool === 'split' ? null : 'split')}
                    className={`flex px-4 py-2 rounded-xl font-bold items-center gap-2 transition-all shadow-sm border ${activeTool === 'split' ? 'bg-black text-white border-gray-900 shadow-gray-500/30' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'}`}>
                    <Scissors className="w-5 h-5" />
                    <span className="hidden sm:inline">Dividi Gruppo</span>
                </button>
                <button
                    onClick={() => setActiveTool(activeTool === 'solotix' ? null : 'solotix')}
                    className={`flex px-4 py-2 rounded-xl font-bold items-center gap-2 transition-all shadow-sm border ${activeTool === 'solotix' ? 'bg-yellow-400 text-yellow-900 border-yellow-500 shadow-yellow-500/30' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'}`}>
                    <Ticket className="w-5 h-5" />
                    <span className="hidden sm:inline">Solo Tix</span>
                </button>
                <button
                    onClick={() => setActiveTool(activeTool === 'text' ? null : 'text')}
                    className={`flex px-4 py-2 rounded-xl font-bold items-center gap-2 transition-all shadow-sm border ${activeTool === 'text' ? 'bg-indigo-600 text-white border-indigo-700 shadow-indigo-500/30' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'}`}>
                    <Type className="w-5 h-5" />
                    <span className="hidden sm:inline">Text</span>
                </button>
            </div>

            {/* PDF Render Container */}
            <div className="w-full flex justify-center bg-gray-200/50 p-2 md:p-6 overflow-x-auto min-h-[600px] relative" style={{ cursor: activeTool ? 'crosshair' : 'grab' }}>
                {tour.pdf_url ? (
                    <Document
                        file={tour.pdf_url}
                        onLoadSuccess={onDocumentLoadSuccess}
                        loading={<div className="font-bold text-gray-400 py-20 flex items-center gap-2"><Loader2 className="animate-spin w-5 h-5" /> Caricamento PDF...</div>}
                        error={<div className="font-bold text-red-500 py-10">Errore nel caricamento del PDF.</div>}
                    >
                        {Array.from(new Array(numPages || 0), (el, index) => (
                            <div
                                key={`page_${index + 1}`}
                                className="relative mb-6 shadow-2xl leading-none inline-block border border-gray-300 bg-white"
                                onClick={(e) => handlePageClick(e, index)}
                            >
                                <Page
                                    pageNumber={index + 1}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                    width={pageWidth}
                                    className="pointer-events-none select-none"
                                />

                                {/* Markers overlay */}
                                {markers.filter(m => m.page === index).map(m => (
                                    <div
                                        key={m.id}
                                        onClick={(e) => handleRemoveMarker(e, m.id)}
                                        className={`absolute cursor-pointer transition-colors group z-50 ${
                                            m.type === 'text'
                                            ? 'text-red-600 opacity-100 leading-none whitespace-nowrap hover:text-red-700 hover:bg-white/80 px-1 rounded transform -translate-x-1 -mt-2'
                                            : m.type === 'check'
                                            ? 'w-full h-5 -mt-2.5 left-0 flex items-center px-4 border-l-2 bg-green-400/30 border-green-600 hover:bg-green-400/50'
                                            : m.type === 'noshow'
                                                ? 'w-full h-5 -mt-2.5 left-0 flex items-center px-4 border-l-2 bg-red-400/30 border-red-600 hover:bg-red-400/50'
                                                : m.type === 'split'
                                                    ? 'w-full h-5 -mt-2.5 left-0 flex items-center px-4 border-l-2 bg-black/80 border-black hover:bg-black/90'
                                                    : 'w-full h-5 -mt-2.5 left-0 flex items-center px-4 border-l-2 bg-yellow-400/30 border-yellow-600 hover:bg-yellow-400/50'
                                            }`}
                                        style={m.type === 'text' ? { top: `${m.y}%`, left: `${m.x}%`, color: '#dc2626', fontSize: '15px', fontWeight: 900, textShadow: '0 0 4px rgba(255,255,255,0.8)' } : { top: `${m.y}%`, left: 0 }}
                                        title="Clicca per rimuovere l'evidenziatura"
                                    >
                                        {m.type === 'text' ? (
                                            <span>{m.text}</span>
                                        ) : (
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 bg-white rounded-md shadow-sm">
                                                {m.type === 'check' ? <Check size={12} className="text-green-600" strokeWidth={2.5} /> : m.type === 'noshow' ? <X size={12} className="text-red-600" strokeWidth={2.5} /> : m.type === 'split' ? <Scissors size={12} className="text-black" strokeWidth={2.5} /> : <Ticket size={12} className="text-yellow-600" strokeWidth={2.5} />}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </Document>
                ) : (
                    <div className="text-center py-16 text-gray-400 font-medium flex flex-col items-center justify-center gap-4">
                        <Users className="w-12 h-12 opacity-20" />
                        <span>Nessun PDF collegato.</span>
                    </div>
                )}

                {/* Floating QR & Partenza Frame */}
                {tour.pdf_url && (
                    <div className="absolute top-2 right-4 md:top-4 md:right-6 z-50 flex flex-row items-start gap-3 drop-shadow-2xl pointer-events-none">
                        {tour.numero_partenza && (
                            <div className="bg-white px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-md md:text-lg font-black shadow-xl border-2 pointer-events-auto mt-1" style={{ borderColor: tour.colore_assegnato || '#e5e7eb', color: tour.colore_assegnato || '#374151' }}>
                                Partenza {tour.numero_partenza}
                            </div>
                        )}
                        <div className="bg-white p-2 md:p-3 rounded-xl shadow-xl border-4 pointer-events-auto transition-transform hover:scale-105" style={{ borderColor: tour.colore_assegnato || '#fff' }}>
                            <QRCode 
                                value={qrUrl} 
                                size={120} 
                                fgColor={getSafeQrColor(tour.colore_assegnato)} 
                                bgColor="#ffffff" 
                                ecLevel="L" 
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
