import { FaltasSerie } from '@/lib/relatorios/tipos';
import { Users } from 'lucide-react';

export function TabelaFaltasSerie({ faltas }: { faltas: FaltasSerie[] }) {
  if (!faltas || faltas.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 mb-6 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white print:text-black flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          Participação por Série
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-700/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Série
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Matriculados
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Presentes
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wider">
                Ausentes
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Participação
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
            {faltas.map((falta) => {
              const corParticipacao = falta.taxa_participacao >= 90 ? 'text-green-600' :
                                     falta.taxa_participacao >= 70 ? 'text-amber-600' : 'text-red-600';
              return (
                <tr key={falta.serie} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white print:text-black">
                    {falta.serie}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-medium text-gray-700 dark:text-gray-300">
                    {falta.total_matriculados}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-medium text-emerald-600">
                    {falta.total_presentes}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-medium text-red-600">
                    {falta.total_ausentes}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 bg-gray-200 dark:bg-slate-600 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${falta.taxa_participacao >= 90 ? 'bg-green-500' : falta.taxa_participacao >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(falta.taxa_participacao, 100)}%` }}
                        ></div>
                      </div>
                      <span className={`font-bold ${corParticipacao}`}>
                        {falta.taxa_participacao.toFixed(1)}%
                      </span>
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
