import { supabase } from '@/lib/supabase';
import TourClient from './TourClient';
import { notFound } from 'next/navigation';

export const revalidate = 0;

export default async function TourPage({ params }: { params: { id: string } }) {
    const { id } = await params;

    // Fetch Tour Data
    const { data: tour, error: tourError } = await supabase
        .from('tours')
        .select('*')
        .eq('id', id)
        .single();

    if (tourError || !tour) {
        notFound();
    }

    return (
        <TourClient initialTour={tour} />
    );
}
