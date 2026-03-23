import { DadosRelatorioEscola } from '@/lib/relatorios/tipos';
import { Users } from 'lucide-react';
import { CORES_NIVEIS } from './constants';

// Componente para exibir barra de níveis compacta
function BarraNiveis({ niveis }: { niveis: { nivel: string; cor?: string; percentual: number }[] }) {
  if (!niveis || niveis.length === 0) return <span className="text-gray-400">-</span>;

  // Ordenar níveis na ordem correta
  const ordemNiveis = ['Avançado', 'Adequado', 'Básico', 'Insuficiente'];
  const niveisOrdenados = [...niveis].sort((a, b) =>
    ordemNiveis.indexOf(a.nivel) - ordemNiveis.indexOf(b.nivel)
  );

  return (
    <div className="flex items-center gap-1">
      <div className="flex h-3 w-24 rounded-full overflow-hidden bg-gray-200 dark:bg-slate-600">
        {niveisOrdenados.map((nivel, idx) => (
          <div
            key={idx}
            className="h-full"
            style={{
              width: `${nivel.percentual}%`,
              backgroundColor: nivel.cor || CORES_NIVEIS[nivel.nivel] || '#9CA3AF'
            }}
            title={`${nivel.nivel}: ${nivel.percentual}%`}
          />
        ))}
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400 hidden md:inline">
        {niveisOrdenados.find(n => n.percentual > 0)?.percentual || 0}%
      </span>
    </div>
  );
}

export function TabelaTurmas({
  turmas,
  mostrarCHCN = false,
  mostrarPROD = false,
  titulo,
  mostrarNiveis = true
}: {
  turmas: DadosRelatorioEscola['turmas'];
  mostrarCHCN?: boolean;
  mostrarPROD?: boolean;
  titulo?: string;
  mostrarNiveis?: boolean;
}) {
  if (turmas.length === 0) return null;

  // Verificar se há dados de níveis disponíveis
  const temNiveis = turmas.some(t => t.distribuicao_niveis && t.distribuicao_niveis.length > 0);
  // Verificar se há dados de PROD disponíveis
  const temPROD = mostrarPROD && turmas.some(t => t.medias_disciplinas.PROD && t.medias_disciplinas.PROD > 0);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
      {titulo && (
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white print:text-black flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            {titulo}
          </h3>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-700/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Turma
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Série
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Alunos
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                LP
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider">
                MAT
              </th>
              {temPROD && (
                <th className="px-4 py-3 text-center text-xs font-medium text-pink-600 dark:text-pink-400 uppercase tracking-wider">
                  PROD
                </th>
              )}
              {mostrarCHCN && (
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
              {mostrarNiveis && temNiveis && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Níveis
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
            {turmas.map((turma) => {
              const corMedia = turma.media_geral >= 7 ? 'text-green-600' :
                              turma.media_geral >= 5 ? 'text-amber-600' : 'text-red-600';
              const getCorNota = (nota: number) =>
                nota >= 7 ? 'text-green-600' : nota >= 5 ? 'text-amber-600' : 'text-red-600';

              return (
                <tr key={turma.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white print:text-black">
                    {turma.nome || turma.codigo}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-400">
                    {turma.serie}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-medium text-gray-700 dark:text-gray-300">
                    {turma.total_alunos}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <span className={`font-medium ${getCorNota(turma.medias_disciplinas.LP)}`}>
                      {turma.medias_disciplinas.LP?.toFixed(1) || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <span className={`font-medium ${getCorNota(turma.medias_disciplinas.MAT)}`}>
                      {turma.medias_disciplinas.MAT?.toFixed(1) || '-'}
                    </span>
                  </td>
                  {temPROD && (
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      <span className={`font-medium ${getCorNota(turma.medias_disciplinas.PROD || 0)}`}>
                        {turma.medias_disciplinas.PROD?.toFixed(1) || '-'}
                      </span>
                    </td>
                  )}
                  {mostrarCHCN && (
                    <>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        <span className={`font-medium ${getCorNota(turma.medias_disciplinas.CH || 0)}`}>
                          {turma.medias_disciplinas.CH?.toFixed(1) || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        <span className={`font-medium ${getCorNota(turma.medias_disciplinas.CN || 0)}`}>
                          {turma.medias_disciplinas.CN?.toFixed(1) || '-'}
                        </span>
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <span className={`font-bold text-lg ${corMedia}`}>
                      {turma.media_geral.toFixed(1)}
                    </span>
                  </td>
                  {mostrarNiveis && temNiveis && (
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <BarraNiveis niveis={turma.distribuicao_niveis} />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legenda dos níveis */}
      {mostrarNiveis && temNiveis && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="font-medium text-gray-600 dark:text-gray-300">Níveis:</span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              Avançado (≥8)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              Adequado (≥6)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              Básico (≥4)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              Insuficiente (&lt;4)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
