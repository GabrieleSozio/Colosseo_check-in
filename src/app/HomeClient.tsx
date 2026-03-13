"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Users, Clock, Languages, UserCheck, Search, Trash2, Filter } from 'lucide-react';
import UploadButton from '@/components/UploadButton';

interface Tour {
    id: string;
    titolo_file: string;
    orario: string;
    totale_pax: number;
    colore_assegnato: string;
    canale_radio: string;
    lingua: string;
    guida: string;
}

export default function HomeClient({ initialTours }: { initialTours: Tour[] }) {
    const [tours, setTours] = useState<Tour[]>(initialTours);
    const [filterOrario, setFilterOrario] = useState('');
    const [filterLingua, setFilterLingua] = useState('');
    const [filterGuida, setFilterGuida] = useState('');
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    // Deriviamo opzioni uniche per i filtri
    const orariUnici = Array.from(new Set(initialTours.map(t => t.orario))).sort();
    const lingueUniche = Array.from(new Set(initialTours.map(t => t.lingua))).sort();
    const guideUniche = Array.from(new Set(initialTours.map(t => t.guida))).sort();

    const filteredTours = tours.filter(tour => {
        return (filterOrario === '' || tour.orario === filterOrario) &&
            (filterLingua === '' || tour.lingua === filterLingua) &&
            (filterGuida === '' || tour.guida.toLowerCase().includes(filterGuida.toLowerCase()));
    });

    const handleDeleteTour = async (e: React.MouseEvent, tourId: string) => {
        e.preventDefault(); // Previene il click sul link
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

    return (
        <div className="p-6 space-y-6">
            <UploadButton />

            {/* FILTRI */}
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4 sm:flex-row">
                <div className="flex-1">
                    <label className="text-sm font-bold text-gray-500 mb-1 block flex items-center gap-1">
                        <Clock className="w-4 h-4" /> Orario
                    </label>
                    <select
                        value={filterOrario}
                        onChange={(e) => setFilterOrario(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-medium"
                    >
                        <option value="">Tutti</option>
                        {orariUnici.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                </div>

                <div className="flex-1">
                    <label className="text-sm font-bold text-gray-500 mb-1 block flex items-center gap-1">
                        <Languages className="w-4 h-4" /> Lingua
                    </label>
                    <select
                        value={filterLingua}
                        onChange={(e) => setFilterLingua(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-medium"
                    >
                        <option value="">Tutte</option>
                        {lingueUniche.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                </div>

                <div className="flex-1">
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

                            <div className="pl-3 relative">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-gray-400" />
                                        <span className="text-xl font-bold text-gray-800">{tour.orario}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 border border-gray-200 rounded-full shadow-inner">
                                        <Users className="w-4 h-4 text-gray-600" />
                                        <span className="text-sm font-black tracking-wide text-gray-800">{tour.totale_pax} PAX</span>
                                    </div>
                                </div>

                                <div className="space-y-2 relative z-0">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Languages className="w-4 h-4 text-gray-400" />
                                        <span className="font-medium">{tour.lingua}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-800">
                                        <UserCheck className="w-4 h-4 text-gray-400" />
                                        <span className="font-extrabold truncate text-lg">{tour.guida}</span>
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
        </div>
    );
}
