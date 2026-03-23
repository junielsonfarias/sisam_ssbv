import { DadosSegmento } from '@/lib/relatorios/tipos';
import {
  Users,
  BookOpen,
  TrendingUp,
  Target,
  GraduationCap,
  FileText,
  UserX,
  UserCheck
} from 'lucide-react';
import {
  GraficoDisciplinas,
  GraficoNiveis
} from '../graficos';
import { CardEstatistica } from './CardEstatistica';
import { TabelaDisciplinasDetalhada } from './TabelaDisciplinasDetalhada';
import { TabelaTurmas } from './TabelaTurmas';
import { SecaoAnaliseQuestoesSerie } from './SecaoAnaliseQuestoesSerie';

export function SecaoSegmentoCompleta({
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
