import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';

export const revalidate = 0;

export default async function ClientView({ params }: { params: { tour_id: string } }) {
    const { tour_id } = await params;

    const { data: tour, error } = await supabase
        .from('tours')
        .select('colore_assegnato, canale_radio')
        .eq('id', tour_id)
        .single();

    if (error || !tour) {
        notFound();
    }

    const bgColor = tour.colore_assegnato || '#3B82F6';
    const showText = tour.canale_radio || 'In Attesa';

    return (
        <main
            className="h-screen w-screen flex flex-col items-center justify-center m-0 p-0 overflow-hidden"
            style={{ backgroundColor: bgColor }}
        >
            <div className="text-white text-center p-8 w-full">
                <p className="text-2xl md:text-4xl font-semibold opacity-90 mb-4 tracking-widest uppercase">Canale Radio</p>
                <h1 className="text-7xl md:text-[10rem] font-black drop-shadow-xl break-words w-full" style={{ lineHeight: 1.1 }}>
                    {showText}
                </h1>
            </div>

            {/* Elemento Decorativo: Onde di Segnale */}
            <div className="absolute inset-x-0 bottom-0 overflow-hidden opacity-20 pointer-events-none pb-10">
                <div className="w-full flex justify-center gap-10 opacity-30">
                    <div className="w-20 h-40 border-4 border-white rounded-t-full border-b-0"></div>
                    <div className="w-32 h-64 border-4 border-white rounded-t-full border-b-0 absolute bottom-0 translate-y-12"></div>
                </div>
            </div>
        </main>
    );
}
