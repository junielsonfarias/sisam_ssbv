'use client';

import { DadosRelatorioEscola } from '@/lib/relatorios/tipos';
import {
  GraficoDisciplinas,
  GraficoDistribuicao,
  GraficoNiveis
} from '../graficos';
import {
  Building2,
  MapPin,
  Calendar,
  Users,
  BookOpen,
  TrendingUp,
  Award,
  BarChart3,
  GraduationCap,
  Target,
  Hash,
  UserX,
  UserCheck
} from 'lucide-react';
import { CardEstatistica } from './CardEstatistica';
import { TabelaDisciplinasDetalhada } from './TabelaDisciplinasDetalhada';
import { TabelaTurmas } from './TabelaTurmas';
import { TabelaFaltasSerie } from './TabelaFaltasSerie';
import { ComparativoPolo } from './ComparativoPolo';
import { SecaoAnaliseQuestoesSerie } from './SecaoAnaliseQuestoesSerie';
import { SecaoSegmentoCompleta } from './SecaoSegmentoCompleta';
import { SecaoAnaliseQuestoesDisciplina } from './SecaoAnaliseQuestoesDisciplina';
import { SecaoRecomendacoes } from './SecaoRecomendacoes';

interface Props {
  dados: DadosRelatorioEscola;
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
        {dados.faltas_por_serie && <TabelaFaltasSerie faltas={dados.faltas_por_serie} />}

        {/* Comparativo com Polo */}
        {dados.comparativo_polo && <ComparativoPolo comparativo={dados.comparativo_polo} />}
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
      <SecaoAnaliseQuestoesDisciplina analiseQuestoes={dados.analise_questoes} />

      {/* Recomendações Pedagógicas */}
      <SecaoRecomendacoes projecoes={dados.projecoes} />

      {/* Rodapé */}
      <footer className="rodape-relatorio text-center text-sm text-gray-500 dark:text-gray-400 py-6 border-t border-gray-200 dark:border-slate-700 mt-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Building2 className="w-4 h-4" />
          <p className="font-medium">Relatório gerado pelo SISAM - SEMED SSBV</p>
        </div>
        <p>Data de geração: {dados.data_geracao} | Escola: {dados.escola.nome} | Ano Letivo: {dados.ano_letivo}</p>
      </footer>
    </div>
  );
}
