'use client'

import {
  School, Users, GraduationCap, BookOpen, TrendingUp,
  CheckCircle, XCircle
} from 'lucide-react'
import { EstatisticasPainel } from '@/lib/dados/types'
import { isAnosIniciais } from '@/lib/dados/utils'

// Aliases para compatibilidade
type Estatisticas = EstatisticasPainel

export interface AbaGeralProps {
  estatisticas: Estatisticas
  tipoUsuario: string
  carregando: boolean
  serieSelecionada?: string
  mediaGeralCalculada: number
}

// Componente para cards de disciplinas do Dashboard
function CardsDisciplinasDashboard({ estatisticas, serieSelecionada }: {
  estatisticas: Estatisticas;
  serieSelecionada?: string;
}) {
  // Determinar quais disciplinas mostrar baseado na série selecionada
  const numSerie = serieSelecionada?.replace(/[^0-9]/g, '') || ''
  const serieIsAnosIniciais = ['2', '3', '5'].includes(numSerie)
  const serieIsAnosFinais = ['6', '7', '8', '9'].includes(numSerie)
  const temFiltroSerie = !!serieSelecionada && serieSelecionada.trim() !== ''

  // Lógica de exibição:
  // - Sem filtro de série: mostrar TODAS as 5 disciplinas (LP, MAT, PROD.T, CH, CN)
  // - Anos iniciais (2, 3, 5): mostrar apenas 3 disciplinas (LP, MAT, PROD.T)
  // - Anos finais (6, 7, 8, 9): mostrar apenas 4 disciplinas (LP, MAT, CH, CN)
  const mostrarProd = !temFiltroSerie || serieIsAnosIniciais
  const mostrarChCn = !temFiltroSerie || serieIsAnosFinais

  // Helper para renderizar card de disciplina com visual moderno
  const DisciplinaCardDash = ({ sigla, titulo, media, bgColor, textColor, barColor }: {
    sigla: string;
    titulo: string;
    media: number;
    bgColor: string;
    textColor: string;
    barColor: string;
  }) => {
    const porcentagem = Math.min(Math.max((media / 10) * 100, 0), 100)
    const temMedia = media > 0

    return (
      <div className={`${bgColor} rounded-xl p-3 sm:p-4 border-2 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs sm:text-sm font-bold ${textColor} uppercase tracking-wide bg-white/50 dark:bg-slate-900/50 px-2 py-0.5 rounded-md`}>
            {sigla}
          </span>
          <span className={`text-xl sm:text-2xl font-bold ${textColor}`}>
            {temMedia ? media.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
          </span>
        </div>
        <div className="w-full bg-white/60 dark:bg-slate-800/60 rounded-full h-2 mb-2 shadow-inner overflow-hidden">
          <div
            className="h-2 rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${porcentagem}%`,
              backgroundColor: barColor
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 truncate flex-1">{titulo}</p>
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 ml-2">
            {temMedia ? `${porcentagem.toFixed(0)}%` : '—'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        Médias por Disciplina {serieSelecionada ? `- ${serieSelecionada}` : ''}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {/* LP - sempre visível */}
        <DisciplinaCardDash
          sigla="LP"
          titulo="Língua Portuguesa"
          media={estatisticas.mediaLp || 0}
          bgColor="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800"
          textColor="text-blue-700 dark:text-blue-300"
          barColor="#3B82F6"
        />
        {/* MAT - sempre visível */}
        <DisciplinaCardDash
          sigla="MAT"
          titulo="Matemática"
          media={estatisticas.mediaMat || 0}
          bgColor="bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800"
          textColor="text-purple-700 dark:text-purple-300"
          barColor="#A855F7"
        />
        {/* PROD.T - apenas anos iniciais ou sem filtro */}
        {mostrarProd && (
          <DisciplinaCardDash
            sigla="PROD.T"
            titulo="Produção Textual"
            media={estatisticas.mediaProd || 0}
            bgColor="bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800"
            textColor="text-rose-700 dark:text-rose-300"
            barColor="#F43F5E"
          />
        )}
        {/* CH - apenas anos finais ou sem filtro */}
        {mostrarChCn && (
          <DisciplinaCardDash
            sigla="CH"
            titulo="Ciências Humanas"
            media={estatisticas.mediaCh || 0}
            bgColor="bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800"
            textColor="text-amber-700 dark:text-amber-300"
            barColor="#F59E0B"
          />
        )}
        {/* CN - apenas anos finais ou sem filtro */}
        {mostrarChCn && (
          <DisciplinaCardDash
            sigla="CN"
            titulo="Ciências da Natureza"
            media={estatisticas.mediaCn || 0}
            bgColor="bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700"
            textColor="text-emerald-700 dark:text-emerald-300"
            barColor="#10B981"
          />
        )}
      </div>
    </div>
  )
}

export default function AbaGeral({ estatisticas, tipoUsuario, carregando, serieSelecionada, mediaGeralCalculada }: AbaGeralProps) {
  // Base para calculo de percentuais: alunos avaliados (com P ou F), nao total cadastrado
  const basePercentual = estatisticas.totalAlunosAvaliados > 0 ? estatisticas.totalAlunosAvaliados : estatisticas.totalAlunos

  return (
    <div className={`space-y-6 ${carregando ? 'opacity-50' : ''}`}>
      {/* Aviso quando série selecionada - dados estão filtrados */}
      {serieSelecionada && (
        <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg p-3">
          <p className="text-sm text-indigo-800 dark:text-indigo-200">
            <strong>Filtro ativo:</strong> Exibindo estatísticas do <strong>{serieSelecionada}</strong>.
            Clique em "Todas" para ver dados de todas as séries.
          </p>
        </div>
      )}
      {/* Cards principais */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
        {tipoUsuario !== 'escola' && (
          <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 md:p-5 rounded-lg shadow-md border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-[10px] sm:text-xs md:text-sm">Total de Escolas</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mt-1">{estatisticas.totalEscolas}</p>
              </div>
              <School className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-green-600 dark:text-green-400" />
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 md:p-5 rounded-lg shadow-md border-l-4 border-cyan-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-[10px] sm:text-xs md:text-sm">
                {serieSelecionada ? `Alunos do ${serieSelecionada}` : 'Total de Alunos'}
              </p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mt-1">
                {estatisticas.totalAlunos.toLocaleString('pt-BR')}
              </p>
              {estatisticas.totalAlunosAvaliados > 0 && estatisticas.totalAlunosAvaliados !== estatisticas.totalAlunos && (
                <p className="text-[10px] sm:text-xs text-cyan-600 dark:text-cyan-400 mt-1">
                  {estatisticas.totalAlunosAvaliados.toLocaleString('pt-BR')} avaliados
                </p>
              )}
            </div>
            <GraduationCap className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-cyan-600 dark:text-cyan-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 md:p-5 rounded-lg shadow-md border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-[10px] sm:text-xs md:text-sm">
                {serieSelecionada ? `Turmas do ${serieSelecionada}` : 'Total de Turmas'}
              </p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mt-1">{estatisticas.totalTurmas}</p>
              {serieSelecionada && (
                <p className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400 mt-1">
                  {estatisticas.totalTurmas === 1 ? '1 turma' : `${estatisticas.totalTurmas} turmas`} desta série
                </p>
              )}
            </div>
            <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-orange-600 dark:text-orange-400" />
          </div>
        </div>
      </div>

      {/* Cards de Presenca e Media */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-900/40 p-3 sm:p-4 md:p-5 rounded-lg shadow-md border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <p className="text-gray-700 dark:text-gray-300 text-[10px] sm:text-xs md:text-sm font-medium">Presentes</p>
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-700 dark:text-green-400">{estatisticas.totalAlunosPresentes.toLocaleString('pt-BR')}</p>
          {basePercentual > 0 && (
            <p className="text-[10px] sm:text-xs text-green-600 dark:text-green-400 mt-1">
              {((estatisticas.totalAlunosPresentes / basePercentual) * 100).toFixed(1)}%
            </p>
          )}
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-900/40 p-3 sm:p-4 md:p-5 rounded-lg shadow-md border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <p className="text-gray-700 dark:text-gray-300 text-[10px] sm:text-xs md:text-sm font-medium">Faltantes</p>
            <XCircle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-700 dark:text-red-400">{estatisticas.totalAlunosFaltantes.toLocaleString('pt-BR')}</p>
          {basePercentual > 0 && (
            <p className="text-[10px] sm:text-xs text-red-600 dark:text-red-400 mt-1">
              {((estatisticas.totalAlunosFaltantes / basePercentual) * 100).toFixed(1)}%
            </p>
          )}
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-900/40 p-3 sm:p-4 md:p-5 rounded-lg shadow-md border border-blue-200 dark:border-blue-800 col-span-2 md:col-span-2">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <p className="text-gray-700 dark:text-gray-300 text-[10px] sm:text-xs md:text-sm font-medium">Media Geral</p>
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-700 dark:text-blue-400">
            {mediaGeralCalculada > 0 ? mediaGeralCalculada.toFixed(2) : '-'}
          </p>
          {mediaGeralCalculada > 0 && (
            <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 mt-1">
              {mediaGeralCalculada >= 7 ? 'Excelente' : mediaGeralCalculada >= 5 ? 'Bom' : 'Abaixo da media'}
            </p>
          )}
        </div>
      </div>

      {/* Cards Anos Iniciais e Finais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-900/40 p-3 sm:p-4 md:p-5 rounded-lg shadow-md border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <div className="p-1.5 sm:p-2 bg-emerald-500 rounded-lg">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <p className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-semibold">Anos Iniciais</p>
              <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400">1º ao 5º Ano</p>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-emerald-700 dark:text-emerald-400">
                {estatisticas.mediaAnosIniciais > 0 ? estatisticas.mediaAnosIniciais.toFixed(2) : '-'}
              </p>
              <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 mt-1">Média</p>
            </div>
            <div className="text-right">
              <p className="text-base sm:text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                {estatisticas.totalAnosIniciais.toLocaleString('pt-BR')}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">alunos</p>
            </div>
          </div>
          {estatisticas.mediaAnosIniciais > 0 && (
            <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-700">
              <div className="w-full bg-emerald-200 dark:bg-emerald-800 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(estatisticas.mediaAnosIniciais * 10, 100)}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/30 dark:to-violet-900/40 p-3 sm:p-4 md:p-5 rounded-lg shadow-md border border-violet-200 dark:border-violet-800">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <div className="p-1.5 sm:p-2 bg-violet-500 rounded-lg">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <p className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-semibold">Anos Finais</p>
              <p className="text-[10px] sm:text-xs text-violet-600 dark:text-violet-400">6º ao 9º Ano</p>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-violet-700 dark:text-violet-400">
                {estatisticas.mediaAnosFinais > 0 ? estatisticas.mediaAnosFinais.toFixed(2) : '-'}
              </p>
              <p className="text-[10px] sm:text-xs text-violet-600 dark:text-violet-400 mt-1">Média</p>
            </div>
            <div className="text-right">
              <p className="text-base sm:text-lg font-semibold text-violet-600 dark:text-violet-400">
                {estatisticas.totalAnosFinais.toLocaleString('pt-BR')}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">alunos</p>
            </div>
          </div>
          {estatisticas.mediaAnosFinais > 0 && (
            <div className="mt-3 pt-3 border-t border-violet-200 dark:border-violet-700">
              <div className="w-full bg-violet-200 dark:bg-violet-800 rounded-full h-2">
                <div
                  className="bg-violet-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(estatisticas.mediaAnosFinais * 10, 100)}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cards de Médias por Disciplina */}
      <CardsDisciplinasDashboard
        estatisticas={estatisticas}
        serieSelecionada={serieSelecionada}
      />
    </div>
  )
}
