'use client';

export default function OfflinePage() {
    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center px-8 text-center"
            style={{ background: 'var(--bg-primary)' }}
        >
            <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-6"
                style={{ background: 'rgba(79,124,255,0.1)' }}
            >
                📡
            </div>
            <h1 className="text-text-primary font-display font-bold text-2xl mb-3">
                Sin conexión
            </h1>
            <p className="text-text-secondary text-sm leading-relaxed mb-8">
                No hay conexión a internet. La app se está cargando desde caché,
                espera un momento o intenta recargar.
            </p>
            <button
                onClick={() => window.location.reload()}
                className="btn-primary"
                style={{ maxWidth: 200 }}
            >
                🔄 Reintentar
            </button>
        </div>
    );
}