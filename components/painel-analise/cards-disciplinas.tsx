'use client'

import { EstatisticasAnalise, PaginacaoState, getSerieVisibility } from './types'

interface CardDisciplinaProps {
  sigla: string
  titulo: string
  media: number
  bgColor: string
  borderColor: string
  textColor: string
  barColor: string
}

function CardDisciplina({
  sigla,
  titulo,
  media,
  bgColor,
  borderColor,
  textColor,
  barColor
}: CardDisciplinaProps) {
  const porcentagem = Math.min(Math.max((media / 10) * 100, 0), 100)
  const temMedia = media > 0

  return (
    <div className={`${bgColor} rounded-xl p-3 sm:p-4 border-2 ${borderColor} hover:shadow-lg transition-all duration-300 hover:scale-[1.02]`}>
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
          {temMedia ? `${porcentagem.toFixed(0)}%` : '\u2014'}
        </p>
      </div>
    </div>
  )
}

interface CardsDisciplinasProps {
  estatisticas: EstatisticasAnalise
  paginacao: PaginacaoState
  carregando: boolean
  serieFiltro?: string
}

export default function CardsDisciplinas({
  estatisticas,
  paginacao,
  carregando,
  serieFiltro
}: CardsDisciplinasProps) {
  if (!(estatisticas.totalAlunos > 0 || paginacao.total > 0 || carregando)) {
    return null
  }

  const { mostrarProd, mostrarChCn } = getSerieVisibility(serieFiltro)

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6 ${carregando ? 'opacity-50' : ''}`}>
      {/* LP - sempre visível */}
      <CardDisciplina
        sigla="LP"
        titulo="Língua Portuguesa"
        media={estatisticas.mediaLP}
        bgColor="bg-blue-50 dark:bg-blue-900/30"
        borderColor="border-blue-200 dark:border-blue-700"
        textColor="text-blue-700 dark:text-blue-300"
        barColor="#3B82F6"
      />

      {/* MAT - sempre visível */}
      <CardDisciplina
        sigla="MAT"
        titulo="Matemática"
        media={estatisticas.mediaMAT}
        bgColor="bg-purple-50 dark:bg-purple-900/30"
        borderColor="border-purple-200 dark:border-purple-700"
        textColor="text-purple-700 dark:text-purple-300"
        barColor="#A855F7"
      />

      {/* PROD - mostrar para anos iniciais ou sem filtro */}
      {mostrarProd && (
        <CardDisciplina
          sigla="PROD"
          titulo="Produção Textual"
          media={estatisticas.mediaProd}
          bgColor="bg-rose-50 dark:bg-rose-900/30"
          borderColor="border-rose-200 dark:border-rose-700"
          textColor="text-rose-700 dark:text-rose-300"
          barColor="#F43F5E"
        />
      )}

      {/* CH/CN - mostrar para anos finais ou sem filtro */}
      {mostrarChCn && (
        <>
          <CardDisciplina
            sigla="CH"
            titulo="Ciências Humanas"
            media={estatisticas.mediaCH}
            bgColor="bg-amber-50 dark:bg-amber-900/30"
            borderColor="border-amber-200 dark:border-amber-700"
            textColor="text-amber-700 dark:text-amber-300"
            barColor="#F59E0B"
          />

          <CardDisciplina
            sigla="CN"
            titulo="Ciências da Natureza"
            media={estatisticas.mediaCN}
            bgColor="bg-emerald-50 dark:bg-emerald-900/30"
            borderColor="border-emerald-200 dark:border-emerald-700"
            textColor="text-emerald-700 dark:text-emerald-300"
            barColor="#10B981"
          />
        </>
      )}
    </div>
  )
}
