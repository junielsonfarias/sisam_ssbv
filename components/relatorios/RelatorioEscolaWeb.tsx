'use client';

import { DadosRelatorioEscola, DadosSegmento } from '@/lib/relatorios/tipos';
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
  Target
} from 'lucide-react';

interface Props {
  dados: DadosRelatorioEscola;
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

function TabelaTurmas({ turmas, mostrarCHCN = false }: { turmas: DadosRelatorioEscola['turmas']; mostrarCHCN?: boolean }) {
  if (turmas.length === 0) return null;

  return (
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
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              LP
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              MAT
            </th>
            {mostrarCHCN && (
              <>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  CH
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
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
          {turmas.map((turma) => (
            <tr key={turma.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white print:text-black">
                {turma.nome || turma.codigo}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-400">
                {turma.serie}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-400">
                {turma.total_alunos}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                <span className={`font-medium ${
                  turma.medias_disciplinas.LP >= 6 ? 'text-green-600' :
                  turma.medias_disciplinas.LP >= 4 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {turma.medias_disciplinas.LP?.toFixed(1) || '-'}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                <span className={`font-medium ${
                  turma.medias_disciplinas.MAT >= 6 ? 'text-green-600' :
                  turma.medias_disciplinas.MAT >= 4 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {turma.medias_disciplinas.MAT?.toFixed(1) || '-'}
                </span>
              </td>
              {mostrarCHCN && (
                <>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <span className={`font-medium ${
                      turma.medias_disciplinas.CH >= 6 ? 'text-green-600' :
                      turma.medias_disciplinas.CH >= 4 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {turma.medias_disciplinas.CH?.toFixed(1) || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <span className={`font-medium ${
                      turma.medias_disciplinas.CN >= 6 ? 'text-green-600' :
                      turma.medias_disciplinas.CN >= 4 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {turma.medias_disciplinas.CN?.toFixed(1) || '-'}
                    </span>
                  </td>
                </>
              )}
              <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                <span className={`font-bold ${
                  turma.media_geral >= 6 ? 'text-green-600' :
                  turma.media_geral >= 4 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {turma.media_geral.toFixed(1)}
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
  const temCHCN = segmento.desempenho_disciplinas.some(d => d.disciplina === 'CH' || d.disciplina === 'CN');

  return (
    <div className="secao-relatorio print:break-before-page">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 print:text-black flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-blue-600" />
        {titulo}
      </h2>

      {/* Cards de estatísticas do segmento */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <CardEstatistica
          icone={Users}
          titulo="Alunos"
          valor={segmento.estatisticas.total_alunos}
          corIcone="bg-blue-100 dark:bg-blue-900/50 text-blue-600"
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
          corIcone="bg-purple-100 dark:bg-purple-900/50 text-purple-600"
        />
        <CardEstatistica
          icone={Target}
          titulo="Participação"
          valor={`${segmento.estatisticas.taxa_participacao.toFixed(1)}%`}
          corIcone="bg-amber-100 dark:bg-amber-900/50 text-amber-600"
        />
      </div>

      {/* Gráficos do segmento */}
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

      {/* Produção Textual (apenas Anos Iniciais) */}
      {segmento.producao_textual && segmento.producao_textual.media_geral > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Produção Textual
          </h3>
          <p className="text-3xl font-bold text-blue-600">
            {segmento.producao_textual.media_geral.toFixed(2)}
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300">Média geral da produção textual</p>
        </div>
      )}

      {/* Tabela de turmas do segmento */}
      {segmento.turmas.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white print:text-black">
              Turmas - {titulo}
            </h3>
          </div>
          <TabelaTurmas turmas={segmento.turmas} mostrarCHCN={temCHCN} />
        </div>
      )}
    </div>
  );
}

export function RelatorioEscolaWeb({ dados }: Props) {
  const temCHCN = dados.desempenho_disciplinas.some(d => d.disciplina === 'CH' || d.disciplina === 'CN');

  return (
    <div className="relatorio-container max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <header className="cabecalho-relatorio bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg p-6 mb-6 print:bg-blue-700 print:rounded-none">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">{dados.escola.nome}</h1>
            <div className="flex flex-wrap items-center gap-4 text-blue-100">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {dados.escola.polo_nome}
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
            <p className="text-sm text-blue-200">Gerado em</p>
            <p className="font-medium">{dados.data_geracao}</p>
          </div>
        </div>
      </header>

      {/* Visão Geral - Estatísticas */}
      <section className="secao-relatorio mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 print:text-black flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          Visão Geral
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
          />
          <CardEstatistica
            icone={Target}
            titulo="Participação"
            valor={`${dados.estatisticas.taxa_participacao.toFixed(1)}%`}
            corIcone="bg-amber-100 dark:bg-amber-900/50 text-amber-600"
          />
        </div>

        {/* Comparativo com Polo */}
        {dados.comparativo_polo && (
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 print:text-black">
              Comparativo com o Polo
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">Média da Escola</p>
                <p className="text-2xl font-bold text-blue-600">
                  {dados.comparativo_polo.media_escola.toFixed(2)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">Média do Polo</p>
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-300">
                  {dados.comparativo_polo.media_polo.toFixed(2)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">Diferença</p>
                <p className={`text-2xl font-bold ${
                  dados.comparativo_polo.diferenca >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {dados.comparativo_polo.diferenca >= 0 ? '+' : ''}{dados.comparativo_polo.diferenca.toFixed(2)}
                </p>
              </div>
              {dados.comparativo_polo.posicao_ranking && dados.comparativo_polo.total_escolas_polo && (
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Ranking no Polo</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {dados.comparativo_polo.posicao_ranking}º/{dados.comparativo_polo.total_escolas_polo}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Gráficos - Visão Geral */}
      <section className="secao-relatorio mb-8 print:break-before-page">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 print:text-black flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Desempenho
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

      {/* Produção Textual (se houver, visão geral) */}
      {dados.producao_textual && dados.producao_textual.media_geral > 0 && !dados.serie_filtro && (
        <section className="secao-relatorio mb-8">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
            <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
              <Award className="w-5 h-5" />
              Produção Textual (Anos Iniciais)
            </h2>
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
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white print:text-black flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Detalhamento por Turmas
              </h2>
            </div>
            <TabelaTurmas turmas={dados.turmas} mostrarCHCN={temCHCN} />
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
          <Target className="w-5 h-5 text-blue-600" />
          Análise de Questões
        </h2>

        {dados.analise_questoes.length > 0 ? (
          <>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-slate-700 mb-6">
              <GraficoQuestoes questoes={dados.analise_questoes} />
            </div>

            {/* Questões com menor desempenho */}
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
          {/* Pontos Fortes */}
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

          {/* Áreas de Atenção */}
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

        {/* Recomendações */}
        {dados.projecoes.recomendacoes.length > 0 && (
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
              Recomendações
            </h3>
            <ul className="space-y-2">
              {dados.projecoes.recomendacoes.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-blue-800 dark:text-blue-200">
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
