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
            <div className="text-white text-center p-8 w-full z-10 relative mt-[-10vh]">
                <p className="text-2xl md:text-4xl font-semibold opacity-90 mb-4 tracking-widest uppercase">Canale Radio</p>
                <h1 className="text-8xl md:text-[10rem] font-black drop-shadow-xl break-words w-full mb-16" style={{ lineHeight: 1.1 }}>
                    {showText}
                </h1>

                {/* Input "How many people are you?" */}
                <div className="flex flex-col items-center justify-center bg-black/20 p-6 md:p-8 rounded-3xl backdrop-blur-md border border-white/30 max-w-md mx-auto shadow-2xl">
                    <label htmlFor="pax-count" className="text-2xl md:text-3xl font-bold text-white mb-6 drop-shadow-md pb-2 border-b-2 border-white/20 w-full">
                        How many people are you?
                    </label>
                    <input 
                        id="pax-count"
                        type="number" 
                        min="1"
                        max="99"
                        placeholder="0"
                        className="w-40 h-24 text-center text-6xl font-black bg-white text-gray-900 rounded-2xl shadow-inner focus:outline-none focus:ring-8 focus:ring-black/20 border-4 border-transparent transition-all"
                    />
                </div>
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
