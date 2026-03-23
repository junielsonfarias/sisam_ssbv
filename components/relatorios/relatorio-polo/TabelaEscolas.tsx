'use client';

import { DadosRelatorioPolo } from '@/lib/relatorios/tipos';
import { Trophy } from 'lucide-react';

export function TabelaEscolas({ escolas }: { escolas: DadosRelatorioPolo['escolas'] }) {
  if (escolas.length === 0) return null;

  const getCorMedia = (media: number) =>
    media >= 7 ? 'text-green-600' : media >= 5 ? 'text-amber-600' : 'text-red-600';
  const getBgMedia = (media: number) =>
    media >= 7 ? 'bg-green-500' : media >= 5 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
        <thead className="bg-gray-50 dark:bg-slate-700/50">
          <tr>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">
              Posição
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Escola
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Alunos
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Turmas
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Média
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
              Desempenho
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
          {escolas.map((escola) => (
            <tr key={escola.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
              <td className="px-4 py-3 whitespace-nowrap text-center">
                <div className="flex items-center justify-center gap-1">
                  {escola.ranking_posicao <= 3 ? (
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      escola.ranking_posicao === 1 ? 'bg-yellow-100 dark:bg-yellow-900/50' :
                      escola.ranking_posicao === 2 ? 'bg-gray-100 dark:bg-gray-700' : 'bg-amber-100 dark:bg-amber-900/50'
                    }`}>
                      <Trophy className={`w-5 h-5 ${
                        escola.ranking_posicao === 1 ? 'text-yellow-500' :
                        escola.ranking_posicao === 2 ? 'text-gray-400' : 'text-amber-600'
                      }`} />
                    </div>
                  ) : (
                    <span className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 font-medium text-sm">
                      {escola.ranking_posicao}º
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white print:text-black">
                    {escola.nome}
                  </p>
                  {escola.codigo && (
                    <p className="text-xs text-gray-500">{escola.codigo}</p>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-medium text-gray-700 dark:text-gray-300">
                {escola.total_alunos}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-400">
                {escola.total_turmas}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-center">
                <span className={`text-lg font-bold ${getCorMedia(escola.media_geral)}`}>
                  {escola.media_geral.toFixed(2)}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${getBgMedia(escola.media_geral)}`}
                    style={{ width: `${Math.min(escola.media_geral * 10, 100)}%` }}
                  ></div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
