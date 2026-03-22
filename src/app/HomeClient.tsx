"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Users, Clock, Languages, UserCheck, Search, Trash2, Filter, LayoutGrid, BookOpen, Check, Loader2 } from 'lucide-react';
import UploadButton from '@/components/UploadButton';
import dynamic from 'next/dynamic';

const GalleryView = dynamic(() => import('@/components/GalleryView'), { 
    ssr: false, 
    loading: () => <div className="py-20 text-center font-bold text-gray-500 animate-pulse">Caricamento Galleria PDF...</div> 
});

interface Tour {
    id: string;
    titolo_file: string;
    orario: string;
    totale_pax: number;
    colore_assegnato: string;
    canale_radio: string;
    lingua: string;
    guida: string;
    overlay_data: any[];
    numero_gruppo?: string;
    numero_partenza?: string;
    stato?: string;
}

export default function HomeClient({ initialTours }: { initialTours: Tour[] }) {
    const [tours, setTours] = useState<Tour[]>(initialTours);
    const [filterOrario, setFilterOrario] = useState<string[]>([]);
    const [filterLingua, setFilterLingua] = useState<string[]>([]);
    const [filterGuida, setFilterGuida] = useState('');
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [viewMode, setViewMode] = useState<'cards' | 'gallery'>('cards');
    const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0);
    const [openDropdown, setOpenDropdown] = useState<'orario' | 'lingua' | null>(null);

    useEffect(() => {
        setIsClient(true);
        const storedOrario = sessionStorage.getItem('filterOrario');
        const storedLingua = sessionStorage.getItem('filterLingua');
        const storedGuida = sessionStorage.getItem('filterGuida');
        const storedViewMode = sessionStorage.getItem('viewMode');
        
        if (storedOrario) setFilterOrario(JSON.parse(storedOrario));
        if (storedLingua) setFilterLingua(JSON.parse(storedLingua));
        if (storedGuida) setFilterGuida(storedGuida);
        if (storedViewMode) setViewMode(storedViewMode as 'cards' | 'gallery');
    }, []);

    useEffect(() => {
        if (!isClient) return;
        sessionStorage.setItem('filterOrario', JSON.stringify(filterOrario));
        sessionStorage.setItem('filterLingua', JSON.stringify(filterLingua));
        sessionStorage.setItem('filterGuida', filterGuida);
        sessionStorage.setItem('viewMode', viewMode);
    }, [filterOrario, filterLingua, filterGuida, viewMode, isClient]);

    // Deriviamo opzioni uniche per i filtri
    const orariUnici = Array.from(new Set(initialTours.map(t => t.orario))).sort();
    const lingueUniche = Array.from(new Set(initialTours.map(t => t.lingua))).sort();
    const guideUniche = Array.from(new Set(initialTours.map(t => t.guida))).sort();

    const filteredTours = tours.filter(tour => {
        return (filterOrario.length === 0 || filterOrario.includes(tour.orario)) &&
            (filterLingua.length === 0 || filterLingua.includes(tour.lingua)) &&
            (filterGuida === '' || tour.guida.toLowerCase().includes(filterGuida.toLowerCase()));
    });

    const toggleOrarioFilter = (orario: string) => {
        setFilterOrario(prev =>
            prev.includes(orario) ? prev.filter(o => o !== orario) : [...prev, orario]
        );
    };

    const toggleLinguaFilter = (lingua: string) => {
        setFilterLingua(prev =>
            prev.includes(lingua) ? prev.filter(l => l !== lingua) : [...prev, lingua]
        );
    };

    const handleDeleteTour = async (e: React.MouseEvent, tourId: string) => {
        e.preventDefault(); // Previene il click sul link
        e.stopPropagation(); // Evita il bubbling del click
        const confirmDelete = window.confirm("Sei sicuro di voler eliminare questa lista? L'operazione non è reversibile.");
        if (!confirmDelete) return;

        setIsDeleting(tourId);

        // Supabase elimina a cascata i bookings se configurato in SQL
        // Altrimenti cancelliamo prima i bookings
        await supabase.from('bookings').delete().eq('tour_id', tourId);
        const { error } = await supabase.from('tours').delete().eq('id', tourId);

        if (error) {
            alert(`Errore durante l'eliminazione: ${error.message}`);
        } else {
            setTours(prev => prev.filter(t => t.id !== tourId));
        }
        setIsDeleting(null);
    };

    const handleDeleteAll = async () => {
        if (tours.length === 0) return;
        const confirmDelete = window.confirm("Sei sicuro di voler eliminare TUTTE le liste in una sola volta? Questa operazione svuoterà l'intera dashboard e non è reversibile.");
        if (!confirmDelete) return;

        setIsDeleting('all');

        const allIds = tours.map(t => t.id);
        if (allIds.length > 0) {
            // Eliminiamo eventuali bookings associati ai tour (se presenti e non in cascade)
            await supabase.from('bookings').delete().in('tour_id', allIds);
            const { error } = await supabase.from('tours').delete().in('id', allIds);
            
            if (error) {
                alert(`Errore durante l'eliminazione complessiva: ${error.message}`);
            } else {
                setTours([]); // Svuota lo state
            }
        }
        setIsDeleting(null);
    };

    return (
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="flex-1 md:flex-none md:min-w-[200px]">
                        <UploadButton />
                    </div>
                    {tours.length > 0 && (
                        <button
                            onClick={handleDeleteAll}
                            disabled={isDeleting === 'all'}
                            className="flex items-center justify-center gap-2 px-4 py-4 rounded-2xl font-bold bg-red-100 text-red-700 hover:bg-red-200 transition-colors shadow-sm h-[56px]"
                            title="Elimina Tutte le Liste"
                        >
                            {isDeleting === 'all' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                        </button>
                    )}
                </div>
                
                <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner w-full md:w-auto">
                    <button
                        onClick={() => setViewMode('cards')}
                        className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${viewMode === 'cards' ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <LayoutGrid className="w-4 h-4" /> Cards
                    </button>
                    <button
                        onClick={() => { setViewMode('gallery'); setCurrentGalleryIndex(0); }}
                        className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${viewMode === 'gallery' ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <BookOpen className="w-4 h-4" /> Gallery
                    </button>
                </div>
            </div>

            {viewMode === 'cards' ? (
                <>
                    {/* FILTRI CARDS */}
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <label className="text-sm font-bold text-gray-500 mb-2 block flex items-center gap-1">
                            <Clock className="w-4 h-4" /> Filtro Orari (Multi)
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {orariUnici.map(o => (
                                <button
                                    key={o}
                                    onClick={() => toggleOrarioFilter(o)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors ${filterOrario.includes(o) ? 'bg-blue-600 text-white border-blue-700 shadow-sm' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                                >
                                    {o}
                                </button>
                            ))}
                            {orariUnici.length === 0 && <p className="text-sm text-gray-400 italic">Nessun orario</p>}
                        </div>
                    </div>

                    <div className="flex-1">
                        <label className="text-sm font-bold text-gray-500 mb-2 block flex items-center gap-1">
                            <Languages className="w-4 h-4" /> Lingua (Multi)
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {lingueUniche.map(l => (
                                <button
                                    key={l}
                                    onClick={() => toggleLinguaFilter(l)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors ${filterLingua.includes(l) ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                                >
                                    {l}
                                </button>
                            ))}
                            {lingueUniche.length === 0 && <p className="text-sm text-gray-400 italic">Nessuna lingua</p>}
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-1/3">
                    <label className="text-sm font-bold text-gray-500 mb-1 block flex items-center gap-1">
                        <Search className="w-4 h-4" /> Cerca Guida
                    </label>
                    <input
                        type="text"
                        placeholder="Nome guida..."
                        value={filterGuida}
                        onChange={(e) => setFilterGuida(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-medium"
                    />
                </div>
            </div>

            {/* LISTA TOUR */}
            <div className="space-y-4 pb-10">
                {filteredTours.map((tour) => (
                    <Link key={tour.id} href={`/tour/${tour.id}`} className="block relative group">
                        <div className={`bg-white rounded-3xl p-5 shadow-sm border border-gray-100/50 hover:shadow-md transition-all active:scale-[0.99] overflow-hidden ${isDeleting === tour.id ? 'opacity-50 pointer-events-none' : ''}`}>
                            {/* Banda Colorata */}
                            <div
                                className="absolute top-0 left-0 w-2 h-full z-10"
                                style={{ backgroundColor: tour.colore_assegnato || '#cbd5e1' }}
                            />

                            <div className="pl-3 relative">                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Clock className="w-5 h-5 text-gray-400" />
                                        <span className="text-xl font-bold text-gray-800">{tour.orario}</span>
                                        {tour.numero_partenza && (
                                            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-black rounded-lg border border-amber-200 shadow-sm">
                                                Partenza {tour.numero_partenza}
                                            </span>
                                        )}
                                        {tour.numero_gruppo && (
                                            <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 text-xs font-black rounded-lg border border-indigo-200 shadow-sm">
                                                Gruppo {tour.numero_gruppo}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 border border-gray-200 rounded-full shadow-inner">
                                            <Users className="w-4 h-4 text-gray-600" />
                                            <span className="text-sm font-black tracking-wide text-gray-800">{tour.totale_pax} PAX</span>
                                        </div>
                                        <div className="flex flex-col gap-1 items-end">
                                            {(() => {
                                                const arrived = tour.overlay_data ? tour.overlay_data.filter((m: any) => m.type === 'check').length : 0;
                                                const hasNoShow = tour.overlay_data ? tour.overlay_data.some((m: any) => m.type === 'noshow') : false;
                                                const hasSoloTix = tour.overlay_data ? tour.overlay_data.some((m: any) => m.type === 'solotix') : false;
                                                
                                                if (arrived >= tour.totale_pax && tour.totale_pax > 0) return <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-black rounded-md uppercase tracking-wide border border-green-200">Tutti Arrivati</span>;
                                                
                                                const tags = [];
                                                if (hasSoloTix) tags.push(<span key="tix" className="px-2 py-1 bg-yellow-100 text-yellow-800 text-[10px] font-black rounded-md uppercase tracking-wide border border-yellow-200">Solo Tix</span>);
                                                if (hasNoShow) tags.push(<span key="ns" className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-black rounded-md uppercase tracking-wide border border-red-200">No Show Presenti</span>);
                                                
                                                return tags.length > 0 ? tags : null;
                                            })()}
                                            {tour.stato && tour.stato.toLowerCase() === 'departed' ? (
                                                <span className="px-2 py-1 bg-gray-200 text-gray-600 text-[10px] font-black rounded-md uppercase tracking-wide border border-gray-300">Departed</span>
                                            ) : (
                                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-black rounded-md uppercase tracking-wide border border-blue-200">Boarding</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 relative z-0">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Languages className="w-4 h-4 text-gray-400" />
                                        <span className="font-medium">{tour.lingua}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-800">
                                        <UserCheck className="w-4 h-4 text-gray-400" />
                                        <span className="font-extrabold truncate text-base">
                                            {tour.guida.replace('Nome Guida: | Mail:', 'Guida:').replace('Nome Guida:', 'Guida:')}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-4 flex justify-between items-end relative z-20">
                                    {tour.canale_radio ? (
                                        <div className="inline-block px-3 py-1 rounded-lg text-sm font-bold shadow-sm" style={{ backgroundColor: tour.colore_assegnato, color: '#fff' }}>
                                            Canale {tour.canale_radio}
                                        </div>
                                    ) : <div />}

                                    <button
                                        onClick={(e) => handleDeleteTour(e, tour.id)}
                                        className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors z-30 shadow-sm"
                                        title="Elimina Tour"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}

                {filteredTours.length === 0 && tours.length > 0 && (
                    <div className="text-center py-12 text-gray-500 font-medium bg-white rounded-3xl border border-dashed border-gray-300">
                        Nessun tour trovato con questi filtri.
                    </div>
                )}

                {tours.length === 0 && (
                    <div className="text-center py-12 text-gray-500 font-medium bg-white rounded-3xl border border-dashed border-gray-300">
                        Nessun tour registrato. Carica un PDF per iniziare.
                    </div>
                )}
            </div>
                </>
            ) : (
                <>
                    {/* FILTRI MINIMALI GALLERY */}
                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-200 flex flex-wrap items-center gap-4">
                        <div className="relative">
                            <button 
                                onClick={() => setOpenDropdown(openDropdown === 'orario' ? null : 'orario')} 
                                className="flex items-center gap-2 bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl p-2.5 font-bold hover:bg-gray-100 transition-colors"
                            >
                                <Clock className="w-5 h-5 text-gray-400" />
                                Orari {filterOrario.length > 0 && <span className="text-xs bg-blue-100 text-blue-800 px-2 rounded-full border border-blue-200">{filterOrario.length}</span>}
                            </button>
                            {openDropdown === 'orario' && (
                                <div className="absolute top-full mt-2 left-0 w-56 bg-white border border-gray-200 shadow-xl rounded-xl p-2 z-50 max-h-64 overflow-y-auto">
                                    <button
                                        onClick={() => { setFilterOrario([]); setCurrentGalleryIndex(0); setOpenDropdown(null); }}
                                        className="w-full text-left px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg mb-1"
                                    >
                                        Tutti gli orari
                                    </button>
                                    {orariUnici.map(o => (
                                        <button
                                            key={o}
                                            onClick={() => { toggleOrarioFilter(o); setCurrentGalleryIndex(0); }}
                                            className="w-full flex items-center justify-between px-3 py-2 text-sm font-bold text-gray-800 hover:bg-gray-50 rounded-lg"
                                        >
                                            {o}
                                            {filterOrario.includes(o) && <Check className="w-4 h-4 text-blue-600" strokeWidth={3} />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <button 
                                onClick={() => setOpenDropdown(openDropdown === 'lingua' ? null : 'lingua')} 
                                className="flex items-center gap-2 bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl p-2.5 font-bold hover:bg-gray-100 transition-colors"
                            >
                                <Languages className="w-5 h-5 text-gray-400" />
                                Lingue {filterLingua.length > 0 && <span className="text-xs bg-indigo-100 text-indigo-800 px-2 rounded-full border border-indigo-200">{filterLingua.length}</span>}
                            </button>
                            {openDropdown === 'lingua' && (
                                <div className="absolute top-full mt-2 left-0 w-56 bg-white border border-gray-200 shadow-xl rounded-xl p-2 z-50 max-h-64 overflow-y-auto">
                                    <button
                                        onClick={() => { setFilterLingua([]); setCurrentGalleryIndex(0); setOpenDropdown(null); }}
                                        className="w-full text-left px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg mb-1"
                                    >
                                        Tutte le lingue
                                    </button>
                                    {lingueUniche.map(l => (
                                        <button
                                            key={l}
                                            onClick={() => { toggleLinguaFilter(l); setCurrentGalleryIndex(0); }}
                                            className="w-full flex items-center justify-between px-3 py-2 text-sm font-bold text-gray-800 hover:bg-gray-50 rounded-lg"
                                        >
                                            {l}
                                            {filterLingua.includes(l) && <Check className="w-4 h-4 text-indigo-600" strokeWidth={3} />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-grow md:flex-grow-0 ml-auto">
                            <Search className="w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Cerca guida..."
                                value={filterGuida}
                                onChange={(e) => { setFilterGuida(e.target.value); setCurrentGalleryIndex(0); }}
                                className="bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-blue-500 w-full md:w-56 block p-2.5 font-bold"
                            />
                        </div>
                    </div>

                    {/* VISTA GALLERIA PDF */}
                    {filteredTours.length > 0 ? (
                        <GalleryView 
                            tours={filteredTours} 
                            currentIndex={currentGalleryIndex} 
                            onPrev={() => setCurrentGalleryIndex(Math.max(0, currentGalleryIndex - 1))}
                            onNext={() => setCurrentGalleryIndex(Math.min(filteredTours.length - 1, currentGalleryIndex + 1))}
                            onUpdateTourMarkers={(tourId, markers) => {
                                setTours(tours.map(t => t.id === tourId ? { ...t, overlay_data: markers } : t));
                            }}
                        />
                    ) : (
                        <div className="text-center py-20 text-gray-500 font-medium bg-white rounded-3xl border border-dashed border-gray-300 shadow-sm flex flex-col items-center gap-3">
                            <BookOpen className="w-12 h-12 text-gray-300" />
                            Nessun tour trovato con questi filtri.
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
