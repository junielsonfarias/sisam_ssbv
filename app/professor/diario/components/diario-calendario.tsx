'use client'

import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { dataParaISO } from './types'
import type { RegistroDiario } from './types'

interface DiarioCalendarioProps {
  nomeMes: string
  mesAtual: string
  primeiroDia: number
  diasArray: number[]
  carregandoRegistros: boolean
  registros: RegistroDiario[]
  onMudarMes: (delta: number) => void
  onAbrirModal: (data?: string, registro?: RegistroDiario) => void
}

export function DiarioCalendario({
  nomeMes, mesAtual, primeiroDia, diasArray, carregandoRegistros, registros,
  onMudarMes, onAbrirModal,
}: DiarioCalendarioProps) {
  const getRegistrosDia = (dia: number) => {
    const dataStr = `${mesAtual}-${String(dia).padStart(2, '0')}`
    return registros.filter(r => dataParaISO(r.data_aula) === dataStr)
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
      {/* Navegação de mês */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => onMudarMes(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">{nomeMes}</h2>
        <button onClick={() => onMudarMes(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {carregandoRegistros ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : (
        <>
          {/* Cabeçalho dias da semana */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1">{d}</div>
            ))}
          </div>
          {/* Dias */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: primeiroDia }).map((_, i) => (
              <div key={`e-${i}`} className="h-20" />
            ))}
            {diasArray.map(dia => {
              const regs = getRegistrosDia(dia)
              const dataStr = `${mesAtual}-${String(dia).padStart(2, '0')}`
              const hoje = dataParaISO(new Date()) === dataStr
              // Multiplos registros (professor polivalente com varias
              // disciplinas no mesmo dia): clica abre o primeiro, mas
              // o card mostra contador + chips de disciplina para
              // sinalizar que ha mais (antes mostrava so regs[0] e
              // os outros ficavam invisiveis).
              return (
                <button
                  key={dia}
                  onClick={() => regs.length > 0 ? onAbrirModal(dataStr, regs[0]) : onAbrirModal(dataStr)}
                  className={`h-20 p-1 rounded-lg border text-left transition-colors hover:border-emerald-400 ${
                    hoje ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-slate-700'
                  } ${regs.length > 0 ? 'bg-emerald-50 dark:bg-emerald-900/30' : ''}`}
                  title={regs.length > 1 ? `${regs.length} registros — clique para abrir o primeiro` : undefined}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${hoje ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-300'}`}>
                      {dia}
                    </span>
                    {regs.length > 1 && (
                      <span className="text-[9px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded-full leading-none">
                        {regs.length}
                      </span>
                    )}
                  </div>
                  {regs.length > 0 && (
                    <>
                      <p className="text-[10px] text-gray-600 dark:text-gray-400 line-clamp-1 mt-0.5">
                        {regs[0].conteudo.substring(0, 50)}
                      </p>
                      {regs.length > 1 && (
                        <div className="flex flex-wrap gap-0.5 mt-0.5">
                          {regs.slice(0, 3).map(r => (
                            <span key={r.id} className="text-[8px] px-1 py-0.5 bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 rounded">
                              {r.disciplina_nome?.slice(0, 3) ?? '—'}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}

      <div className="mt-4 flex justify-end">
        <button
          onClick={() => onAbrirModal()}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" /> Novo Registro
        </button>
      </div>
    </div>
  )
}
