'use client';

import { DadosRelatorioPolo } from '@/lib/relatorios/tipos';

export function TabelaComparativo({ comparativo, temCHCN }: { comparativo: DadosRelatorioPolo['comparativo_escolas']; temCHCN: boolean }) {
  if (comparativo.length === 0) return null;

  const getCorNota = (nota: number) =>
    nota >= 7 ? 'text-green-600' : nota >= 5 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
        <thead className="bg-gray-50 dark:bg-slate-700/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Escola
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              LP
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider">
              MAT
            </th>
            {temCHCN && (
              <>
                <th className="px-4 py-3 text-center text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  CH
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  CN
                </th>
              </>
            )}
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Média
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
          {comparativo.map((escola, index) => (
            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white print:text-black">
                {escola.escola_nome}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                <span className={`font-medium ${getCorNota(escola.lp)}`}>
                  {escola.lp.toFixed(1)}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                <span className={`font-medium ${getCorNota(escola.mat)}`}>
                  {escola.mat.toFixed(1)}
                </span>
              </td>
              {temCHCN && (
                <>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <span className={`font-medium ${getCorNota(escola.ch || 0)}`}>
                      {escola.ch ? escola.ch.toFixed(1) : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <span className={`font-medium ${getCorNota(escola.cn || 0)}`}>
                      {escola.cn ? escola.cn.toFixed(1) : '-'}
                    </span>
                  </td>
                </>
              )}
              <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                <span className={`font-bold text-lg ${getCorNota(escola.media)}`}>
                  {escola.media.toFixed(2)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
