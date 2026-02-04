'use client';

import { DadosRelatorioPolo, DadosSegmento } from '@/lib/relatorios/tipos';
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
  Trophy
} from 'lucide-react';

interface Props {
  dados: DadosRelatorioPolo;
}

function CardEstatistica({
  icone: Icone,
  titulo,
  valor,
  subtitulo,
  corIcone
}: {
  icone: React.ElementType;
  titulo: string;
  valor: string | number;
  subtitulo?: string;
  corIcone: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-slate-700 print:border print:border-gray-300">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${corIcone}`}>
          <Icone className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 print:text-gray-600">{titulo}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white print:text-black">{valor}</p>
          {subtitulo && (
            <p className="text-xs text-gray-400 dark:text-gray-500">{subtitulo}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function TabelaEscolas({ escolas }: { escolas: DadosRelatorioPolo['escolas'] }) {
  if (escolas.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
        <thead className="bg-gray-50 dark:bg-slate-700/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
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
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
          {escolas.map((escola) => (
            <tr key={escola.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  {escola.ranking_posicao <= 3 ? (
                    <Trophy className={`w-5 h-5 ${
                      escola.ranking_posicao === 1 ? 'text-yellow-500' :
                      escola.ranking_posicao === 2 ? 'text-gray-400' : 'text-amber-600'
                    }`} />
                  ) : (
                    <span className="w-5 text-center text-gray-500">{escola.ranking_posicao}º</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white print:text-black">
                {escola.nome}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-400">
                {escola.total_alunos}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-400">
                {escola.total_turmas}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                <span className={`font-bold ${
                  escola.media_geral >= 6 ? 'text-green-600' :
                  escola.media_geral >= 4 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {escola.media_geral.toFixed(2)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabelaComparativo({ comparativo }: { comparativo: DadosRelatorioPolo['comparativo_escolas'] }) {
  if (comparativo.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
        <thead className="bg-gray-50 dark:bg-slate-700/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Escola
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              LP
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              MAT
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              CH
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              CN
            </th>
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
                <span className={`font-medium ${
                  escola.lp >= 6 ? 'text-green-600' :
                  escola.lp >= 4 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {escola.lp.toFixed(1)}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                <span className={`font-medium ${
                  escola.mat >= 6 ? 'text-green-600' :
                  escola.mat >= 4 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {escola.mat.toFixed(1)}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                <span className={`font-medium ${
                  (escola.ch || 0) >= 6 ? 'text-green-600' :
                  (escola.ch || 0) >= 4 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {escola.ch ? escola.ch.toFixed(1) : '-'}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                <span className={`font-medium ${
                  (escola.cn || 0) >= 6 ? 'text-green-600' :
                  (escola.cn || 0) >= 4 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {escola.cn ? escola.cn.toFixed(1) : '-'}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                <span className={`font-bold ${
                  escola.media >= 6 ? 'text-green-600' :
                  escola.media >= 4 ? 'text-amber-600' : 'text-red-600'
                }`}>
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

function SecaoSegmento({ segmento, titulo }: { segmento: DadosSegmento; titulo: string }) {
  return (
    <div className="secao-relatorio print:break-before-page">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 print:text-black flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-purple-600" />
        {titulo}
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <CardEstatistica
          icone={Users}
          titulo="Alunos"
          valor={segmento.estatisticas.total_alunos}
          corIcone="bg-purple-100 dark:bg-purple-900/50 text-purple-600"
        />
        <CardEstatistica
          icone={BookOpen}
          titulo="Turmas"
          valor={segmento.estatisticas.total_turmas}
          corIcone="bg-green-100 dark:bg-green-900/50 text-green-600"
        />
        <CardEstatistica
          icone={TrendingUp}
          titulo="Média"
          valor={segmento.estatisticas.media_geral.toFixed(2)}
          corIcone="bg-blue-100 dark:bg-blue-900/50 text-blue-600"
        />
        <CardEstatistica
          icone={Target}
          titulo="Participação"
          valor={`${segmento.estatisticas.taxa_participacao.toFixed(1)}%`}
          corIcone="bg-amber-100 dark:bg-amber-900/50 text-amber-600"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-slate-700">
          <GraficoDisciplinas disciplinas={segmento.desempenho_disciplinas} />
        </div>
        {segmento.distribuicao_niveis && segmento.distribuicao_niveis.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-slate-700">
            <GraficoNiveis niveis={segmento.distribuicao_niveis} />
          </div>
        )}
      </div>

      {segmento.producao_textual && segmento.producao_textual.media_geral > 0 && (
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-2">
            Produção Textual
          </h3>
          <p className="text-3xl font-bold text-purple-600">
            {segmento.producao_textual.media_geral.toFixed(2)}
          </p>
          <p className="text-sm text-purple-700 dark:text-purple-300">Média geral da produção textual</p>
        </div>
      )}
    </div>
  );
}

export function RelatorioPoloWeb({ dados }: Props) {
  return (
    <div className="relatorio-container max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <header className="cabecalho-relatorio bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-lg p-6 mb-6 print:bg-purple-700 print:rounded-none">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">{dados.polo.nome}</h1>
            <div className="flex flex-wrap items-center gap-4 text-purple-100">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                Polo Regional
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Ano Letivo {dados.ano_letivo}
              </span>
              {dados.serie_filtro && (
                <span className="flex items-center gap-1">
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

      {/* Visão Geral - Estatísticas */}
      <section className="secao-relatorio mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 print:text-black flex items-center gap-2">
          <MapPin className="w-5 h-5 text-purple-600" />
          Visão Geral do Polo
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
          />
          <CardEstatistica
            icone={Target}
            titulo="Participação"
            valor={`${dados.estatisticas.taxa_participacao.toFixed(1)}%`}
            corIcone="bg-amber-100 dark:bg-amber-900/50 text-amber-600"
          />
        </div>
      </section>

      {/* Gráficos - Visão Geral */}
      <section className="secao-relatorio mb-8 print:break-before-page">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 print:text-black flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-600" />
          Desempenho do Polo
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-slate-700">
            <GraficoDisciplinas disciplinas={dados.desempenho_disciplinas} />
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-slate-700">
            <GraficoDistribuicao distribuicao={dados.graficos.distribuicao_notas} />
          </div>
        </div>

        {dados.distribuicao_niveis && dados.distribuicao_niveis.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-slate-700 mb-6">
            <GraficoNiveis niveis={dados.distribuicao_niveis} />
          </div>
        )}
      </section>

      {/* Ranking de Escolas */}
      <section className="secao-relatorio mb-8 print:break-before-page">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 print:text-black flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Ranking das Escolas
        </h2>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          <TabelaEscolas escolas={dados.escolas} />
        </div>
      </section>

      {/* Comparativo por Disciplina */}
      {dados.comparativo_escolas.length > 0 && (
        <section className="secao-relatorio mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 print:text-black flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-600" />
            Comparativo por Disciplina
          </h2>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
            <TabelaComparativo comparativo={dados.comparativo_escolas} />
          </div>
        </section>
      )}

      {/* Produção Textual (se houver) */}
      {dados.producao_textual && dados.producao_textual.media_geral > 0 && !dados.serie_filtro && (
        <section className="secao-relatorio mb-8">
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6">
            <h2 className="text-xl font-bold text-purple-900 dark:text-purple-100 mb-2 flex items-center gap-2">
              <Award className="w-5 h-5" />
              Produção Textual (Anos Iniciais)
            </h2>
            <p className="text-4xl font-bold text-purple-600 mb-1">
              {dados.producao_textual.media_geral.toFixed(2)}
            </p>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              Média geral da produção textual do polo (2º, 3º e 5º Ano)
            </p>
          </div>
        </section>
      )}

      {/* Dados por Segmento (quando não há filtro de série) */}
      {!dados.serie_filtro && (
        <>
          {dados.anos_iniciais && (
            <SecaoSegmento segmento={dados.anos_iniciais} titulo="Anos Iniciais" />
          )}
          {dados.anos_finais && (
            <SecaoSegmento segmento={dados.anos_finais} titulo="Anos Finais" />
          )}
        </>
      )}

      {/* Análise de Questões */}
      <section className="secao-relatorio mb-8 print:break-before-page">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 print:text-black flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-600" />
          Análise de Questões
        </h2>

        {dados.analise_questoes.length > 0 ? (
          <>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-slate-700 mb-6">
              <GraficoQuestoes questoes={dados.analise_questoes} />
            </div>

            {dados.analise_questoes.filter(q => q.percentual_acerto < 40).length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Questões com Baixo Desempenho (&lt;40%)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {dados.analise_questoes
                    .filter(q => q.percentual_acerto < 40)
                    .slice(0, 8)
                    .map(q => (
                      <div key={q.questao_id} className="bg-white dark:bg-slate-800 rounded p-2 text-center">
                        <p className="font-medium text-gray-900 dark:text-white">Q{q.numero}</p>
                        <p className="text-sm text-red-600">{q.percentual_acerto.toFixed(1)}%</p>
                        <p className="text-xs text-gray-500">{q.disciplina}</p>
                      </div>
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
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 print:text-black flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Recomendações Pedagógicas
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dados.projecoes.pontos_fortes.length > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-3">
                Pontos Fortes
              </h3>
              <ul className="space-y-2">
                {dados.projecoes.pontos_fortes.map((ponto, index) => (
                  <li key={index} className="flex items-start gap-2 text-green-800 dark:text-green-200">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{ponto}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {dados.projecoes.areas_atencao.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-3">
                Áreas de Atenção
              </h3>
              <ul className="space-y-2">
                {dados.projecoes.areas_atencao.map((area, index) => (
                  <li key={index} className="flex items-start gap-2 text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{area}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {dados.projecoes.recomendacoes.length > 0 && (
          <div className="mt-6 bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-3">
              Recomendações
            </h3>
            <ul className="space-y-2">
              {dados.projecoes.recomendacoes.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-purple-800 dark:text-purple-200">
                  <span className="font-bold">{index + 1}.</span>
                  <span className="text-sm">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Rodapé */}
      <footer className="rodape-relatorio text-center text-sm text-gray-500 dark:text-gray-400 py-4 border-t border-gray-200 dark:border-slate-700 mt-8">
        <p>Relatório gerado pelo SISAM - Sistema de Avaliação Municipal</p>
        <p>Data de geração: {dados.data_geracao}</p>
      </footer>
    </div>
  );
}
