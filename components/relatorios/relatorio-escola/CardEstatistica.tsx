import React from 'react';

export function CardEstatistica({
  icone: Icone,
  titulo,
  valor,
  subtitulo,
  corIcone,
  corValor
}: {
  icone: React.ElementType;
  titulo: string;
  valor: string | number;
  subtitulo?: string;
  corIcone: string;
  corValor?: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-slate-700 print:border print:border-gray-300">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${corIcone}`}>
          <Icone className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 print:text-gray-600">{titulo}</p>
          <p className={`text-xl font-bold ${corValor || 'text-gray-900 dark:text-white print:text-black'}`}>{valor}</p>
          {subtitulo && (
            <p className="text-xs text-gray-400 dark:text-gray-500">{subtitulo}</p>
          )}
        </div>
      </div>
    </div>
  );
}
