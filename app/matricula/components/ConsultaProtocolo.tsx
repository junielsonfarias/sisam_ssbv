'use client'

import {
  Search, CheckCircle, Clock, AlertTriangle, User, MapPin, School, Loader2,
} from 'lucide-react'
import { SERIES_LABELS, statusConfig, type ConsultaResult } from '@/app/matricula/constants'

interface ConsultaProtocoloProps {
  protocolo: string
  consultaResult: ConsultaResult | null
  consultaErro: string
  carregando: boolean
  onProtocoloChange: (valor: string) => void
  onConsultar: () => void
  inputClass: string
  labelClass: string
}

export default function ConsultaProtocolo({
  protocolo,
  consultaResult,
  consultaErro,
  carregando,
  onProtocoloChange,
  onConsultar,
  inputClass,
  labelClass,
}: ConsultaProtocoloProps) {
  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-6 space-y-4">
        <div>
          <label className={labelClass}>Número do Protocolo</label>
          <input type="text" value={protocolo} onChange={e => onProtocoloChange(e.target.value.toUpperCase())}
            placeholder="MAT-XXXXXXXX-XXXX" className={inputClass}
            onKeyDown={e => e.key === 'Enter' && onConsultar()} />
        </div>
        {consultaErro && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {consultaErro}
          </div>
        )}
        <button onClick={onConsultar} disabled={carregando}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50 flex items-center justify-center gap-2">
          {carregando ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Search className="w-5 h-5" /> Consultar</>}
        </button>
      </div>

      {/* Resultado da consulta */}
      {consultaResult && (() => {
        const cfg = statusConfig[consultaResult.status] || statusConfig.pendente
        const StatusIcon = cfg.icon
        return (
          <div className="mt-6 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 dark:text-white">Protocolo: {consultaResult.protocolo}</h3>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${cfg.color}`}>
                <StatusIcon className="w-4 h-4" /> {cfg.label}
              </span>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <User className="w-4 h-4 text-slate-400" />
                <span className="font-medium">Aluno:</span> {consultaResult.aluno_nome}
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <School className="w-4 h-4 text-slate-400" />
                <span className="font-medium">Série:</span> {SERIES_LABELS[consultaResult.serie_pretendida] || consultaResult.serie_pretendida}
              </div>
              {consultaResult.escola_nome && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">Escola:</span> {consultaResult.escola_nome}
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="font-medium">Solicitado em:</span> {new Date(consultaResult.criado_em).toLocaleDateString('pt-BR')}
              </div>
              {consultaResult.analisado_em && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <CheckCircle className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">Analisado em:</span> {new Date(consultaResult.analisado_em).toLocaleDateString('pt-BR')}
                </div>
              )}
              {consultaResult.motivo_rejeicao && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                  <span className="font-medium">Motivo da rejeição:</span> {consultaResult.motivo_rejeicao}
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-700">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Histórico</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-600" />
                  <div><p className="text-sm font-medium text-slate-700 dark:text-slate-200">Solicitação recebida</p>
                    <p className="text-xs text-slate-400">{new Date(consultaResult.criado_em).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
                {(consultaResult.status === 'em_analise' || consultaResult.status === 'aprovada' || consultaResult.status === 'rejeitada') && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500" />
                    <div><p className="text-sm font-medium text-slate-700 dark:text-slate-200">Em análise</p></div>
                  </div>
                )}
                {(consultaResult.status === 'aprovada' || consultaResult.status === 'rejeitada') && consultaResult.analisado_em && (
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 mt-1.5 rounded-full ${consultaResult.status === 'aprovada' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{consultaResult.status === 'aprovada' ? 'Aprovada' : 'Rejeitada'}</p>
                      <p className="text-xs text-slate-400">{new Date(consultaResult.analisado_em).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
