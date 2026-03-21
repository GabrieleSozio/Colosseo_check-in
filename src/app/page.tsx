import { supabase } from '@/lib/supabase';
import HomeClient from './HomeClient';

export const revalidate = 0; // Disabilita cache per avere i dati sempre aggiornati

export default async function Home() {
  const { data: tours, error } = await supabase
    .from('tours')
    .select('*')
    .order('orario', { ascending: true })
    .order('created_at', { ascending: false });

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white px-6 pt-12 pb-6 shadow-sm">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Tours di Oggi</h1>
        <p className="text-gray-500 mt-1">Colosseo Check-in</p>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto mt-6 px-6">
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100">
            Errore caricamento: {error.message}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <HomeClient initialTours={tours || []} />
      </div>
    </main>
  );
}
