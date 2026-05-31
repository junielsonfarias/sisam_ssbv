'use client'

import { Route, UserPlus, Users } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Escola, INPUT_CLS, RotaResumo } from './types'

interface Props {
  rotas: RotaResumo[]
  escolas: Escola[]
  filtroEscola: string
  carregando: boolean
  onChangeFiltroEscola: (id: string) => void
  onVincularAluno: (r: RotaResumo) => void
}

export function AbaRotas({ rotas, escolas, filtroEscola, carregando, onChangeFiltroEscola, onVincularAluno }: Props) {
  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
        <select value={filtroEscola} onChange={(e) => onChangeFiltroEscola(e.target.value)} className={INPUT_CLS}>
          <option value="">Todas as escolas</option>
          {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
      </div>

      {carregando ? (
        <LoadingSpinner centered />
      ) : rotas.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <Route className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhuma rota cadastrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rotas.map((r) => (
            <div key={r.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs text-cyan-600 font-mono font-bold">{r.codigo}</p>
                  <p className="font-bold text-gray-800 dark:text-gray-200">{r.descricao}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs bg-cyan-100 text-cyan-700">
                  <Users className="w-3 h-3 inline mr-1" />{r.qtd_alunos}
                </span>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                {r.veiculo_placa && <p>🚐 Veículo: <strong>{r.veiculo_placa}</strong></p>}
                {r.motorista_nome && <p>👤 Motorista: <strong>{r.motorista_nome}</strong></p>}
                {r.turno && <p>🕐 Turno: <strong className="capitalize">{r.turno}</strong></p>}
                {r.distancia_km && <p>📏 {r.distancia_km} km</p>}
                {(r.hora_inicio || r.hora_fim) && <p>⏰ {r.hora_inicio || '?'} → {r.hora_fim || '?'}</p>}
                <p>🏫 Atende {r.escolas_ids?.length || 0} escola(s)</p>
              </div>
              <button
                onClick={() => onVincularAluno(r)}
                className="mt-3 flex items-center justify-center gap-1 w-full px-3 py-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 text-xs font-bold hover:bg-cyan-200"
                aria-label={`Vincular aluno à rota ${r.codigo}`}
              >
                <UserPlus className="w-3 h-3" /> Vincular aluno
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
