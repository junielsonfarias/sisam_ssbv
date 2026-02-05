'use client';

import { DadosRelatorioPolo, DadosSegmento, DesempenhoDisciplina, AnaliseQuestao } from '@/lib/relatorios/tipos';
import {
  GraficoDisciplinas,
  GraficoDistribuicao,
  GraficoQuestoes,
  GraficoNiveis
} from './graficos';
import {
  MapPin,
  Calendar,
  Users,
  BookOpen,
  TrendingUp,
  Award,
  AlertTriangle,
  CheckCircle,
  Target,
  Building2,
  Trophy,
  BarChart3,
  Hash,
  FileText,
  GraduationCap
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
  dados: DadosRelatorioPolo;
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

function TabelaEscolas({ escolas }: { escolas: DadosRelatorioPolo['escolas'] }) {
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

function TabelaComparativo({ comparativo, temCHCN }: { comparativo: DadosRelatorioPolo['comparativo_escolas']; temCHCN: boolean }) {
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
      </div>

      {/* Tabela de Desempenho por Disciplina */}
      <div className="mb-6">
        <TabelaDisciplinasDetalhada
          disciplinas={segmento.desempenho_disciplinas}
          titulo={`Desempenho por Disciplina - ${titulo}`}
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
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-6 mb-6 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-3 mb-3">
            <FileText className="w-6 h-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">
              Produção Textual
            </h3>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-bold text-purple-600">
              {segmento.producao_textual.media_geral.toFixed(2)}
            </p>
            <p className="text-sm text-purple-700 dark:text-purple-300">pontos (média geral)</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function RelatorioPoloWeb({ dados }: Props) {
  const temCHCN = dados.desempenho_disciplinas.some(d => d.disciplina === 'CH' || d.disciplina === 'CN');
  const temAnosIniciais = dados.anos_iniciais && dados.anos_iniciais.estatisticas.total_alunos > 0;
  const temAnosFinais = dados.anos_finais && dados.anos_finais.estatisticas.total_alunos > 0;

  return (
    <div className="relatorio-container max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <header className="cabecalho-relatorio bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 text-white rounded-lg p-6 mb-6 print:bg-purple-700 print:rounded-none shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-8 h-8" />
              <h1 className="text-2xl font-bold">{dados.polo.nome}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-purple-100 mt-3">
              <span className="flex items-center gap-1 bg-purple-500/30 px-3 py-1 rounded-full">
                <Building2 className="w-4 h-4" />
                {dados.escolas.length} Escolas
              </span>
              <span className="flex items-center gap-1 bg-purple-500/30 px-3 py-1 rounded-full">
                <Calendar className="w-4 h-4" />
                Ano Letivo {dados.ano_letivo}
              </span>
              {dados.serie_filtro && (
                <span className="flex items-center gap-1 bg-purple-500/30 px-3 py-1 rounded-full">
                  <BookOpen className="w-4 h-4" />
                  {dados.serie_filtro}
                </span>
              )}
            </div>
          </div>
          <div className="text-right print:hidden">
            <p className="text-sm text-purple-200">Gerado em</p>
            <p className="font-medium">{dados.data_geracao}</p>
          </div>
        </div>
      </header>

      {/* Resumo Executivo */}
      <section className="secao-relatorio mb-8">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white print:text-black">
            Resumo Executivo
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <CardEstatistica
            icone={Users}
            titulo="Total de Alunos"
            valor={dados.estatisticas.total_alunos}
            corIcone="bg-purple-100 dark:bg-purple-900/50 text-purple-600"
          />
          <CardEstatistica
            icone={Building2}
            titulo="Escolas"
            valor={dados.escolas.length}
            corIcone="bg-blue-100 dark:bg-blue-900/50 text-blue-600"
          />
          <CardEstatistica
            icone={TrendingUp}
            titulo="Média Geral"
            valor={dados.estatisticas.media_geral.toFixed(2)}
            corIcone="bg-green-100 dark:bg-green-900/50 text-green-600"
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
        </div>
      </section>

      {/* Desempenho por Disciplina (Tabela) */}
      <section className="secao-relatorio mb-8">
        <TabelaDisciplinasDetalhada
          disciplinas={dados.desempenho_disciplinas}
          titulo="Desempenho por Disciplina - Polo"
        />
      </section>

      {/* Gráficos - Visão Geral */}
      <section className="secao-relatorio mb-8 print:break-inside-avoid">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-6 h-6 text-purple-600" />
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

      {/* Ranking de Escolas */}
      <section className="secao-relatorio mb-8 print:break-inside-avoid">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white print:text-black">
            Ranking das Escolas
          </h2>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          <TabelaEscolas escolas={dados.escolas} />
        </div>
      </section>

      {/* Comparativo por Disciplina */}
      {dados.comparativo_escolas.length > 0 && (
        <section className="secao-relatorio mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white print:text-black">
              Comparativo por Disciplina
            </h2>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
            <TabelaComparativo comparativo={dados.comparativo_escolas} temCHCN={temCHCN} />
          </div>
        </section>
      )}

      {/* Produção Textual (se houver) */}
      {dados.producao_textual && dados.producao_textual.media_geral > 0 && !dados.serie_filtro && !temAnosIniciais && (
        <section className="secao-relatorio mb-8">
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-3 mb-3">
              <Award className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-bold text-purple-900 dark:text-purple-100">
                Produção Textual (Anos Iniciais)
              </h2>
            </div>
            <p className="text-4xl font-bold text-purple-600 mb-1">
              {dados.producao_textual.media_geral.toFixed(2)}
            </p>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              Média geral da produção textual do polo (2º, 3º e 5º Ano)
            </p>
          </div>
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

      {/* Análise de Questões por Disciplina */}
      <section className="secao-relatorio mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white print:text-black">
            Análise de Questões por Disciplina
          </h2>
        </div>

        {dados.analise_questoes.length > 0 ? (
          <>
            {/* Questões agrupadas por disciplina */}
            {Object.entries(agruparQuestoesPorDisciplina(dados.analise_questoes)).map(([disciplina, questoes]) => {
              const cores = CORES_DISCIPLINAS[disciplina] || CORES_DISCIPLINAS['Geral'];
              const nomeDisciplina = NOMES_DISCIPLINAS[disciplina] || disciplina;
              const mediaAcerto = questoes.reduce((acc, q) => acc + q.percentual_acerto, 0) / questoes.length;
              const questoesOrdenadas = [...questoes].sort((a, b) => a.numero - b.numero);

              return (
                <div key={disciplina} className={`${cores.bg} rounded-lg p-4 mb-4 border ${cores.border}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`text-lg font-semibold ${cores.text} flex items-center gap-2`}>
                      <BookOpen className="w-5 h-5" />
                      {nomeDisciplina}
                    </h3>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-600 dark:text-gray-300">
                        {questoes.length} questões
                      </span>
                      <span className={`font-bold ${mediaAcerto >= 70 ? 'text-green-600' : mediaAcerto >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                        Média: {mediaAcerto.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                    {questoesOrdenadas.map(q => {
                      const corAcerto = q.percentual_acerto >= 70 ? 'text-green-600 bg-green-100 dark:bg-green-900/50' :
                                       q.percentual_acerto >= 40 ? 'text-amber-600 bg-amber-100 dark:bg-amber-900/50' :
                                       'text-red-600 bg-red-100 dark:bg-red-900/50';
                      return (
                        <div key={q.questao_id} className="bg-white dark:bg-slate-800 rounded p-2 text-center shadow-sm">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">Q{q.numero}</p>
                          <p className={`text-sm font-bold rounded px-1 ${corAcerto}`}>
                            {q.percentual_acerto.toFixed(0)}%
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Resumo: Questões com menor desempenho (todas as disciplinas) */}
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
          <div className="mt-6 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-5 border border-purple-200 dark:border-purple-800">
            <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Recomendações de Ação
            </h3>
            <ol className="space-y-3">
              {dados.projecoes.recomendacoes.map((rec, index) => (
                <li key={index} className="flex items-start gap-3 text-purple-800 dark:text-purple-200">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 text-white text-sm font-bold flex items-center justify-center">
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
          <MapPin className="w-4 h-4" />
          <p className="font-medium">Relatório gerado pelo SISAM - Sistema de Avaliação Municipal</p>
        </div>
        <p>Data de geração: {dados.data_geracao} | Polo: {dados.polo.nome} | Ano Letivo: {dados.ano_letivo}</p>
      </footer>
    </div>
  );
}
