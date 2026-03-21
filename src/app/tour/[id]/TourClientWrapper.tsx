"use client";

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const TourClient = dynamic(() => import('./TourClient'), {
    ssr: false,
    loading: () => (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 gap-4">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <p className="font-bold text-gray-500">Inizializzazione vista PDF e Scanner...</p>
        </div>
    )
});

export default function TourClientWrapper() {
    return <TourClient />;
}
