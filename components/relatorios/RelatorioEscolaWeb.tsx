'use client';

import { DadosRelatorioEscola, DadosSegmento, DesempenhoDisciplina, AnaliseQuestao, AnaliseQuestoesSerie, FaltasSerie, ItemProducaoAvaliado } from '@/lib/relatorios/tipos';
import {
  GraficoDisciplinas,
  GraficoDistribuicao,
  GraficoQuestoes,
  GraficoNiveis
} from './graficos';
import {
  Building2,
  MapPin,
  Calendar,
  Users,
  BookOpen,
  TrendingUp,
  Award,
  AlertTriangle,
  CheckCircle,
  Target,
  BarChart3,
  PieChart,
  GraduationCap,
  FileText,
  Percent,
  Hash,
  UserX,
  UserCheck
} from 'lucide-react';

// Função para agrupar questões por disciplina
function agruparQuestoesPorDisciplina(questoes: AnaliseQuestao[]): Record<string, AnaliseQuestao[]> {
  return questoes.reduce((acc, questao) => {
    const disc = questao.disciplina || 'Geral';
    if (!acc[disc]) {
      acc[disc] = [];
    }
    acc[disc].push(questao);
    return acc;
  }, {} as Record<string, AnaliseQuestao[]>);
}

// Cores para cada disciplina
const CORES_DISCIPLINAS: Record<string, { bg: string; border: string; text: string }> = {
  'LP': { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-600' },
  'MAT': { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', text: 'text-green-600' },
  'PROD': { bg: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-pink-200 dark:border-pink-800', text: 'text-pink-600' },
  'CH': { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-600' },
  'CN': { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-600' },
  'Geral': { bg: 'bg-gray-50 dark:bg-gray-900/20', border: 'border-gray-200 dark:border-gray-800', text: 'text-gray-600' }
};

const NOMES_DISCIPLINAS: Record<string, string> = {
  'LP': 'Língua Portuguesa',
  'MAT': 'Matemática',
  'PROD': 'Produção Textual',
  'CH': 'Ciências Humanas',
  'CN': 'Ciências da Natureza',
  'Geral': 'Geral'
};

interface Props {
  dados: DadosRelatorioEscola;
}

function CardEstatistica({
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

function TabelaDisciplinasDetalhada({
  disciplinas,
  titulo,
  totalAlunos
}: {
  disciplinas: DesempenhoDisciplina[];
  titulo: string;
  totalAlunos: number;
}) {
  if (disciplinas.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white print:text-black flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
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

// Cores padrão para níveis de aprendizagem
const CORES_NIVEIS: Record<string, string> = {
  'Avançado': '#22C55E',
  'Adequado': '#3B82F6',
  'Básico': '#F59E0B',
  'Insuficiente': '#EF4444'
};

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

function TabelaTurmas({
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

// Componente para exibir análise de questões por série
function SecaoAnaliseQuestoesSerie({ analise }: { analise: AnaliseQuestoesSerie }) {
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

function SecaoSegmentoCompleta({
  segmento,
  titulo,
  corTema,
  mostrarNiveis = true
}: {
  segmento: DadosSegmento;
  titulo: string;
  corTema: 'blue' | 'purple';
  mostrarNiveis?: boolean;
}) {
  const temCHCN = segmento.desempenho_disciplinas.some(d => d.disciplina === 'CH' || d.disciplina === 'CN');
  const temPROD = segmento.desempenho_disciplinas.some(d => d.disciplina === 'PROD');
  const corIcone = corTema === 'blue' ? 'text-blue-600' : 'text-purple-600';
  const bgIcone = corTema === 'blue' ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-purple-100 dark:bg-purple-900/50';
  const bgHeader = corTema === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-purple-50 dark:bg-purple-900/20';
  const borderColor = corTema === 'blue' ? 'border-blue-200 dark:border-blue-800' : 'border-purple-200 dark:border-purple-800';

  return (
    <div className="secao-relatorio print:break-inside-avoid mb-8">
      {/* Cabeçalho do Segmento */}
      <div className={`${bgHeader} rounded-lg p-4 mb-6 border ${borderColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${bgIcone}`}>
              <GraduationCap className={`w-6 h-6 ${corIcone}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white print:text-black">
                {titulo}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Séries: {segmento.series.join(', ')}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {segmento.estatisticas.media_geral.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500">Média Geral</p>
          </div>
        </div>
      </div>

      {/* Cards de estatísticas do segmento */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <CardEstatistica
          icone={Users}
          titulo="Alunos Avaliados"
          valor={segmento.estatisticas.total_alunos}
          corIcone={`${bgIcone} ${corIcone}`}
        />
        <CardEstatistica
          icone={BookOpen}
          titulo="Turmas"
          valor={segmento.estatisticas.total_turmas}
          corIcone="bg-green-100 dark:bg-green-900/50 text-green-600"
        />
        <CardEstatistica
          icone={TrendingUp}
          titulo="Média Geral"
          valor={segmento.estatisticas.media_geral.toFixed(2)}
          corIcone="bg-amber-100 dark:bg-amber-900/50 text-amber-600"
          corValor={segmento.estatisticas.media_geral >= 7 ? 'text-green-600' :
                   segmento.estatisticas.media_geral >= 5 ? 'text-amber-600' : 'text-red-600'}
        />
        <CardEstatistica
          icone={Target}
          titulo="Participação"
          valor={`${segmento.estatisticas.taxa_participacao.toFixed(1)}%`}
          corIcone="bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600"
        />
        {segmento.estatisticas.total_presentes !== undefined && (
          <CardEstatistica
            icone={UserCheck}
            titulo="Presentes"
            valor={segmento.estatisticas.total_presentes}
            corIcone="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600"
          />
        )}
        {segmento.estatisticas.total_ausentes !== undefined && (
          <CardEstatistica
            icone={UserX}
            titulo="Ausentes"
            valor={segmento.estatisticas.total_ausentes}
            corIcone="bg-red-100 dark:bg-red-900/50 text-red-600"
          />
        )}
      </div>

      {/* Tabela de Desempenho por Disciplina */}
      <div className="mb-6">
        <TabelaDisciplinasDetalhada
          disciplinas={segmento.desempenho_disciplinas}
          titulo={`Desempenho por Disciplina - ${titulo}`}
          totalAlunos={segmento.estatisticas.total_alunos}
        />
      </div>

      {/* Gráficos do segmento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-slate-700">
          <GraficoDisciplinas disciplinas={segmento.desempenho_disciplinas} titulo={`Médias - ${titulo}`} />
        </div>
        {/* Gráfico de níveis apenas para anos iniciais */}
        {mostrarNiveis && segmento.distribuicao_niveis && segmento.distribuicao_niveis.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-slate-700">
            <GraficoNiveis niveis={segmento.distribuicao_niveis} titulo={`Níveis - ${titulo}`} />
          </div>
        )}
      </div>

      {/* Produção Textual (apenas Anos Iniciais) */}
      {segmento.producao_textual && segmento.producao_textual.media_geral > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 mb-6 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3 mb-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              Produção Textual
            </h3>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-bold text-blue-600">
              {segmento.producao_textual.media_geral.toFixed(2)}
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">pontos (média geral)</p>
          </div>
        </div>
      )}

      {/* Análise de questões por série dentro do segmento */}
      {segmento.analise_questoes_por_serie && segmento.analise_questoes_por_serie.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white print:text-black">
              Análise de Questões por Série - {titulo}
            </h3>
          </div>
          {segmento.analise_questoes_por_serie.map((analise) => (
            <SecaoAnaliseQuestoesSerie key={analise.serie} analise={analise} />
          ))}
        </div>
      )}

      {/* Tabela de turmas do segmento */}
      {segmento.turmas.length > 0 && (
        <TabelaTurmas
          turmas={segmento.turmas}
          mostrarCHCN={temCHCN}
          mostrarPROD={temPROD}
          mostrarNiveis={mostrarNiveis}
          titulo={`Detalhamento por Turmas - ${titulo}`}
        />
      )}
    </div>
  );
}

export function RelatorioEscolaWeb({ dados }: Props) {
  const temCHCN = dados.desempenho_disciplinas.some(d => d.disciplina === 'CH' || d.disciplina === 'CN');
  const temAnosIniciais = dados.anos_iniciais && dados.anos_iniciais.estatisticas.total_alunos > 0;
  const temAnosFinais = dados.anos_finais && dados.anos_finais.estatisticas.total_alunos > 0;

  return (
    <div className="relatorio-container max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <header className="cabecalho-relatorio bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white rounded-lg p-6 mb-6 print:bg-blue-700 print:rounded-none shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-8 h-8" />
              <h1 className="text-2xl font-bold">{dados.escola.nome}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-blue-100 mt-3">
              <span className="flex items-center gap-1 bg-blue-500/30 px-3 py-1 rounded-full">
                <MapPin className="w-4 h-4" />
                {dados.escola.polo_nome}
              </span>
              <span className="flex items-center gap-1 bg-blue-500/30 px-3 py-1 rounded-full">
                <Calendar className="w-4 h-4" />
                Ano Letivo {dados.ano_letivo}
              </span>
              {dados.serie_filtro && (
                <span className="flex items-center gap-1 bg-blue-500/30 px-3 py-1 rounded-full">
                  <BookOpen className="w-4 h-4" />
                  {dados.serie_filtro}
                </span>
              )}
            </div>
          </div>
          <div className="text-right print:hidden">
            <p className="text-sm text-blue-200">Gerado em</p>
            <p className="font-medium">{dados.data_geracao}</p>
          </div>
        </div>
      </header>

      {/* Resumo Executivo */}
      <section className="secao-relatorio mb-8">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white print:text-black">
            Resumo Executivo
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          <CardEstatistica
            icone={Users}
            titulo="Total de Alunos"
            valor={dados.estatisticas.total_alunos}
            corIcone="bg-blue-100 dark:bg-blue-900/50 text-blue-600"
          />
          <CardEstatistica
            icone={BookOpen}
            titulo="Total de Turmas"
            valor={dados.estatisticas.total_turmas}
            corIcone="bg-green-100 dark:bg-green-900/50 text-green-600"
          />
          <CardEstatistica
            icone={TrendingUp}
            titulo="Média Geral"
            valor={dados.estatisticas.media_geral.toFixed(2)}
            corIcone="bg-purple-100 dark:bg-purple-900/50 text-purple-600"
            corValor={dados.estatisticas.media_geral >= 7 ? 'text-green-600' :
                     dados.estatisticas.media_geral >= 5 ? 'text-amber-600' : 'text-red-600'}
          />
          <CardEstatistica
            icone={Target}
            titulo="Participação"
            valor={`${dados.estatisticas.taxa_participacao.toFixed(1)}%`}
            corIcone="bg-amber-100 dark:bg-amber-900/50 text-amber-600"
          />
          <CardEstatistica
            icone={Hash}
            titulo="Avaliações"
            valor={dados.estatisticas.total_avaliacoes}
            corIcone="bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600"
          />
          {dados.estatisticas.total_presentes !== undefined && (
            <CardEstatistica
              icone={UserCheck}
              titulo="Presentes"
              valor={dados.estatisticas.total_presentes}
              corIcone="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600"
            />
          )}
          {dados.estatisticas.total_ausentes !== undefined && (
            <CardEstatistica
              icone={UserX}
              titulo="Ausentes"
              valor={dados.estatisticas.total_ausentes}
              corIcone="bg-red-100 dark:bg-red-900/50 text-red-600"
            />
          )}
        </div>

        {/* Quadro de Faltas por Série */}
        {dados.faltas_por_serie && dados.faltas_por_serie.length > 0 && (
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
                  {dados.faltas_por_serie.map((falta) => {
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
        )}

        {/* Comparativo com Polo */}
        {dados.comparativo_polo && (
          <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-slate-700/50 dark:to-slate-800/50 rounded-lg p-6 border border-gray-200 dark:border-slate-600">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-600" />
              Comparativo com o Polo
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Média da Escola</p>
                <p className="text-3xl font-bold text-blue-600">
                  {dados.comparativo_polo.media_escola.toFixed(2)}
                </p>
              </div>
              <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Média do Polo</p>
                <p className="text-3xl font-bold text-gray-600 dark:text-gray-300">
                  {dados.comparativo_polo.media_polo.toFixed(2)}
                </p>
              </div>
              <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Diferença</p>
                <p className={`text-3xl font-bold ${
                  dados.comparativo_polo.diferenca >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {dados.comparativo_polo.diferenca >= 0 ? '+' : ''}{dados.comparativo_polo.diferenca.toFixed(2)}
                </p>
              </div>
              {dados.comparativo_polo.posicao_ranking && dados.comparativo_polo.total_escolas_polo && (
                <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Ranking no Polo</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {dados.comparativo_polo.posicao_ranking}º
                    <span className="text-lg text-gray-400">/{dados.comparativo_polo.total_escolas_polo}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Quadro Comparativo de Médias por Segmento - POSICIONADO NO TOPO */}
      {(temAnosIniciais || temAnosFinais) && (
        <section className="secao-relatorio mb-8">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white print:text-black">
              Comparativo de Médias por Segmento
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Média Geral da Escola */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-5 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  Média Geral da Escola
                </h3>
              </div>
              <p className={`text-4xl font-bold ${
                dados.estatisticas.media_geral >= 7 ? 'text-green-600' :
                dados.estatisticas.media_geral >= 5 ? 'text-amber-600' : 'text-red-600'
              }`}>
                {dados.estatisticas.media_geral.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {dados.estatisticas.total_alunos} alunos avaliados
              </p>
            </div>

            {/* Média Anos Iniciais */}
            {temAnosIniciais && dados.anos_iniciais && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-5 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="w-5 h-5 text-green-600" />
                  <h3 className="text-sm font-semibold text-green-900 dark:text-green-100">
                    Média Anos Iniciais
                  </h3>
                </div>
                <p className={`text-4xl font-bold ${
                  dados.anos_iniciais.estatisticas.media_geral >= 7 ? 'text-green-600' :
                  dados.anos_iniciais.estatisticas.media_geral >= 5 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {dados.anos_iniciais.estatisticas.media_geral.toFixed(2)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {dados.anos_iniciais.series.join(', ')} • {dados.anos_iniciais.estatisticas.total_alunos} alunos
                </p>
              </div>
            )}

            {/* Média Anos Finais */}
            {temAnosFinais && dados.anos_finais && (
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-lg p-5 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="w-5 h-5 text-purple-600" />
                  <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                    Média Anos Finais
                  </h3>
                </div>
                <p className={`text-4xl font-bold ${
                  dados.anos_finais.estatisticas.media_geral >= 7 ? 'text-green-600' :
                  dados.anos_finais.estatisticas.media_geral >= 5 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {dados.anos_finais.estatisticas.media_geral.toFixed(2)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {dados.anos_finais.series.join(', ')} • {dados.anos_finais.estatisticas.total_alunos} alunos
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Desempenho Geral por Disciplina (quando há filtro de série ou sem segmentos) */}
      {(dados.serie_filtro || (!temAnosIniciais && !temAnosFinais)) && (
        <section className="secao-relatorio mb-8">
          <TabelaDisciplinasDetalhada
            disciplinas={dados.desempenho_disciplinas}
            titulo="Desempenho por Disciplina"
            totalAlunos={dados.estatisticas.total_alunos}
          />
        </section>
      )}

      {/* Gráficos Gerais */}
      <section className="secao-relatorio mb-8 print:break-inside-avoid">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white print:text-black">
            Visão Geral do Desempenho
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-slate-700">
            <GraficoDisciplinas disciplinas={dados.desempenho_disciplinas} titulo="Média por Disciplina" />
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-slate-700">
            <GraficoDistribuicao distribuicao={dados.graficos.distribuicao_notas} />
          </div>
        </div>

        {/* Gráfico de níveis apenas se houver dados de anos iniciais */}
        {temAnosIniciais && dados.distribuicao_niveis && dados.distribuicao_niveis.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-slate-700 mb-6">
            <GraficoNiveis niveis={dados.distribuicao_niveis} />
          </div>
        )}
      </section>

      {/* Produção Textual Geral (se houver e não tiver segmentos) */}
      {dados.producao_textual && dados.producao_textual.media_geral > 0 && !dados.serie_filtro && !temAnosIniciais && (
        <section className="secao-relatorio mb-8">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3 mb-3">
              <Award className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100">
                Produção Textual (Anos Iniciais)
              </h2>
            </div>
            <p className="text-4xl font-bold text-blue-600 mb-1">
              {dados.producao_textual.media_geral.toFixed(2)}
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Média geral da produção textual das séries avaliadas (2º, 3º e 5º Ano)
            </p>
          </div>
        </section>
      )}

      {/* Tabela de Turmas (quando há filtro de série) */}
      {dados.serie_filtro && dados.turmas.length > 0 && (
        <section className="secao-relatorio mb-8">
          <TabelaTurmas
            turmas={dados.turmas}
            mostrarCHCN={temCHCN}
            mostrarPROD={['2º Ano', '3º Ano', '5º Ano'].includes(dados.serie_filtro)}
            titulo="Detalhamento por Turmas"
          />
        </section>
      )}

      {/* ============================================ */}
      {/* SEÇÕES POR SEGMENTO (Anos Iniciais e Finais) */}
      {/* ============================================ */}

      {!dados.serie_filtro && (
        <>
          {/* Anos Iniciais - com níveis de aprendizagem */}
          {temAnosIniciais && dados.anos_iniciais && (
            <SecaoSegmentoCompleta
              segmento={dados.anos_iniciais}
              titulo="Anos Iniciais"
              corTema="blue"
              mostrarNiveis={true}
            />
          )}

          {/* Anos Finais - sem níveis de aprendizagem */}
          {temAnosFinais && dados.anos_finais && (
            <SecaoSegmentoCompleta
              segmento={dados.anos_finais}
              titulo="Anos Finais"
              corTema="purple"
              mostrarNiveis={false}
            />
          )}
        </>
      )}

      {/* Análise de Questões por Série */}
      {dados.analise_questoes_por_serie && dados.analise_questoes_por_serie.length > 0 && (
        <section className="secao-relatorio mb-8">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white print:text-black">
              Análise de Questões por Série
            </h2>
          </div>

          {dados.analise_questoes_por_serie.map((analise) => (
            <SecaoAnaliseQuestoesSerie key={analise.serie} analise={analise} />
          ))}
        </section>
      )}

      {/* Análise de Questões por Disciplina - Agrupada por Segmento */}
      <section className="secao-relatorio mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white print:text-black">
            Análise de Questões por Disciplina (Visão Geral)
          </h2>
        </div>

        {dados.analise_questoes.length > 0 ? (
          <>
            {/* Anos Iniciais - LP, MAT (questões objetivas) */}
            {dados.analise_questoes.some(q => ['LP', 'MAT'].includes(q.disciplina)) && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200 dark:border-slate-700">
                  <GraduationCap className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Questões Objetivas - LP e MAT
                  </h3>
                  <span className="text-sm text-gray-500">Todas as séries</span>
                </div>
                {Object.entries(agruparQuestoesPorDisciplina(
                  dados.analise_questoes.filter(q => ['LP', 'MAT'].includes(q.disciplina))
                )).map(([disciplina, questoes]) => {
                  const cores = CORES_DISCIPLINAS[disciplina] || CORES_DISCIPLINAS['Geral'];
                  const nomeDisciplina = NOMES_DISCIPLINAS[disciplina] || disciplina;
                  const mediaAcerto = questoes.reduce((acc, q) => acc + q.percentual_acerto, 0) / questoes.length;
                  const questoesOrdenadas = [...questoes].sort((a, b) => a.numero - b.numero);

                  return (
                    <div key={disciplina} className={`${cores.bg} rounded-lg p-4 mb-3 border ${cores.border}`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className={`text-base font-semibold ${cores.text} flex items-center gap-2`}>
                          <BookOpen className="w-4 h-4" />
                          {nomeDisciplina}
                        </h4>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-600 dark:text-gray-300">{questoes.length} questões</span>
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
            )}

            {/* Anos Finais - CH, CN (disciplinas específicas) */}
            {dados.analise_questoes.some(q => ['CH', 'CN'].includes(q.disciplina)) && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200 dark:border-slate-700">
                  <GraduationCap className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Questões Objetivas - CH e CN
                  </h3>
                  <span className="text-sm text-gray-500">Anos Finais (8º, 9º Ano)</span>
                </div>
                {Object.entries(agruparQuestoesPorDisciplina(
                  dados.analise_questoes.filter(q => ['CH', 'CN'].includes(q.disciplina))
                )).map(([disciplina, questoes]) => {
                  const cores = CORES_DISCIPLINAS[disciplina] || CORES_DISCIPLINAS['Geral'];
                  const nomeDisciplina = NOMES_DISCIPLINAS[disciplina] || disciplina;
                  const mediaAcerto = questoes.reduce((acc, q) => acc + q.percentual_acerto, 0) / questoes.length;
                  const questoesOrdenadas = [...questoes].sort((a, b) => a.numero - b.numero);

                  return (
                    <div key={disciplina} className={`${cores.bg} rounded-lg p-4 mb-3 border ${cores.border}`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className={`text-base font-semibold ${cores.text} flex items-center gap-2`}>
                          <BookOpen className="w-4 h-4" />
                          {nomeDisciplina}
                        </h4>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-600 dark:text-gray-300">{questoes.length} questões</span>
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
            )}

            {/* Resumo: Questões com menor desempenho */}
            {dados.analise_questoes.filter(q => q.percentual_acerto < 40).length > 0 && (
              <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-lg p-4 mt-4 border border-red-200 dark:border-red-800">
                <h3 className="text-base font-semibold text-red-900 dark:text-red-100 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Questões com Baixo Desempenho (&lt;40%)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {dados.analise_questoes
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

      {/* Recomendações Pedagógicas */}
      <section className="secao-relatorio mb-8">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white print:text-black">
            Recomendações Pedagógicas
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pontos Fortes */}
          {dados.projecoes.pontos_fortes.length > 0 && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-5 border border-green-200 dark:border-green-800">
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Pontos Fortes
              </h3>
              <ul className="space-y-3">
                {dados.projecoes.pontos_fortes.map((ponto, index) => (
                  <li key={index} className="flex items-start gap-3 text-green-800 dark:text-green-200">
                    <CheckCircle className="w-4 h-4 mt-1 flex-shrink-0 text-green-600" />
                    <span className="text-sm">{ponto}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Áreas de Atenção */}
          {dados.projecoes.areas_atencao.length > 0 && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg p-5 border border-amber-200 dark:border-amber-800">
              <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Áreas de Atenção
              </h3>
              <ul className="space-y-3">
                {dados.projecoes.areas_atencao.map((area, index) => (
                  <li key={index} className="flex items-start gap-3 text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="w-4 h-4 mt-1 flex-shrink-0 text-amber-600" />
                    <span className="text-sm">{area}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Recomendações */}
        {dados.projecoes.recomendacoes.length > 0 && (
          <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-5 border border-blue-200 dark:border-blue-800">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Recomendações de Ação
            </h3>
            <ol className="space-y-3">
              {dados.projecoes.recomendacoes.map((rec, index) => (
                <li key={index} className="flex items-start gap-3 text-blue-800 dark:text-blue-200">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="text-sm">{rec}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      {/* Rodapé */}
      <footer className="rodape-relatorio text-center text-sm text-gray-500 dark:text-gray-400 py-6 border-t border-gray-200 dark:border-slate-700 mt-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Building2 className="w-4 h-4" />
          <p className="font-medium">Relatório gerado pelo SISAM - Sistema de Avaliação Municipal</p>
        </div>
        <p>Data de geração: {dados.data_geracao} | Escola: {dados.escola.nome} | Ano Letivo: {dados.ano_letivo}</p>
      </footer>
    </div>
  );
}
