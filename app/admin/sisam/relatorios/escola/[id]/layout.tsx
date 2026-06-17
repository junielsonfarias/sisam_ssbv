'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

function LoadingRelatorio() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-lg text-gray-600 dark:text-gray-300">Carregando relatório...</p>
      </div>
    </div>
  );
}

export default function RelatorioEscolaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relatorio-layout min-h-screen bg-gray-50 dark:bg-slate-900 print:bg-white">
      <Suspense fallback={<LoadingRelatorio />}>
        {children}
      </Suspense>
    </div>
  );
}
