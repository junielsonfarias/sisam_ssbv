import { AnaliseQuestoesSerie } from '@/lib/relatorios/tipos';
import {
  BookOpen,
  AlertTriangle,
  CheckCircle,
  GraduationCap,
  FileText
} from 'lucide-react';
import { agruparQuestoesPorDisciplina, CORES_DISCIPLINAS, NOMES_DISCIPLINAS } from './constants';

export function SecaoAnaliseQuestoesSerie({ analise }: { analise: AnaliseQuestoesSerie }) {
  const questoesPorDisciplina = agruparQuestoesPorDisciplina(analise.questoes);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 mb-4 overflow-hidden">
      {/* Cabeçalho da série */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-slate-700/50 dark:to-slate-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white print:text-black">
              {analise.serie}
            </h4>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-500">Média de Acerto</p>
              <p className={`text-xl font-bold ${
                analise.media_acerto_geral >= 70 ? 'text-green-600' :
                analise.media_acerto_geral >= 40 ? 'text-amber-600' : 'text-red-600'
              }`}>
                {analise.media_acerto_geral.toFixed(1)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Questões</p>
              <p className="text-xl font-bold text-gray-700 dark:text-gray-300">
                {analise.questoes.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Questões agrupadas por disciplina */}
      <div className="p-4 space-y-4">
        {Object.entries(questoesPorDisciplina).map(([disciplina, questoes]) => {
          const cores = CORES_DISCIPLINAS[disciplina] || CORES_DISCIPLINAS['Geral'];
          const nomeDisciplina = NOMES_DISCIPLINAS[disciplina] || disciplina;
          const mediaAcerto = questoes.reduce((acc, q) => acc + q.percentual_acerto, 0) / questoes.length;
          const questoesOrdenadas = [...questoes].sort((a, b) => a.numero - b.numero);

          return (
            <div key={disciplina} className={`${cores.bg} rounded-lg p-3 border ${cores.border}`}>
              <div className="flex items-center justify-between mb-2">
                <h5 className={`text-sm font-semibold ${cores.text} flex items-center gap-2`}>
                  <BookOpen className="w-4 h-4" />
                  {nomeDisciplina}
                </h5>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-gray-600 dark:text-gray-300">
                    {questoes.length} questões
                  </span>
                  <span className={`font-bold ${mediaAcerto >= 70 ? 'text-green-600' : mediaAcerto >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                    {mediaAcerto.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Tabela detalhada de questões com acertos/erros */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-300 dark:border-slate-600">
                      <th className="py-1.5 px-2 text-left font-semibold text-gray-600 dark:text-gray-300">Questão</th>
                      <th className="py-1.5 px-2 text-center font-semibold text-gray-600 dark:text-gray-300">Respostas</th>
                      <th className="py-1.5 px-2 text-center font-semibold text-green-600">Acertos</th>
                      <th className="py-1.5 px-2 text-center font-semibold text-red-600">Erros</th>
                      <th className="py-1.5 px-2 text-center font-semibold text-gray-600 dark:text-gray-300">% Acerto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questoesOrdenadas.map(q => {
                      const erros = q.total_respostas - q.acertos;
                      const corLinha = q.percentual_acerto >= 70 ? 'bg-green-50/50 dark:bg-green-900/10' :
                                       q.percentual_acerto >= 40 ? 'bg-amber-50/50 dark:bg-amber-900/10' :
                                       'bg-red-50/50 dark:bg-red-900/10';
                      const corPercent = q.percentual_acerto >= 70 ? 'text-green-600 font-bold' :
                                        q.percentual_acerto >= 40 ? 'text-amber-600 font-bold' :
                                        'text-red-600 font-bold';
                      return (
                        <tr key={q.questao_id} className={`border-b border-gray-200 dark:border-slate-700 ${corLinha}`}>
                          <td className="py-1.5 px-2 font-medium">Q{q.numero}</td>
                          <td className="py-1.5 px-2 text-center text-gray-600 dark:text-gray-300">{q.total_respostas}</td>
                          <td className="py-1.5 px-2 text-center text-green-600 font-medium">{q.acertos}</td>
                          <td className="py-1.5 px-2 text-center text-red-600 font-medium">{erros}</td>
                          <td className={`py-1.5 px-2 text-center ${corPercent}`}>{q.percentual_acerto.toFixed(0)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-100 dark:bg-slate-700/50 font-semibold">
                    <tr>
                      <td className="py-1.5 px-2">Total</td>
                      <td className="py-1.5 px-2 text-center">{questoesOrdenadas.reduce((acc, q) => acc + q.total_respostas, 0)}</td>
                      <td className="py-1.5 px-2 text-center text-green-600">{questoesOrdenadas.reduce((acc, q) => acc + q.acertos, 0)}</td>
                      <td className="py-1.5 px-2 text-center text-red-600">{questoesOrdenadas.reduce((acc, q) => acc + (q.total_respostas - q.acertos), 0)}</td>
                      <td className="py-1.5 px-2 text-center">{mediaAcerto.toFixed(1)}%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Resumo: questões difíceis e fáceis */}
      <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {analise.questoes_dificeis && analise.questoes_dificeis.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
            <h5 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              Questões Difíceis (&lt;40%)
            </h5>
            <div className="flex flex-wrap gap-1">
              {analise.questoes_dificeis.slice(0, 5).map(q => (
                <span key={q.questao_id} className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 rounded px-2 py-0.5 text-xs border border-red-200 dark:border-red-700">
                  <span className="font-medium">{q.disciplina} Q{q.numero}</span>
                  <span className="text-red-600 font-bold">{q.percentual_acerto.toFixed(0)}%</span>
                </span>
              ))}
              {analise.questoes_dificeis.length > 5 && (
                <span className="text-xs text-red-600">+{analise.questoes_dificeis.length - 5} mais</span>
              )}
            </div>
          </div>
        )}

        {analise.questoes_faceis && analise.questoes_faceis.length > 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
            <h5 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Questões Fáceis (≥70%)
            </h5>
            <div className="flex flex-wrap gap-1">
              {analise.questoes_faceis.slice(0, 5).map(q => (
                <span key={q.questao_id} className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 rounded px-2 py-0.5 text-xs border border-green-200 dark:border-green-700">
                  <span className="font-medium">{q.disciplina} Q{q.numero}</span>
                  <span className="text-green-600 font-bold">{q.percentual_acerto.toFixed(0)}%</span>
                </span>
              ))}
              {analise.questoes_faceis.length > 5 && (
                <span className="text-xs text-green-600">+{analise.questoes_faceis.length - 5} mais</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Itens de Produção Textual (apenas para Anos Iniciais) */}
      {analise.itens_producao && analise.itens_producao.length > 0 && (
        <div className="px-4 pb-4">
          <div className={`${CORES_DISCIPLINAS['PROD'].bg} rounded-lg p-3 border ${CORES_DISCIPLINAS['PROD'].border}`}>
            <div className="flex items-center justify-between mb-3">
              <h5 className={`text-sm font-semibold ${CORES_DISCIPLINAS['PROD'].text} flex items-center gap-2`}>
                <FileText className="w-4 h-4" />
                Produção Textual - Itens Avaliados
              </h5>
              <span className="text-xs text-gray-600 dark:text-gray-300">
                {analise.itens_producao.length} itens
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-2">
              {analise.itens_producao.sort((a, b) => a.ordem - b.ordem).map(item => {
                const corAcerto = item.percentual_acerto >= 70 ? 'text-green-600 bg-green-100 dark:bg-green-900/50 border-green-200' :
                                 item.percentual_acerto >= 40 ? 'text-amber-600 bg-amber-100 dark:bg-amber-900/50 border-amber-200' :
                                 'text-red-600 bg-red-100 dark:bg-red-900/50 border-red-200';
                return (
                  <div key={item.item_id} className={`rounded p-2 text-center border ${corAcerto}`} title={item.item_nome}>
                    <p className="font-medium text-xs truncate">{item.item_codigo}</p>
                    <p className="text-sm font-bold">{item.media_item.toFixed(1)}</p>
                    <p className="text-xs opacity-75">/{item.nota_maxima}</p>
                    <p className="text-xs font-bold mt-0.5">{item.percentual_acerto.toFixed(0)}%</p>
                  </div>
                );
              })}
            </div>

            {/* Legenda dos itens */}
            <div className="mt-3 pt-2 border-t border-pink-200 dark:border-pink-800">
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Legenda dos Itens:</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-xs text-gray-500">
                {analise.itens_producao.sort((a, b) => a.ordem - b.ordem).map(item => (
                  <span key={`legend-${item.item_id}`} className="truncate" title={item.item_nome}>
                    <span className="font-medium">{item.item_codigo}:</span> {item.item_nome}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
