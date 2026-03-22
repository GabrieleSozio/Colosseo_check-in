"use client";

import { useState, useRef } from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function UploadButton() {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setIsUploading(true);
        setError(null);

        try {
            await Promise.all(files.map(async (file) => {
                const formData = new FormData();
                formData.append('file', file);

                const res = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || `Errore durante il caricamento di ${file.name}`);
                }
            }));

            // Ricarica la pagina per mostrare i nuovi tour nella dashboard
            router.refresh();

        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Errore sconosciuto");
            }
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = ''; // Reset input
            }
        }
    };

    return (
        <div className="w-full flex flex-col items-center gap-3">
            <input
                type="file"
                accept=".pdf"
                multiple
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className={`w-full max-w-md flex items-center justify-center gap-3 py-4 rounded-2xl font-semibold text-white transition-all 
          ${isUploading ? 'bg-blue-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98]'}`}
            >
                {isUploading ? (
                    <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>Elaborazione PDF...</span>
                    </>
                ) : (
                    <>
                        <UploadCloud className="w-6 h-6" />
                        <span className="whitespace-nowrap">Carica Liste</span>
                    </>
                )}
            </button>
            {error && <p className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg w-full max-w-md text-center">{error}</p>}
        </div>
    );
}
