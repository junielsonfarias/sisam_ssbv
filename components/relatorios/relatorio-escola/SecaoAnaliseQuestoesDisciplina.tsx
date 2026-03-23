import { AnaliseQuestao } from '@/lib/relatorios/tipos';
import {
  BookOpen,
  AlertTriangle,
  Target,
  GraduationCap
} from 'lucide-react';
import { agruparQuestoesPorDisciplina, CORES_DISCIPLINAS, NOMES_DISCIPLINAS } from './constants';

function BlocoQuestoesDisciplina({
  questoes,
  filtro,
  titulo,
  subtitulo,
  corIcone
}: {
  questoes: AnaliseQuestao[];
  filtro: string[];
  titulo: string;
  subtitulo: string;
  corIcone: string;
}) {
  const questoesFiltradas = questoes.filter(q => filtro.includes(q.disciplina));
  if (!questoesFiltradas.length) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200 dark:border-slate-700">
        <GraduationCap className={`w-5 h-5 ${corIcone}`} />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {titulo}
        </h3>
        <span className="text-sm text-gray-500">{subtitulo}</span>
      </div>
      {Object.entries(agruparQuestoesPorDisciplina(questoesFiltradas)).map(([disciplina, questoesDisciplina]) => {
        const cores = CORES_DISCIPLINAS[disciplina] || CORES_DISCIPLINAS['Geral'];
        const nomeDisciplina = NOMES_DISCIPLINAS[disciplina] || disciplina;
        const mediaAcerto = questoesDisciplina.reduce((acc, q) => acc + q.percentual_acerto, 0) / questoesDisciplina.length;
        const questoesOrdenadas = [...questoesDisciplina].sort((a, b) => a.numero - b.numero);

        return (
          <div key={disciplina} className={`${cores.bg} rounded-lg p-4 mb-3 border ${cores.border}`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className={`text-base font-semibold ${cores.text} flex items-center gap-2`}>
                <BookOpen className="w-4 h-4" />
                {nomeDisciplina}
              </h4>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-600 dark:text-gray-300">{questoesDisciplina.length} questões</span>
                <span className={`font-bold ${mediaAcerto >= 70 ? 'text-green-600' : mediaAcerto >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                  Média: {mediaAcerto.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
              {questoesOrdenadas.map(q => {
                const corAcerto = q.percentual_acerto >= 70 ? 'text-green-600 bg-green-100 dark:bg-green-900/50 border-green-200' :
                                 q.percentual_acerto >= 40 ? 'text-amber-600 bg-amber-100 dark:bg-amber-900/50 border-amber-200' :
                                 'text-red-600 bg-red-100 dark:bg-red-900/50 border-red-200';
                return (
                  <div key={q.questao_id} className={`rounded p-1.5 text-center border ${corAcerto}`}>
                    <p className="font-medium text-xs">Q{q.numero}</p>
                    <p className="text-xs font-bold">{q.percentual_acerto.toFixed(0)}%</p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SecaoAnaliseQuestoesDisciplina({ analiseQuestoes }: { analiseQuestoes: AnaliseQuestao[] }) {
  return (
    <section className="secao-relatorio mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white print:text-black">
          Análise de Questões por Disciplina (Visão Geral)
        </h2>
      </div>

      {analiseQuestoes.length > 0 ? (
        <>
          <BlocoQuestoesDisciplina
            questoes={analiseQuestoes}
            filtro={['LP', 'MAT']}
            titulo="Questões Objetivas - LP e MAT"
            subtitulo="Todas as séries"
            corIcone="text-green-600"
          />

          <BlocoQuestoesDisciplina
            questoes={analiseQuestoes}
            filtro={['CH', 'CN']}
            titulo="Questões Objetivas - CH e CN"
            subtitulo="Anos Finais (8º, 9º Ano)"
            corIcone="text-purple-600"
          />

          {/* Resumo: Questões com menor desempenho */}
          {analiseQuestoes.filter(q => q.percentual_acerto < 40).length > 0 && (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-lg p-4 mt-4 border border-red-200 dark:border-red-800">
              <h3 className="text-base font-semibold text-red-900 dark:text-red-100 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Questões com Baixo Desempenho (&lt;40%)
              </h3>
              <div className="flex flex-wrap gap-2">
                {analiseQuestoes
                  .filter(q => q.percentual_acerto < 40)
                  .sort((a, b) => a.percentual_acerto - b.percentual_acerto)
                  .map(q => (
                    <span key={q.questao_id} className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 rounded px-2 py-1 text-sm border border-red-200 dark:border-red-700">
                      <span className="font-medium">{q.disciplina} Q{q.numero}</span>
                      <span className="text-red-600 font-bold">{q.percentual_acerto.toFixed(0)}%</span>
                    </span>
                  ))
                }
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">Sem dados de questões disponíveis</p>
        </div>
      )}
    </section>
  );
}
