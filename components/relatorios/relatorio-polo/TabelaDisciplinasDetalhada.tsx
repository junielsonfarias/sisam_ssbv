'use client';

import { DesempenhoDisciplina } from '@/lib/relatorios/tipos';
import { BarChart3 } from 'lucide-react';

export function TabelaDisciplinasDetalhada({
  disciplinas,
  titulo
}: {
  disciplinas: DesempenhoDisciplina[];
  titulo: string;
}) {
  if (disciplinas.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white print:text-black flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          {titulo}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-700/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Disciplina
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Média
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                % Acerto
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Desempenho
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
            {disciplinas.map((disc) => {
              const corMedia = disc.media >= 7 ? 'text-green-600' :
                              disc.media >= 5 ? 'text-amber-600' : 'text-red-600';
              const bgBarra = disc.media >= 7 ? 'bg-green-500' :
                             disc.media >= 5 ? 'bg-amber-500' : 'bg-red-500';

              return (
                <tr key={disc.disciplina} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${bgBarra}`}></div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white print:text-black">
                          {disc.disciplina_nome}
                        </p>
                        <p className="text-xs text-gray-500">({disc.disciplina})</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span className={`text-lg font-bold ${corMedia}`}>
                      {disc.media.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span className={`font-medium ${corMedia}`}>
                      {disc.percentual_acerto.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${bgBarra}`}
                        style={{ width: `${Math.min(disc.media * 10, 100)}%` }}
                      ></div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
